# 打包上传包：根目录 index.html + assets 全部文件，ZIP 内使用正斜杠路径。
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$zipPath = Join-Path $root 'upload.zip'
if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$fs = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::Create)
$zip = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)
$count = 0
try {
  $index = Join-Path $root 'index.html'
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
    $zip, $index, 'index.html', [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
  $count++

  $assets = Join-Path $root 'assets'
  Get-ChildItem -LiteralPath $assets -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($root.Length + 1) -replace '\\', '/'
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $zip, $_.FullName, $rel, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    $count++
  }
}
finally {
  $zip.Dispose()
  $fs.Dispose()
}
$size = [math]::Round((Get-Item -LiteralPath $zipPath).Length / 1MB, 2)
$final = Join-Path $root '闯进无人相信的NBA-上传包.zip'
if (Test-Path -LiteralPath $final) { Remove-Item -LiteralPath $final -Force }
Move-Item -LiteralPath $zipPath -Destination $final
Write-Output ("zip=" + $final)
Write-Output ("zip_entries=" + $count + " size_mb=" + $size)
