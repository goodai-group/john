# 临时脚本：启动本地 dev 服务器（tsx server.ts）并做端到端冒烟测试
$ErrorActionPreference = 'Continue'
$log = Join-Path $PSScriptRoot 'dev.log'
if (Test-Path $log) { Remove-Item $log -Force }

$proc = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npx tsx server.ts > _tmp-verify\dev.log 2>&1' -PassThru -WindowStyle Hidden

# 等待端口 3000 就绪
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Milliseconds 500
  try {
    $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/health' -UseBasicParsing -TimeoutSec 2
    if ($r.StatusCode -eq 200) { $ready = $true; break }
  } catch { }
}
if (-not $ready) {
  Write-Output 'SERVER_NOT_READY'
  Get-Content $log -ErrorAction SilentlyContinue | Select-Object -Last 30
  Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
  exit 1
}
Write-Output 'SERVER_READY'

Write-Output '--- GET /api/health ---'
try { (Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/health' -UseBasicParsing -TimeoutSec 5).Content } catch { Write-Output "ERR: $($_.Exception.Message)" }

Write-Output '--- POST /api/ai-consultation (正常问题) ---'
try {
  $resp = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/ai-consultation' -Method POST -ContentType 'application/json; charset=utf-8' -Body '{"question":"毛利率多少算健康","language":"zh"}' -UseBasicParsing -TimeoutSec 20
  Write-Output "HTTP $($resp.StatusCode)"
  Write-Output ($resp.Content.Substring(0, [Math]::Min(500, $resp.Content.Length)))
} catch {
  $resp = $_.Exception.Response
  if ($resp) { Write-Output "HTTP $([int]$resp.StatusCode)" }
  Write-Output "ERR: $($_.Exception.Message)"
}

Write-Output '--- POST /api/ai-consultation (空问题 -> 期望 400) ---'
try {
  $resp = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/ai-consultation' -Method POST -ContentType 'application/json' -Body '{}' -UseBasicParsing -TimeoutSec 10
  Write-Output "HTTP $($resp.StatusCode) BODY=$($resp.Content)"
} catch {
  $resp = $_.Exception.Response
  if ($resp) {
    $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
    Write-Output "HTTP $([int]$resp.StatusCode) BODY=$($sr.ReadToEnd())"
  } else { Write-Output "ERR: $($_.Exception.Message)" }
}

Write-Output '--- POST /api/ai-consultation (畸形 JSON -> 期望 400) ---'
try {
  $resp = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/ai-consultation' -Method POST -ContentType 'application/json' -Body '{bad json' -UseBasicParsing -TimeoutSec 10
  Write-Output "HTTP $($resp.StatusCode) BODY=$($resp.Content)"
} catch {
  $resp = $_.Exception.Response
  if ($resp) {
    $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
    Write-Output "HTTP $([int]$resp.StatusCode) BODY=$($sr.ReadToEnd())"
  } else { Write-Output "ERR: $($_.Exception.Message)" }
}

Write-Output '--- GET /api/ai/chat (方法不允许 -> 期望 405 JSON) ---'
try {
  $resp = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/ai/chat' -Method GET -UseBasicParsing -TimeoutSec 10
  Write-Output "HTTP $($resp.StatusCode) BODY=$($resp.Content)"
} catch {
  $resp = $_.Exception.Response
  if ($resp) {
    $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
    Write-Output "HTTP $([int]$resp.StatusCode) BODY=$($sr.ReadToEnd())"
  } else { Write-Output "ERR: $($_.Exception.Message)" }
}

Write-Output '--- POST /api/ai/chat (走 catch-all 同一路由) ---'
try {
  $resp = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/ai/chat' -Method POST -ContentType 'application/json' -Body '{"question":"保本点怎么算"}' -UseBasicParsing -TimeoutSec 20
  Write-Output "HTTP $($resp.StatusCode)"
  Write-Output ($resp.Content.Substring(0, [Math]::Min(300, $resp.Content.Length)))
} catch {
  $resp = $_.Exception.Response
  if ($resp) { Write-Output "HTTP $([int]$resp.StatusCode)" }
  Write-Output "ERR: $($_.Exception.Message)"
}

Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
Write-Output 'SERVER_STOPPED'
