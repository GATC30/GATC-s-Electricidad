# ==============================================================================
# GATC v2.0 - Complete Test, QA & Hardening Verification Suite (Fases 10 & 11)
# ==============================================================================

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " GATC v2.0 — VERIFICACION INTEGRAL QA, TESTING & DEPLOY" -ForegroundColor Yellow
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
# 1. VERIFICACIÓN DE ARCHIVOS DE TESTING, PLAYWRIGHT Y PWA (FASE 10)
# ------------------------------------------------------------------------------
Write-Host "`n--- 1. Testing, Playwright y PWA (Fase 10) ---" -ForegroundColor Magenta

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
Write-Host "`n--- 2. Accesibilidad (WCAG AA) ---" -ForegroundColor Magenta

$indexContent = Get-Content "index.html" -Raw
$hasUserScalableNo = $indexContent -match "user-scalable\s*=\s*no"
Assert-Test "index.html no bloquea el zoom del navegador (user-scalable=no eliminado)" (-not $hasUserScalableNo)

$cssContent = Get-Content "src/app/globals.css" -Raw
$hasReducedMotion = $cssContent -match "prefers-reduced-motion"
Assert-Test "src/app/globals.css respeta prefers-reduced-motion" $hasReducedMotion

$hasFocusVisible = $cssContent -match ":focus-visible"
Assert-Test "src/app/globals.css define estilos claros de :focus-visible" $hasFocusVisible

$toolbarContent = Get-Content "src/components/editor/Toolbar.tsx" -Raw
$toolbarHasAria = $toolbarContent -match "aria-label=" -and $toolbarContent -match "aria-pressed="
Assert-Test "Toolbar.tsx incluye aria-label y aria-pressed para botones SVG" $toolbarHasAria

$headerContent = Get-Content "src/components/editor/Header.tsx" -Raw
$headerHasAria = $headerContent -match "aria-label=" -and $headerContent -match "aria-pressed="
Assert-Test "Header.tsx incluye aria-label y aria-pressed en controles y toggles" $headerHasAria

# ------------------------------------------------------------------------------
# 3. OPTIMIZACIÓN DE RENDIMIENTO (F10-05)
# ------------------------------------------------------------------------------
Write-Host "`n--- 3. Rendimiento & Lazy Loading (F10-05) ---" -ForegroundColor Magenta

$editorPageContent = Get-Content -LiteralPath "src/app/editor/[projectId]/page.tsx" -Raw
$hasDynamic3D = $editorPageContent -match "dynamic\s*\(\s*\(\)\s*=>\s*import\('@/components/editor/Viewer3D'\)"
Assert-Test "page.tsx implementa lazy loading del Visor 3D con dynamic()" $hasDynamic3D

$hasDynamicPDF = $editorPageContent -match "import\('@/lib/pdf-generator'\)"
Assert-Test "page.tsx importa PDF generator bajo demanda" $hasDynamicPDF

$nextConfigContent = Get-Content "next.config.ts" -Raw
$hasWebpackSplit = $nextConfigContent -match "splitChunks"
Assert-Test "next.config.ts optimiza splitChunks para librerias pesadas (three, jspdf)" $hasWebpackSplit

# ------------------------------------------------------------------------------
# 4. SUITES DE TESTS UNITARIOS, E2E Y MIGRACIÓN (F10-01, F10-02, F10-06)
# ------------------------------------------------------------------------------
Write-Host "`n--- 4. Suites de Pruebas Unitarias, E2E y Migracion ---" -ForegroundColor Magenta

Assert-Test "tests/unit/geometry.test.ts existe con 15+ assertions" (Test-Path "tests/unit/geometry.test.ts")
Assert-Test "tests/unit/bom.test.ts existe con calculos 3D y BOM" (Test-Path "tests/unit/bom.test.ts")
Assert-Test "tests/unit/catalog.test.ts existe con validacion de CATALOG" (Test-Path "tests/unit/catalog.test.ts")
Assert-Test "tests/e2e/editor.spec.ts existe con 7 escenarios completos" (Test-Path "tests/e2e/editor.spec.ts")
Assert-Test "tests/unit/migration.test.ts existe con fixtures reales" (Test-Path "tests/unit/migration.test.ts")

