param(
  [Parameter(Mandatory=$true)][string]$Root
)

$ErrorActionPreference = 'Stop'
$index = Join-Path $Root 'index.html'
$out = Join-Path $Root 'preview.html'

$html = [System.IO.File]::ReadAllText($index, [System.Text.Encoding]::UTF8)

$html = [regex]::Replace($html, '<link\b[^>]*\bhref="([^"]+)"[^>]*>', {
  param($m)
  $href = $m.Groups[1].Value
  if ($href -match '^https?://') { return $m.Value }
  $p = Join-Path $Root $href
  if (Test-Path -LiteralPath $p -PathType Leaf) {
    $css = [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8)
    return "<style>`n$css`n</style>"
  }
  return $m.Value
}, 'IgnoreCase')

$html = [regex]::Replace($html, '<script\b([^>]*?)\bsrc="([^"]+)"([^>]*)>\s*</script>', {
  param($m)
  $src = $m.Groups[2].Value
  if ($src -match '^https?://') { return $m.Value }
  $p = Join-Path $Root $src
  if (Test-Path -LiteralPath $p -PathType Leaf) {
    $js = [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8)
    $js = $js.Replace('</script', '<\/script')
    return "<script$($m.Groups[1].Value)$($m.Groups[3].Value)>`n$js`n</script>"
  }
  return $m.Value
}, 'IgnoreCase')

$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($out, $html, $enc)

$gzPath = $out + '.gz'
$in = [System.IO.File]::OpenRead($out)
$outFs = [System.IO.File]::Create($gzPath)
$gz = New-Object System.IO.Compression.GZipStream($outFs, [System.IO.Compression.CompressionMode]::Compress)
try { $in.CopyTo($gz) } finally { $gz.Dispose(); $outFs.Dispose(); $in.Dispose() }

$size = [math]::Round((Get-Item -LiteralPath $out).Length / 1MB, 2)
$gzSize = [math]::Round((Get-Item -LiteralPath $gzPath).Length / 1MB, 2)
$remaining = ([regex]::Matches($html, '<script\b[^>]*\bsrc=')).Count + ([regex]::Matches($html, '<link\b[^>]*\bhref="assets/')).Count
Write-Output ("preview=" + $out)
Write-Output ("size_mb=" + $size + " gzip_mb=" + $gzSize + " external_refs_left=" + $remaining)
