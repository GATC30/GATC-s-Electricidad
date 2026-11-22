/**
 * GATC Dual Storage Adapter (Offline-First) - F6-05
 * 
 * Primary Local: IndexedDB (with localStorage fallback)
 * Remote: REST API (/api/projects, /api/prices)
 * Offline Sync Queue: Automatic background sync on network reconnection
 */

import { sanitizeProjectName } from '@/utils/sanitize';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/utils/storage';

const DB_NAME = 'gatc_storage_v2';
const DB_VERSION = 1;

export interface StoredProject {
  id: string;
  name: string;
  state: any;
  updated: number;
  synced: boolean;
}

export interface SyncTask {
  id: string;
  projectId: string;
  action: 'create' | 'update' | 'delete';
  payload?: any;
  timestamp: number;
  retries: number;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

class StorageAdapter {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private isBrowser = typeof window !== 'undefined';
  private syncListeners = new Set<(status: SyncStatus, pendingCount: number) => void>();
  private currentStatus: SyncStatus = 'idle';

  constructor() {
    if (this.isBrowser) {
      window.addEventListener('online', () => {
        this.notifyStatus('syncing');
        this.syncPendingQueue();
      });
      window.addEventListener('offline', () => {
        this.notifyStatus('offline');
      });
    }
  }

  public isOnline(): boolean {
    if (!this.isBrowser) return true;
    return navigator.onLine;
  }

  public subscribeSync(listener: (status: SyncStatus, pendingCount: number) => void): () => void {
    this.syncListeners.add(listener);
    this.getPendingQueueCount().then((count) => listener(this.currentStatus, count));
    return () => this.syncListeners.delete(listener);
  }

  private notifyStatus(status: SyncStatus, pendingCount?: number) {
    this.currentStatus = status;
    if (pendingCount !== undefined) {
      this.syncListeners.forEach((l) => l(status, pendingCount));
    } else {
      this.getPendingQueueCount().then((count) => {
        this.syncListeners.forEach((l) => l(status, count));
      });
    }
  }

  private getDB(): Promise<IDBDatabase | null> {
    if (!this.isBrowser || !window.indexedDB) {
      return Promise.resolve(null);
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve) => {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('projects')) {
            const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
            projectStore.createIndex('updated', 'updated', { unique: false });
          }
          if (!db.objectStoreNames.contains('sync_queue')) {
            const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
            queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = (err) => {
          console.warn('[StorageAdapter] IndexedDB open error, falling back to localStorage:', err);
          resolve(null);
        };
      });
    }

