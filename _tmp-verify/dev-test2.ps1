# 临时脚本：用 curl 验证真实问答链路（正确 UTF-8 body）
$log = Join-Path $PSScriptRoot 'dev2.log'
if (Test-Path $log) { Remove-Item $log -Force }

$proc = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npx tsx server.ts > _tmp-verify\dev2.log 2>&1' -PassThru -WindowStyle Hidden
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Milliseconds 500
  try {
    $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/health' -UseBasicParsing -TimeoutSec 2
    if ($r.StatusCode -eq 200) { $ready = $true; break }
  } catch { }
}
if (-not $ready) { Write-Output 'SERVER_NOT_READY'; Get-Content $log -ErrorAction SilentlyContinue | Select-Object -Last 20; Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue; exit 1 }

Write-Output '--- POST /api/ai-consultation (curl, UTF-8, 限时 40s) ---'
& curl.exe -s -i -X POST "http://127.0.0.1:3000/api/ai-consultation" -H "Content-Type: application/json" -d '{\"question\":\"毛利率多少算健康\",\"language\":\"zh\"}' --max-time 40

Write-Output ''
Write-Output '--- POST /api/ai/chat (curl) ---'
& curl.exe -s -i -X POST "http://127.0.0.1:3000/api/ai/chat" -H "Content-Type: application/json" -d '{\"question\":\"备用金要准备几个月\",\"language\":\"zh\"}' --max-time 40

Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
Write-Output 'SERVER_STOPPED'
