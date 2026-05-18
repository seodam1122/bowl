# Vercel 환경 변수 VITE_API_URL 설정 + 재배포
# 사용법:
#   1) npx vercel login
#   2) .\scripts\setup-vercel-env.ps1 -ApiUrl "https://your-api.onrender.com/api"

param(
  [Parameter(Mandatory = $true)]
  [string]$ApiUrl
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if ($ApiUrl -notmatch '/api$') {
  Write-Warning "URL 끝에 /api 가 없습니다. 예: https://xxx.onrender.com/api"
}

Write-Host "Vercel 로그인 확인..."
npx vercel@39 whoami 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "먼저 로그인하세요: npx vercel login" -ForegroundColor Yellow
  exit 1
}

if (-not (Test-Path ".vercel\project.json")) {
  Write-Host "프로젝트 연결: npx vercel link"
  npx vercel@39 link
}

$envs = @("production", "preview", "development")
foreach ($env in $envs) {
  Write-Host "VITE_API_URL 추가 ($env)..."
  $ApiUrl | npx vercel@39 env add VITE_API_URL $env --force 2>&1
}

Write-Host "Production 재배포..."
npx vercel@39 --prod

Write-Host "완료. Vercel 대시보드 → Settings → Environment Variables 에서 확인하세요."
