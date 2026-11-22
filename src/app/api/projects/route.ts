import { NextRequest, NextResponse } from 'next/server';
import { prisma, isDatabaseConfigured } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { sanitizeProjectName } from '@/utils/sanitize';
import { validateGatcFile } from '@/lib/validators';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  try {
    // Rate limit: 60 requests per minute (F11-03)
    const rateLimitResponse = await enforceRateLimit(req, { limit: 60, windowSec: 60, prefix: 'projects_get' });
    if (rateLimitResponse) return rateLimitResponse;

    const userId = await getCurrentUserId();

    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        success: true,
        source: 'local_fallback',
        projects: []
      });
    }

    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        updatedAt: true,
        createdAt: true,
        state: true
      }
    });

    const summaryList = projects.map((p) => {
      const stateObj = (p.state as any) || {};
      return {
        id: p.id,
        name: sanitizeProjectName(p.name),
        updated: new Date(p.updatedAt).getTime(),
        createdAt: new Date(p.createdAt).getTime(),
        wallsCount: Array.isArray(stateObj.walls) ? stateObj.walls.length : 0,
        boxesCount: Array.isArray(stateObj.boxes) ? stateObj.boxes.length : 0,
        circuitsCount: Array.isArray(stateObj.routes) ? stateObj.routes.length : 0
      };
    });

    return NextResponse.json({
      success: true,
      projects: summaryList
    });
  } catch (error) {
    console.error('[API /api/projects GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener proyectos' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = await enforceRateLimit(req, { limit: 60, windowSec: 60, prefix: 'projects_post' });
    if (rateLimitResponse) return rateLimitResponse;

    const userId = await getCurrentUserId();
    const body = await req.json();

    const { id, name, state } = body;
    const sanitizedName = sanitizeProjectName(name || 'Nuevo Proyecto');

    // Validation
    if (state) {
      const validation = validateGatcFile(state);
      if (!validation.isValid && validation.errors.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Estado de proyecto inválido', details: validation.errors },
          { status: 400 }
        );
      }
    }

    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        success: true,
        source: 'local_fallback',
        project: {
          id: id || `proj-${Date.now()}`,
          name: sanitizedName,
          state: state || {},
          updatedAt: new Date().toISOString()
        }
      });
    }

    // Ensure User exists in DB before creating project
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${userId}@gatc.local`,
        name: 'Usuario GATC'
      }
    });

    const project = await prisma.project.create({
      data: {
        ...(id ? { id } : {}),
        userId,
        name: sanitizedName,
        state: state || {}
      }
    });

    return NextResponse.json(
      {
        success: true,
        project: {
          id: project.id,
          name: project.name,
          state: project.state,
          updatedAt: project.updatedAt
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API /api/projects POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear proyecto' },
      { status: 500 }
    );
  }
}
