param(
    [int]$Port = 8765
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$cloudflared = Join-Path $PSScriptRoot 'cloudflared.exe'

function Test-LocalPort {
    param([int]$p)
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $iar = $client.BeginConnect('127.0.0.1', $p, $null, $null)
        if ($iar.AsyncWaitHandle.WaitOne(500)) {
            $client.EndConnect($iar)
            $client.Close()
            return $true
        }
        $client.Close()
        return $false
    } catch {
        return $false
    }
}

function Wait-PublicDns {
    param([string]$HostName, [int]$TimeoutSeconds = 30)
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            $result = Resolve-DnsName $HostName -ErrorAction Stop
            if ($result) { return $true }
        } catch {}
        # 清掉首次访问留下的 NXDOMAIN 负缓存
        try { ipconfig /flushdns | Out-Null } catch {}
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)
    return $false
}

if (-not (Test-Path $cloudflared)) {
    Write-Host "cloudflared.exe not found: $cloudflared" -ForegroundColor Red
    exit 1
}

Write-Host "=========================================="
Write-Host "  NBA Tunnel"
Write-Host "  Local: http://127.0.0.1:$Port/"
Write-Host "=========================================="
Write-Host ""

# 1) 本地服务器没开就自动开
if (-not (Test-LocalPort $Port)) {
    Write-Host "Starting local server on port $Port ..."
    Start-Process -FilePath 'powershell.exe' `
        -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $PSScriptRoot 'serve-static.ps1'),'-Port',$Port) `
        -WindowStyle Minimized | Out-Null

    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Milliseconds 250
        if (Test-LocalPort $Port) { break }
    }
}

if (-not (Test-LocalPort $Port)) {
    Write-Host "Local server did not start on port $Port." -ForegroundColor Red
    Write-Host "Try running 启动本地服务器.cmd first." -ForegroundColor Yellow
    exit 1
}

# 2) 关掉上一次由本脚本启动的 tunnel
$pidFile = Join-Path $PSScriptRoot 'cf.pid'
if (Test-Path $pidFile) {
    $oldPid = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
    if ($oldPid -match '^\d+$') {
        try { Stop-Process -Id ([int]$oldPid) -Force -ErrorAction SilentlyContinue } catch {}
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

$outLog = Join-Path $PSScriptRoot 'cf.out.log'
$errLog = Join-Path $PSScriptRoot 'cf.err.log'
Remove-Item $outLog, $errLog -Force -ErrorAction SilentlyContinue

# 3) 启动 cloudflared quick tunnel
# UDP/QUIC 在部分网络会被拦，固定 http2 更稳
$cfArgs = @(
    'tunnel',
    '--url', "http://127.0.0.1:$Port",
    '--protocol', 'http2',
    '--no-autoupdate',
    '--loglevel', 'info'
)

Write-Host "Starting Cloudflare tunnel ..."
$proc = Start-Process -FilePath $cloudflared `
    -ArgumentList $cfArgs `
    -RedirectStandardOutput $outLog `
    -RedirectStandardError $errLog `
    -WindowStyle Hidden `
    -PassThru

$proc.Id | Set-Content -Path $pidFile -Encoding ascii

# 4) 等公网 URL
Write-Host "Waiting for public URL ..."
$publicUrl = $null
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Milliseconds 500
    $proc.Refresh()
    foreach ($log in @($errLog, $outLog)) {
        if (Test-Path $log) {
            $match = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -AllMatches -ErrorAction SilentlyContinue |
                Select-Object -First 1
            if ($match) {
                $publicUrl = $match.Matches[0].Value
                break
            }
        }
    }
    if ($publicUrl) { break }
    if ($proc.HasExited) { break }
}

Write-Host ""
if ($publicUrl) {
    Write-Host "Public URL:" -ForegroundColor Green
    Write-Host "  $publicUrl" -ForegroundColor Yellow
    Write-Host ""
    try { Set-Clipboard -Value $publicUrl } catch {}
    Write-Host "URL copied to clipboard."

    # Quick Tunnel 的 DNS 是临时记录；首次访问过早会留下 NXDOMAIN 负缓存。
    $hostName = ([uri]$publicUrl).Host
    Write-Host "Waiting for DNS to resolve ..."
    $dnsOk = Wait-PublicDns -HostName $hostName -TimeoutSeconds 30
    if ($dnsOk) {
        Write-Host "DNS OK." -ForegroundColor Green
    } else {
        Write-Host "DNS is still not resolving on this machine." -ForegroundColor Yellow
        Write-Host "Try: ipconfig /flushdns" -ForegroundColor Yellow
        Write-Host "Or set Windows/browser DNS to 1.1.1.1 / 8.8.8.8." -ForegroundColor Yellow
        Write-Host "The tunnel itself is running; this is a local DNS issue." -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "Tunnel keeps running after this window closes."
    Write-Host "To stop it, run 停止隧道.cmd."
    Write-Host ""
    if ($dnsOk) { Start-Process $publicUrl | Out-Null }
} else {
    Write-Host "Failed to get the public URL." -ForegroundColor Red
    Write-Host "Last cloudflared log:" -ForegroundColor Yellow
    if (Test-Path $errLog) {
        Get-Content $errLog -Tail 30
    } else {
        Write-Host "(no log yet)"
    }
}

Write-Host ""
Read-Host "Press Enter to close this window"
