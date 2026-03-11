# Setup GitHub Secrets for FrotaGestor Pro CI/CD
# Run: powershell -ExecutionPolicy Bypass -File scripts/setup-github-secrets.ps1

$ErrorActionPreference = "Stop"
$repo = "Ananiasfeliciano/FrotaGestor-Pro"
$ghPath = "C:\Program Files\GitHub CLI\gh.exe"

# Clear GH_TOKEN to use interactive auth
$env:GH_TOKEN = $null

Write-Host "=== FrotaGestor Pro - GitHub Secrets Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if gh is authenticated
$authCheck = & $ghPath auth status 2>&1 | Out-String
if ($authCheck -match "Logged in") {
    Write-Host "OK: GitHub CLI authenticated" -ForegroundColor Green
} else {
    Write-Host "Logging in to GitHub (browser will open)..." -ForegroundColor Yellow
    & $ghPath auth login -h github.com -p https -s "repo,workflow" --web
}

Write-Host ""
Write-Host "Setting GitHub Secrets..." -ForegroundColor Cyan

# Generate secure passwords
$chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
$jwtSecret = -join ((1..64) | ForEach-Object { $chars[(Get-Random -Max $chars.Length)] })
$dbPassword = -join ((1..32) | ForEach-Object { $chars[(Get-Random -Max $chars.Length)] })
$redisPassword = -join ((1..32) | ForEach-Object { $chars[(Get-Random -Max $chars.Length)] })
$grafanaPassword = -join ((1..20) | ForEach-Object { $chars[(Get-Random -Max $chars.Length)] })

# Read Firebase config from .env
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$envFile = Join-Path $projectRoot ".env"

$firebaseConfig = @{}
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^(VITE_FIREBASE_\w+)=(.+)$') {
            $firebaseConfig[$matches[1]] = $matches[2]
        }
    }
}

# Vercel config
$vercelProjectFile = Join-Path $projectRoot ".vercel\project.json"
$vercelOrgId = ""
$vercelProjectId = ""
if (Test-Path $vercelProjectFile) {
    $vercelJson = Get-Content $vercelProjectFile -Raw | ConvertFrom-Json
    $vercelOrgId = $vercelJson.orgId
    $vercelProjectId = $vercelJson.projectId
}

$secrets = @{
    # Security
    "JWT_SECRET" = $jwtSecret
    "DB_PASSWORD" = $dbPassword
    "REDIS_PASSWORD" = $redisPassword
    "GRAFANA_PASSWORD" = $grafanaPassword
    
    # Firebase
    "VITE_FIREBASE_API_KEY" = $firebaseConfig["VITE_FIREBASE_API_KEY"]
    "VITE_FIREBASE_AUTH_DOMAIN" = $firebaseConfig["VITE_FIREBASE_AUTH_DOMAIN"]
    "VITE_FIREBASE_DATABASE_URL" = $firebaseConfig["VITE_FIREBASE_DATABASE_URL"]
    "VITE_FIREBASE_PROJECT_ID" = $firebaseConfig["VITE_FIREBASE_PROJECT_ID"]
    "VITE_FIREBASE_STORAGE_BUCKET" = $firebaseConfig["VITE_FIREBASE_STORAGE_BUCKET"]
    "VITE_FIREBASE_MESSAGING_ID" = $firebaseConfig["VITE_FIREBASE_MESSAGING_ID"]
    "VITE_FIREBASE_APP_ID" = $firebaseConfig["VITE_FIREBASE_APP_ID"]
    
    # Vercel
    "VERCEL_ORG_ID" = $vercelOrgId
    "VERCEL_PROJECT_ID" = $vercelProjectId
}

$success = 0
$failed = 0

foreach ($key in $secrets.Keys) {
    $value = $secrets[$key]
    if ([string]::IsNullOrEmpty($value)) {
        Write-Host "  SKIP: $key (empty value)" -ForegroundColor Yellow
        continue
    }
    
    try {
        $value | & $ghPath secret set $key -R $repo 2>&1 | Out-Null
        Write-Host "  OK: $key" -ForegroundColor Green
        $success++
    } catch {
        Write-Host "  FAIL: $key - $_" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host "=== Results ===" -ForegroundColor Cyan
Write-Host "  Success: $success" -ForegroundColor Green
Write-Host "  Failed:  $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host ""
Write-Host "NOTE: You still need to set VERCEL_TOKEN manually:" -ForegroundColor Yellow
Write-Host "  1. Go to https://vercel.com/account/tokens" -ForegroundColor White
Write-Host "  2. Create a new token" -ForegroundColor White
Write-Host "  3. Run: gh secret set VERCEL_TOKEN -R $repo" -ForegroundColor White
Write-Host ""
Write-Host "For server deployment, also set:" -ForegroundColor Yellow
Write-Host "  gh secret set SERVER_HOST -R $repo" -ForegroundColor White
Write-Host "  gh secret set SERVER_USER -R $repo" -ForegroundColor White
Write-Host "  gh secret set SERVER_SSH_KEY -R $repo" -ForegroundColor White

# Save generated passwords to local .env.production (gitignored)
$envProdFile = Join-Path $projectRoot ".env.production"
@"
# Generated production secrets - $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# DO NOT COMMIT THIS FILE

# Security
JWT_SECRET=$jwtSecret
DB_PASSWORD=$dbPassword
REDIS_PASSWORD=$redisPassword

# Database
DB_USER=frotagestor
DB_NAME=frotagestor_pro

# Firebase
VITE_FIREBASE_API_KEY=$($firebaseConfig["VITE_FIREBASE_API_KEY"])
VITE_FIREBASE_AUTH_DOMAIN=$($firebaseConfig["VITE_FIREBASE_AUTH_DOMAIN"])
VITE_FIREBASE_DATABASE_URL=$($firebaseConfig["VITE_FIREBASE_DATABASE_URL"])
VITE_FIREBASE_PROJECT_ID=$($firebaseConfig["VITE_FIREBASE_PROJECT_ID"])
VITE_FIREBASE_STORAGE_BUCKET=$($firebaseConfig["VITE_FIREBASE_STORAGE_BUCKET"])
VITE_FIREBASE_MESSAGING_ID=$($firebaseConfig["VITE_FIREBASE_MESSAGING_ID"])
VITE_FIREBASE_APP_ID=$($firebaseConfig["VITE_FIREBASE_APP_ID"])

# API
VITE_API_URL=/api/v1

# CORS
CORS_ORIGINS=https://frotagestor-pro.com,https://frotagestor-pro.vercel.app

# Grafana
GRAFANA_USER=admin
GRAFANA_PASSWORD=$grafanaPassword
"@ | Set-Content $envProdFile -Encoding UTF8

Write-Host "Production env saved to: .env.production" -ForegroundColor Green
