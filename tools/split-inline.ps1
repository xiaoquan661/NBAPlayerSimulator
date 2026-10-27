# 一次性迁移：把 index.html 里的内联 <script> / <style> 按原顺序抽成外部文件。
# 原则：只拆不改。脚本执行顺序、样式层叠顺序、标签 id 全部保持原样。
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$htmlPath = Join-Path $root 'index.html'
$jsDir = Join-Path $root 'assets\js'
$cssDir = Join-Path $root 'assets\css'
New-Item -ItemType Directory -Force -Path $jsDir | Out-Null
New-Item -ItemType Directory -Force -Path $cssDir | Out-Null

$utf8 = New-Object System.Text.UTF8Encoding($false)
$text = [System.IO.File]::ReadAllText($htmlPath, $utf8)
$rx = [regex]::new('<script\b|<style\b', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

$records = New-Object System.Collections.Generic.List[object]
$pos = 0
while ($true) {
  $m = $rx.Match($text, $pos)
  if (-not $m.Success) { break }
  $tag = $m.Value.ToLowerInvariant().Replace('<', '')
  $start = $m.Index
  $openEnd = $text.IndexOf('>', $start)
  if ($openEnd -lt 0) { break }
  $attrs = $text.Substring($start + $tag.Length + 1, $openEnd - $start - $tag.Length - 1)
  $closeTag = "</$tag>"
  $closeIdx = $text.IndexOf($closeTag, $openEnd + 1, [System.StringComparison]::OrdinalIgnoreCase)
  if ($closeIdx -lt 0) { break }
  $content = $text.Substring($openEnd + 1, $closeIdx - $openEnd - 1)
  $end = $closeIdx + $closeTag.Length
  $records.Add([pscustomobject]@{
    Tag = $tag; Start = $start; End = $end; Attrs = $attrs; Content = $content
  })
  $pos = $end
}

$jsNum = 0; $cssNum = 0
$manifest = New-Object System.Collections.Generic.List[object]
$replacements = New-Object System.Collections.Generic.List[object]

foreach ($r in $records) {
  $idMatch = [regex]::Match($r.Attrs, 'id\s*=\s*["'']([^"'']+)["'']', 'IgnoreCase')
  $id = if ($idMatch.Success) { $idMatch.Groups[1].Value } else { '' }

  if ($r.Tag -eq 'script') {
    if ($r.Attrs -match '\bsrc\s*=') { continue }          # 已有外部脚本，保持不动
    if ($r.Content -match '__booting') { continue }         # 首屏防闪脚本保留内联
    $jsNum++
    $base = if ($id) { $id } else { 'inline' }
    $safe = ($base -replace '[^A-Za-z0-9_-]', '-')
    if ($safe.Length -gt 70) { $safe = $safe.Substring(0, 70) }
    $name = ('{0:000}-{1}.js' -f $jsNum, $safe)
    $rel = 'assets/js/' + $name
    [System.IO.File]::WriteAllText((Join-Path $jsDir $name), $r.Content, $utf8)
    $attrs = $r.Attrs
    $newTag = '<script' + $attrs + ' src="' + $rel + '"></script>'
    $replacements.Add([pscustomobject]@{ Start = $r.Start; End = $r.End; Text = $newTag })
    $manifest.Add([pscustomobject]@{ type = 'script'; order = $jsNum; id = $id; file = $rel; chars = $r.Content.Length })
  }
  elseif ($r.Tag -eq 'style') {
    $cssNum++
    $base = if ($id) { $id } else { 'style' }
    $safe = ($base -replace '[^A-Za-z0-9_-]', '-')
    if ($safe.Length -gt 70) { $safe = $safe.Substring(0, 70) }
    $name = ('{0:000}-{1}.css' -f $cssNum, $safe)
    $rel = 'assets/css/' + $name
    [System.IO.File]::WriteAllText((Join-Path $cssDir $name), $r.Content, $utf8)
    $newTag = '<link' + $r.Attrs + ' rel="stylesheet" href="' + $rel + '">'
    $replacements.Add([pscustomobject]@{ Start = $r.Start; End = $r.End; Text = $newTag })
    $manifest.Add([pscustomobject]@{ type = 'style'; order = $cssNum; id = $id; file = $rel; chars = $r.Content.Length })
  }
}

for ($i = $replacements.Count - 1; $i -ge 0; $i--) {
  $x = $replacements[$i]
  $text = $text.Substring(0, $x.Start) + $x.Text + $text.Substring($x.End)
}

[System.IO.File]::WriteAllText($htmlPath, $text, $utf8)
$manifestPath = Join-Path $root 'build-manifest.json'
[System.IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 4), $utf8)
Write-Output ("scripts=" + $jsNum + " styles=" + $cssNum + " html_kb=" + [math]::Round((Get-Item $htmlPath).Length / 1KB, 1))
