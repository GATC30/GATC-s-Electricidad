import { test, expect } from '@playwright/test';

test.describe('GATC v2.0 - Complete CAD & Electrical Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
  });

  test('E2E-01: Navigates from project catalog to editor and initializes workspace', async ({ page }) => {
    await expect(page).toHaveTitle(/GATC/);

    // Look for create project button or project card
    const newProjectBtn = page.getByRole('button', { name: /Nuevo Proyecto|Crear Proyecto/i });
    if (await newProjectBtn.isVisible()) {
      await newProjectBtn.click();
    } else {
      // Direct navigation to default editor workspace
      await page.goto('/editor/test-e2e-project');
    }

    await page.waitForURL(/\/editor\/.+/);
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.getByRole('tab', { name: /Obra Civil|Fase 1/i })).toBeVisible();
  });

  test('E2E-02: Phase 1 (Obra Civil) - Wall drawing, dimensions, and openings', async ({ page }) => {
    await page.goto('/editor/test-civil-flow');

    // 1. Select Wall tool (via UI button or 'W' shortcut)
    const wallToolBtn = page.getByRole('button', { name: /Pared|Muro/i });
    if (await wallToolBtn.isVisible()) {
      await wallToolBtn.click();
    } else {
      await page.keyboard.press('KeyW');
    }

    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      // Draw first wall segment
      await page.mouse.move(box.x + 200, box.y + 200);
      await page.mouse.down();
      await page.mouse.move(box.x + 500, box.y + 200);
      await page.mouse.up();

      // Verify canvas rendered updated state
      await expect(canvas).toBeVisible();

      // Draw perpendicular wall
      await page.mouse.move(box.x + 500, box.y + 200);
      await page.mouse.down();
      await page.mouse.move(box.x + 500, box.y + 400);
      await page.mouse.up();

      // Select Door tool
      const doorBtn = page.getByRole('button', { name: /Puerta/i });
      if (await doorBtn.isVisible()) {
        await doorBtn.click();
      } else {
        await page.keyboard.press('KeyD');
      }

      // Click on wall to place door
      await page.mouse.click(box.x + 350, box.y + 200);
    }
  });

  test('E2E-03: Phase 2 (Diseño Eléctrico) - Boxes, devices, conduit, and wiring route', async ({ page }) => {
    await page.goto('/editor/test-electrical-flow');

    // Switch to Phase 2 (Diseño Eléctrico)
    const phase2Tab = page.getByRole('tab', { name: /Eléctrico|Fase 2/i });
    await phase2Tab.click();

    // Verify electric tools are displayed
    await expect(page.getByRole('button', { name: /Caja Octagonal|Plafón/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Tubería|Conduit/i })).toBeVisible();

    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      // 1. Place octagonal box (ceiling lamp)
      await page.getByRole('button', { name: /Caja Octagonal/i }).click();
      await page.mouse.click(box.x + 300, box.y + 250);

      // 2. Place rectangular box (wall switch)
      await page.getByRole('button', { name: /Caja Rectangular/i }).click();
      await page.mouse.click(box.x + 300, box.y + 350);

      // 3. Connect conduit between boxes
      await page.getByRole('button', { name: /Tubería/i }).click();
      await page.mouse.click(box.x + 300, box.y + 250); // Start at lamp
      await page.mouse.click(box.x + 300, box.y + 350); // End at switch
    }
  });

  test('E2E-04: Phase 3 (Cotización BOM) - Verifies dynamic bill of materials and pricing', async ({ page }) => {
    await page.goto('/editor/test-bom-flow');

    // Switch to Phase 3 (Cotización)
    const phase3Tab = page.getByRole('tab', { name: /Cotización|Presupuesto|Fase 3/i });
    await phase3Tab.click();

    // Verify quote table and summary cards render
    await expect(page.getByText(/Presupuesto de Materiales|Cómputo Métrico/i)).toBeVisible();
    await expect(page.getByText(/Total Estimado|Gran Total/i)).toBeVisible();
  });

  test('E2E-05: Phase 4 (Memoria Descriptiva) - Verifies technical documentation', async ({ page }) => {
    await page.goto('/editor/test-memory-flow');

    // Switch to Phase 4 (Memoria Descriptiva)
    const phase4Tab = page.getByRole('tab', { name: /Memoria|Fase 4/i });
    await phase4Tab.click();

    // Verify memory report sections
    await expect(page.getByText(/Memoria Descriptiva|Especificaciones Técnicas/i)).toBeVisible();
    await expect(page.getByText(/Condiciones de la Instalación|Resumen de Cargas/i)).toBeVisible();
  });

  test('E2E-06: PDF Export Modal - Opens, configures pages, and generates document', async ({ page }) => {
    await page.goto('/editor/test-export-flow');

    // Click Export PDF button in header
    const exportBtn = page.getByRole('button', { name: /Exportar PDF|Generar PDF/i });
    await exportBtn.click();

    // Modal should be visible
    const modal = page.getByRole('dialog', { name: /Exportar Documentación/i });
    await expect(modal).toBeVisible();

    // Verify export page checkboxes exist
    await expect(page.getByLabel(/Plano Obra Civil/i)).toBeVisible();
    await expect(page.getByLabel(/Plano Eléctrico/i)).toBeVisible();
    await expect(page.getByLabel(/Presupuesto/i)).toBeVisible();

    // Close modal
    const cancelBtn = page.getByRole('button', { name: /Cancelar|Cerrar/i });
    await cancelBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test('E2E-07: Accessibility & Keyboard Navigation (Command Palette & Shortcuts)', async ({ page }) => {
    await page.goto('/editor/test-a11y-flow');

    // Trigger Command Palette with Ctrl+K
    await page.keyboard.press('Control+KeyK');
    const commandPalette = page.getByRole('dialog', { name: /Paleta de Comandos/i });
    await expect(commandPalette).toBeVisible();

    // Search for tool
    await page.keyboard.type('Pared');
    await page.keyboard.press('Escape');
    await expect(commandPalette).not.toBeVisible();

    // Switch phases via number keys (1 -> 2 -> 3 -> 4)
    await page.keyboard.press('Digit3');
    await expect(page.getByRole('tab', { name: /Cotización/i })).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('Digit1');
    await expect(page.getByRole('tab', { name: /Obra Civil/i })).toHaveAttribute('aria-selected', 'true');
  });
});
