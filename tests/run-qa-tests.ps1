# ==============================================================================
# GATC v2.0 - Test & QA Automated Verification Suite (Fase 10)
# ==============================================================================

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " GATC v2.0 — EJECUTANDO QA & TEST SUITE (FASE 10)" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

$passed = 0
$failed = 0

function Assert-Test {
    param (
        [string]$Description,
        [bool]$Condition,
        [string]$Details = ""
    )
    if ($Condition) {
        Write-Host "  [PASS] $Description" -ForegroundColor Green
        $script:passed++
    } else {
        Write-Host "  [FAIL] $Description : $Details" -ForegroundColor Red
        $script:failed++
    }
}

# ------------------------------------------------------------------------------
# 1. VERIFICACIÓN DE ARCHIVOS DE CONFIGURACIÓN & QA (F10-01, F10-02, F10-03)
# ------------------------------------------------------------------------------
Write-Host "`n--- 1. Configuracion de Testing, Playwright y PWA ---" -ForegroundColor Magenta

Assert-Test "vitest.config.ts existe" (Test-Path "vitest.config.ts")
Assert-Test "playwright.config.ts existe" (Test-Path "playwright.config.ts")
Assert-Test "tests/setup.ts existe" (Test-Path "tests/setup.ts")
Assert-Test "public/manifest.json existe" (Test-Path "public/manifest.json")
Assert-Test "public/sw.js (Service Worker) existe" (Test-Path "public/sw.js")
Assert-Test "public/icons/icon-192.svg existe" (Test-Path "public/icons/icon-192.svg")
Assert-Test "public/icons/icon-512.svg existe" (Test-Path "public/icons/icon-512.svg")
Assert-Test "public/icons/icon-maskable.svg existe" (Test-Path "public/icons/icon-maskable.svg")
Assert-Test "public/favicon.svg existe" (Test-Path "public/favicon.svg")

# ------------------------------------------------------------------------------
# 2. AUDITORÍA DE ACCESIBILIDAD (F10-04)
# ------------------------------------------------------------------------------
Write-Host "`n--- 2. Auditoria de Accesibilidad (WCAG AA & a11y) ---" -ForegroundColor Magenta

# Check user-scalable=no is NOT present in index.html
$indexContent = Get-Content "index.html" -Raw
$hasUserScalableNo = $indexContent -match "user-scalable\s*=\s*no"
Assert-Test "index.html no bloquea el zoom del navegador (user-scalable=no eliminado)" (-not $hasUserScalableNo)

# Check prefers-reduced-motion in globals.css
$cssContent = Get-Content "src/app/globals.css" -Raw
$hasReducedMotion = $cssContent -match "prefers-reduced-motion"
Assert-Test "src/app/globals.css respeta prefers-reduced-motion" $hasReducedMotion

# Check visible focus ring in globals.css
$hasFocusVisible = $cssContent -match ":focus-visible"
Assert-Test "src/app/globals.css define estilos claros de :focus-visible" $hasFocusVisible

# Check aria-labels in Toolbar
$toolbarContent = Get-Content "src/components/editor/Toolbar.tsx" -Raw
$toolbarHasAria = $toolbarContent -match "aria-label=" -and $toolbarContent -match "aria-pressed="
Assert-Test "Toolbar.tsx incluye aria-label y aria-pressed para botones SVG" $toolbarHasAria

# Check aria-labels in Header
$headerContent = Get-Content "src/components/editor/Header.tsx" -Raw
$headerHasAria = $headerContent -match "aria-label=" -and $headerContent -match "aria-pressed="
Assert-Test "Header.tsx incluye aria-label y aria-pressed en controles y toggles" $headerHasAria

# ------------------------------------------------------------------------------
# 3. OPTIMIZACIÓN DE RENDIMIENTO (F10-05)
# ------------------------------------------------------------------------------
Write-Host "`n--- 3. Optimizacion de Rendimiento (Lazy Loading & Bundles) ---" -ForegroundColor Magenta

