# WP BARQ Build & Packaging Script
# This script prepares a production-ready version of the plugin in the 'dist' folder.

$PluginName = "wp_barq"
$BuildDir = "dist"
$PackageDir = "$BuildDir/$PluginName"

# 1. Clean previous builds
Write-Host "--- Cleaning old build directory ---" -ForegroundColor Cyan
if (Test-Path $BuildDir) { Remove-Item -Recurse -Force $BuildDir }
New-Item -ItemType Directory -Path $PackageDir

# 2. Build Frontend
Write-Host "--- Building Frontend (Vite) ---" -ForegroundColor Cyan
Push-Location frontend
npm run build
Pop-Location

# 3. Optimize Composer Dependencies
Write-Host "--- Optimizing Composer (Production) ---" -ForegroundColor Cyan
composer install --no-dev --optimize-autoloader

# 4. Copy Production Files
Write-Host "--- Copying files to package ---" -ForegroundColor Cyan
$ItemsToCopy = @(
    "assets/build",
    "inc",
    "vendor",
    "wp-barq.php"
)

foreach ($item in $ItemsToCopy) {
    if (Test-Path $item) {
        $dest = Split-Path "$PackageDir/$item" -Parent
        if (!(Test-Path $dest)) { New-Item -ItemType Directory -Path $dest }
        Copy-Item -Recurse -Path $item -Destination $dest
    }
}

# 5. Create Zip Archive
Write-Host "--- Creating ZIP archive ---" -ForegroundColor Cyan
Compress-Archive -Path $PackageDir -DestinationPath "$BuildDir/$PluginName.zip" -Force

Write-Host "--- BUILD COMPLETE ---" -ForegroundColor Green
Write-Host "Production package: $BuildDir/$PluginName.zip"
Write-Host "Unzipped package: $PackageDir"
