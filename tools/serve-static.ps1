param(
  [int]$Port = 8765,
  [string]$Root = ''
)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($Root)) {
  $Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}
$rootFull = [System.IO.Path]::GetFullPath($Root).TrimEnd('\') + '\'
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()
Write-Output ("serving " + $rootFull + " on http://127.0.0.1:" + $Port + "/")

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.htm'  = 'text/html; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.mjs'  = 'text/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.gif'  = 'image/gif'
  '.webp' = 'image/webp'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
  '.ttf'  = 'font/ttf'
  '.otf'  = 'font/otf'
  '.woff' = 'font/woff'
  '.woff2'= 'font/woff2'
  '.txt'  = 'text/plain; charset=utf-8'
  '.map'  = 'application/json; charset=utf-8'
}

function Send-Text($ctx, [int]$status, [string]$body, [string]$type) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
  $ctx.Response.StatusCode = $status
  $ctx.Response.ContentType = $type
  $ctx.Response.ContentLength64 = $bytes.Length
  $ctx.Response.Headers['Cache-Control'] = 'no-store, no-cache, must-revalidate'
  try { $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length) } catch {}
  try { $ctx.Response.Close() } catch {}
}

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $rel = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)
    if ([string]::IsNullOrWhiteSpace($rel) -or $rel -eq '/') { $rel = '/index.html' }
    $candidate = [System.IO.Path]::GetFullPath((Join-Path $rootFull $rel.TrimStart('/')))
    if (-not $candidate.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
      Send-Text $ctx 403 'Forbidden' 'text/plain; charset=utf-8'
      continue
    }
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
      Send-Text $ctx 404 'Not Found' 'text/plain; charset=utf-8'
      continue
    }
    $ext = [System.IO.Path]::GetExtension($candidate).ToLowerInvariant()
    $type = $mime[$ext]
    if (-not $type) { $type = 'application/octet-stream' }
    $servePath = $candidate
    $gzip = $false
    try {
      if ($req.Headers['Accept-Encoding'] -match 'gzip' -and (Test-Path -LiteralPath ($candidate + '.gz') -PathType Leaf)) {
        $servePath = $candidate + '.gz'
        $gzip = $true
      }
    } catch {}
    $ctx.Response.StatusCode = 200
    $ctx.Response.ContentType = $type
    $ctx.Response.Headers['Cache-Control'] = 'no-store, no-cache, must-revalidate'
    if ($gzip) { $ctx.Response.Headers['Content-Encoding'] = 'gzip' }
    $ctx.Response.ContentLength64 = (Get-Item -LiteralPath $servePath).Length
    $fs = [System.IO.File]::Open($servePath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read)
    try { $fs.CopyTo($ctx.Response.OutputStream) } finally { $fs.Dispose() }
    try { $ctx.Response.Close() } catch {}
  } catch {
    try { Write-Output ("ERR " + $_.Exception.Message) } catch {}
  }
}