    return this.dbPromise;
  }

  /**
   * Save a project locally and queue for cloud sync
   */
  async saveProject(id: string, name: string, state: any): Promise<boolean> {
    const cleanName = sanitizeProjectName(name);
    const updated = Date.now();
    const projectRecord: StoredProject = {
      id,
      name: cleanName,
      state,
      updated,
      synced: false
    };

    // 1. Save in IndexedDB
    const db = await this.getDB();
    if (db) {
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction('projects', 'readwrite');
          const store = tx.objectStore('projects');
          const req = store.put(projectRecord);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } catch (err) {
        console.warn('[StorageAdapter] Error writing to IndexedDB:', err);
      }
    }

    // 2. Also keep localStorage updated for backward compatibility
    safeSetItem(`ecad_data_${id}`, state);
    const indexList = safeGetItem<any[]>('ecad_projects_index', []) || [];
    const existingIdx = indexList.findIndex((p: any) => p.id === id);
    const summary = {
      id,
      name: cleanName,
      updated,
      wallsCount: Array.isArray(state?.walls) ? state.walls.length : 0,
      boxesCount: Array.isArray(state?.boxes) ? state.boxes.length : 0,
      circuitsCount: Array.isArray(state?.routes) ? state.routes.length : 0
    };

    if (existingIdx >= 0) {
      indexList[existingIdx] = summary;
    } else {
      indexList.unshift(summary);
    }
    safeSetItem('ecad_projects_index', indexList);

    // 3. Queue sync task
    await this.enqueueSync({
      id: `sync-${id}-${Date.now()}`,
      projectId: id,
      action: 'update',
      payload: { name: cleanName, state },
      timestamp: updated,
      retries: 0
    });

    // 4. Trigger sync attempt if online
    if (this.isOnline()) {
      this.syncPendingQueue();
    } else {
      this.notifyStatus('offline');
    }

    return true;
  }

  /**
   * Load project from local storage (IndexedDB with localStorage fallback)
   */
  async loadProject(id: string): Promise<StoredProject | null> {
    const db = await this.getDB();
    if (db) {
      try {
        const record = await new Promise<StoredProject | null>((resolve) => {
          const tx = db.transaction('projects', 'readonly');
          const store = tx.objectStore('projects');
          const req = store.get(id);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });

        if (record) return record;
      } catch (err) {
        console.warn('[StorageAdapter] Error loading from IndexedDB:', err);
      }
    }

    // Fallback to localStorage
    const localData = safeGetItem<any>(`ecad_data_${id}`);
    if (localData) {
      const indexList = safeGetItem<any[]>('ecad_projects_index', []) || [];
      const meta = indexList.find((p: any) => p.id === id);
      return {
        id,
        name: sanitizeProjectName(meta?.name || 'Proyecto CAD'),
        state: localData,
        updated: meta?.updated || Date.now(),
        synced: false
      };
    }

    return null;
  }

  /**
   * List all projects stored locally
   */
  async listProjects(): Promise<Array<{ id: string; name: string; updated: number; wallsCount: number; boxesCount: number; circuitsCount: number }>> {
    const db = await this.getDB();
    if (db) {
      try {
        const records = await new Promise<StoredProject[]>((resolve) => {
          const tx = db.transaction('projects', 'readonly');
          const store = tx.objectStore('projects');
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });

        if (records && records.length > 0) {
          return records
            .sort((a, b) => b.updated - a.updated)
            .map((r) => ({
              id: r.id,
              name: sanitizeProjectName(r.name),
              updated: r.updated,
              wallsCount: Array.isArray(r.state?.walls) ? r.state.walls.length : 0,
              boxesCount: Array.isArray(r.state?.boxes) ? r.state.boxes.length : 0,
              circuitsCount: Array.isArray(r.state?.routes) ? r.state.routes.length : 0
            }));
        }
      } catch (err) {
        console.warn('[StorageAdapter] Error listing from IndexedDB:', err);
      }
    }

    // Fallback to localStorage index
    const indexList = safeGetItem<any[]>('ecad_projects_index', []) || [];
    return indexList.map((item: any) => ({
      id: item.id,
      name: sanitizeProjectName(item.name || 'Proyecto Sin Nombre'),
      updated: item.updated || Date.now(),
      wallsCount: item.wallsCount || 0,
      boxesCount: item.boxesCount || 0,
      circuitsCount: item.circuitsCount || 0
    }));
  }

  /**
   * Delete project locally and enqueue remote deletion
   */
  async deleteProject(id: string): Promise<boolean> {
    const db = await this.getDB();
    if (db) {
      try {
        await new Promise<void>((resolve) => {
          const tx = db.transaction('projects', 'readwrite');
          const store = tx.objectStore('projects');
          const req = store.delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        });
      } catch (err) {
        console.warn('[StorageAdapter] Error deleting from IndexedDB:', err);
      }
    }

    // LocalStorage cleanup
    safeRemoveItem(`ecad_data_${id}`);
    const indexList = safeGetItem<any[]>('ecad_projects_index', []) || [];
    safeSetItem(
      'ecad_projects_index',
      indexList.filter((p: any) => p.id !== id)
    );

    // Queue sync task
    await this.enqueueSync({
      id: `delete-${id}-${Date.now()}`,
      projectId: id,
      action: 'delete',
      timestamp: Date.now(),
      retries: 0
    });

    if (this.isOnline()) {
      this.syncPendingQueue();
    }

    return true;
  }

  /**
   * Enqueue sync task
   */
  async enqueueSync(task: SyncTask): Promise<void> {
    const db = await this.getDB();
    if (db) {
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction('sync_queue', 'readwrite');
          const store = tx.objectStore('sync_queue');
          const req = store.put(task);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
        return;
      } catch (err) {
        console.warn('[StorageAdapter] IndexedDB queue failed, using localStorage fallback');
      }
    }

    const queue = safeGetItem<SyncTask[]>('ecad_sync_queue', []) || [];
    // Remove older tasks for the same project with same action to deduplicate
    const filtered = queue.filter(
      (t) => !(t.projectId === task.projectId && t.action === task.action)
    );
    filtered.push(task);
    safeSetItem('ecad_sync_queue', filtered);
  }

  /**
   * Get pending queue count
   */
  async getPendingQueueCount(): Promise<number> {
    const db = await this.getDB();
    if (db) {
      try {
        return await new Promise<number>((resolve) => {
          const tx = db.transaction('sync_queue', 'readonly');
          const store = tx.objectStore('sync_queue');
          const req = store.count();
          req.onsuccess = () => resolve(req.result || 0);
          req.onerror = () => resolve(0);
        });
      } catch (err) {
        console.warn('[StorageAdapter] Error getting count from IndexedDB:', err);
      }
    }

    const queue = safeGetItem<SyncTask[]>('ecad_sync_queue', []) || [];
    return queue.length;
  }

  /**
   * Process all pending sync tasks against the backend API
   */
  async syncPendingQueue(): Promise<{ syncedCount: number; failedCount: number }> {
    if (!this.isOnline()) {
      this.notifyStatus('offline');
      return { syncedCount: 0, failedCount: 0 };
    }

    let tasks: SyncTask[] = [];
    const db = await this.getDB();

    if (db) {
      try {
        tasks = await new Promise<SyncTask[]>((resolve) => {
          const tx = db.transaction('sync_queue', 'readonly');
          const store = tx.objectStore('sync_queue');
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });
      } catch (err) {
        console.warn('[StorageAdapter] Error reading sync queue from IndexedDB:', err);
      }
    }

    if (tasks.length === 0) {
      tasks = safeGetItem<SyncTask[]>('ecad_sync_queue', []) || [];
    }

    if (tasks.length === 0) {
      this.notifyStatus('synced', 0);
      return { syncedCount: 0, failedCount: 0 };
    }

    this.notifyStatus('syncing', tasks.length);

    let syncedCount = 0;
    let failedCount = 0;

    for (const task of tasks) {
      try {
        let res: Response;
        if (task.action === 'delete') {
          res = await fetch(`/api/projects/${task.projectId}`, {
            method: 'DELETE'
          });
        } else {
          // update / create via PUT upsert
          res = await fetch(`/api/projects/${task.projectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task.payload)
          });
        }

        if (res.ok) {
          syncedCount++;
          await this.removeSyncTask(task.id);
        } else {
          failedCount++;
          await this.incrementTaskRetry(task);
        }
      } catch (err) {
        failedCount++;
        await this.incrementTaskRetry(task);
      }
    }

    const remaining = await this.getPendingQueueCount();
    if (remaining === 0) {
      this.notifyStatus('synced', 0);
    } else {
      this.notifyStatus('error', remaining);
    }

    return { syncedCount, failedCount };
  }

  private async removeSyncTask(taskId: string): Promise<void> {
    const db = await this.getDB();
    if (db) {
      try {
        await new Promise<void>((resolve) => {
          const tx = db.transaction('sync_queue', 'readwrite');
          const store = tx.objectStore('sync_queue');
          const req = store.delete(taskId);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        });
        return;
      } catch (err) {
        console.warn('[StorageAdapter] Error removing task from IndexedDB:', err);
      }
    }

    const queue = safeGetItem<SyncTask[]>('ecad_sync_queue', []) || [];
    safeSetItem(
      'ecad_sync_queue',
      queue.filter((t) => t.id !== taskId)
    );
  }

  private async incrementTaskRetry(task: SyncTask): Promise<void> {
    task.retries += 1;
    await this.enqueueSync(task);
  }
}

export const storageAdapter = new StorageAdapter();
export default storageAdapter;