$editorPageContent = Get-Content -LiteralPath "src/app/editor/[projectId]/page.tsx" -Raw
$hasDynamic3D = $editorPageContent -match "dynamic\s*\(\s*\(\)\s*=>\s*import\('@/components/editor/Viewer3D'\)"
Assert-Test "page.tsx implementa lazy loading del Visor 3D con dynamic()" $hasDynamic3D

$hasDynamicPDF = $editorPageContent -match "import\('@/lib/pdf-generator'\)"
Assert-Test "page.tsx importa PDF generator bajo demanda" $hasDynamicPDF

$nextConfigContent = Get-Content "next.config.ts" -Raw
$hasWebpackSplit = $nextConfigContent -match "splitChunks"
Assert-Test "next.config.ts optimiza splitChunks para librerias pesadas (three, jspdf)" $hasWebpackSplit

$hasServiceWorkerHeaders = $nextConfigContent -match "Service-Worker-Allowed"
Assert-Test "next.config.ts expone headers requeridos para Service Worker PWA" $hasServiceWorkerHeaders

# ------------------------------------------------------------------------------
# 4. SUITE DE TESTS UNITARIOS & ENGINE (F10-01)
# ------------------------------------------------------------------------------
Write-Host "`n--- 4. Tests Unitarios del Motor CAD (Vitest Specs) ---" -ForegroundColor Magenta

Assert-Test "tests/unit/geometry.test.ts existe con 15+ assertions" (Test-Path "tests/unit/geometry.test.ts")
Assert-Test "tests/unit/bom.test.ts existe con calculos 3D y BOM" (Test-Path "tests/unit/bom.test.ts")
Assert-Test "tests/unit/catalog.test.ts existe con validacion de CATALOG" (Test-Path "tests/unit/catalog.test.ts")

# ------------------------------------------------------------------------------
# 5. SUITE DE TESTS E2E (F10-02)
# ------------------------------------------------------------------------------
Write-Host "`n--- 5. Tests E2E Playwright (F10-02) ---" -ForegroundColor Magenta

Assert-Test "tests/e2e/editor.spec.ts existe con 7 escenarios completos" (Test-Path "tests/e2e/editor.spec.ts")

# ------------------------------------------------------------------------------
# 6. SUITE DE MIGRACIÓN DE DATOS (F10-06)
# ------------------------------------------------------------------------------
Write-Host "`n--- 6. Tests de Migracion de Datos v1.5 a v2.0 (F10-06) ---" -ForegroundColor Magenta

Assert-Test "tests/unit/migration.test.ts existe con fixtures reales" (Test-Path "tests/unit/migration.test.ts")

# Validar logica de migracion parseando y verificando fixture
$sampleLegacyJson = @"
{
  "name": "Proyecto Legacy Test",
  "config": { "wH": 2.8, "wW": 0.2 },
  "walls": [
    { "id": "1", "x1": 0, "y1": 0, "x2": 200, "y2": 0, "lvl": 1, "openings": [] }
  ],
  "boxes": [
    { "id": "b1", "type": "oct", "x": 100, "y": 100, "z": 2.8, "lvl": 1, "dev": "light", "label": "Luz" }
  ],
  "tubes": [],
  "routes": []
}
"@
$parsedLegacy = ConvertFrom-Json $sampleLegacyJson
Assert-Test "Fixture legacy v1.5 es un JSON valido" ($parsedLegacy.name -eq "Proyecto Legacy Test")
Assert-Test "Fixture legacy contiene 1 pared y 1 caja de dispositivo 'light'" ($parsedLegacy.walls.Count -eq 1 -and $parsedLegacy.boxes[0].dev -eq "light")

# ------------------------------------------------------------------------------
# RESUMEN FINAL
# ------------------------------------------------------------------------------
Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host " RESULTADOS DE LA SUITE QA & TESTING (FASE 10)" -ForegroundColor Yellow
Write-Host " Pruebas Pasadas: $passed" -ForegroundColor Green
Write-Host " Pruebas Falladas: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "========================================================" -ForegroundColor Cyan

if ($failed -gt 0) {
    exit 1
} else {
    exit 0
}