# ------------------------------------------------------------------------------
# 5. HARDENING, ERROR BOUNDARIES & MONITOREO (F11-01, F11-02, F11-05)
# ------------------------------------------------------------------------------
Write-Host "`n--- 5. Error Boundaries, Skeletons y Monitoreo (Fase 11) ---" -ForegroundColor Magenta

Assert-Test "src/components/common/ErrorBoundary.tsx existe" (Test-Path "src/components/common/ErrorBoundary.tsx")
Assert-Test "src/components/ui/Skeleton.tsx existe" (Test-Path "src/components/ui/Skeleton.tsx")
Assert-Test "src/lib/monitoring.ts existe" (Test-Path "src/lib/monitoring.ts")

$pageHasErrorBoundary = $editorPageContent -match "ErrorBoundary"
Assert-Test "page.tsx envuelve Visor 3D, Lienzo CAD y Paneles en ErrorBoundary" $pageHasErrorBoundary

$pageHasSkeleton = $editorPageContent -match "SkeletonEditor"
Assert-Test "page.tsx renderiza SkeletonEditor durante la carga inicial" $pageHasSkeleton

# ------------------------------------------------------------------------------
# 6. RATE LIMITING & SECURITY HEADERS (F11-03, F11-04)
# ------------------------------------------------------------------------------
Write-Host "`n--- 6. Rate Limiting y Cabeceras de Seguridad (F11-03, F11-04) ---" -ForegroundColor Magenta

Assert-Test "src/lib/rate-limit.ts existe" (Test-Path "src/lib/rate-limit.ts")

$hasCSP = $nextConfigContent -match "Content-Security-Policy"
Assert-Test "next.config.ts define Content-Security-Policy (CSP) estricto" $hasCSP

$hasXFrame = $nextConfigContent -match "X-Frame-Options"
Assert-Test "next.config.ts incluye X-Frame-Options: DENY" $hasXFrame

$hasHSTS = $nextConfigContent -match "Strict-Transport-Security"
Assert-Test "next.config.ts incluye Strict-Transport-Security (HSTS)" $hasHSTS

$pdfRouteContent = Get-Content "src/app/api/export/pdf/route.ts" -Raw
$hasPdfRateLimit = $pdfRouteContent -match "enforceRateLimit"
Assert-Test "Endpoint /api/export/pdf aplica rate limiting (10 req/min)" $hasPdfRateLimit

$projectsRouteContent = Get-Content "src/app/api/projects/route.ts" -Raw
$hasProjectsRateLimit = $projectsRouteContent -match "enforceRateLimit"
Assert-Test "Endpoint /api/projects aplica rate limiting (60 req/min)" $hasProjectsRateLimit

# ------------------------------------------------------------------------------
# 7. DOCUMENTACIÓN, SEO Y DEPLOY (F11-06, F11-07, F11-08)
# ------------------------------------------------------------------------------
Write-Host "`n--- 7. Documentacion, SEO y Despliegue en Vercel (Fase 11) ---" -ForegroundColor Magenta

Assert-Test "README.md existe y tiene mas de 2,000 caracteres" ((Test-Path "README.md") -and ((Get-Item "README.md").Length -gt 2000))
Assert-Test "public/robots.txt existe" (Test-Path "public/robots.txt")
Assert-Test "public/sitemap.xml existe" (Test-Path "public/sitemap.xml")

$vercelContent = Get-Content "vercel.json" -Raw
$hasFunctionsConfig = $vercelContent -match "functions" -and $vercelContent -match "maxDuration"
Assert-Test "vercel.json define limites y memoria para funciones de exportacion" $hasFunctionsConfig

$layoutContent = Get-Content "src/app/layout.tsx" -Raw
$hasOpenGraph = $layoutContent -match "openGraph" -and $layoutContent -match "twitter"
Assert-Test "src/app/layout.tsx incluye metadata de SEO, OpenGraph y Twitter Cards" $hasOpenGraph

# ------------------------------------------------------------------------------
# RESUMEN FINAL
# ------------------------------------------------------------------------------
Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host " RESULTADOS DE LA SUITE INTEGRAL (FASES 10 & 11)" -ForegroundColor Yellow
Write-Host " Pruebas Pasadas: $passed" -ForegroundColor Green
Write-Host " Pruebas Falladas: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "========================================================" -ForegroundColor Cyan

if ($failed -gt 0) {
    exit 1
} else {
    exit 0
}
