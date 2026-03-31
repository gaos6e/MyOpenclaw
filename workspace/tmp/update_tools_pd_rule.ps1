$ErrorActionPreference = 'Stop'

$path = 'C:\Users\20961\.openclaw\workspace\TOOLS.md'
$text = Get-Content -Raw -Encoding UTF8 -LiteralPath $path

$needle = "## Tool gotchas`r`n- image 工具应直接读取 `C:\\Users\\20961\\.openclaw\\qqbot\\downloads` 下的绝对路径；不要为了识图再复制到 `C:\\Users\\20961\\.openclaw\\workspace`"
if ($text -notlike "*$needle*") {
  throw "Needle not found; TOOLS.md changed unexpectedly"
}

if ($text -match "默认不要把任何产物/清单/导出内容写入") {
  Write-Output "Already patched"
  exit 0
}

$insert = @"
## Tool gotchas
- image 工具应直接读取 `C:\Users\20961\.openclaw\qqbot\downloads` 下的绝对路径；不要为了识图再复制到 `C:\Users\20961\.openclaw\workspace`
- 默认不要把任何产物/清单/导出内容写入 `workspace\\PD` 或 `PD1`（那是哥哥～的项目目录）；只有当哥哥～明确说“放到PD/PD1”或在“询问PD相关内容”的上下文里，才允许写入。
  - 默认落地位置：`C:\Users\20961\.openclaw\workspace\\reports\\`（按主题分子目录）
"@

# Replace the first line block with inserted + keep following lines
$text2 = $text -replace [regex]::Escape("## Tool gotchas`r`n- image 工具应直接读取 `C:\Users\20961\.openclaw\qqbot\downloads` 下的绝对路径；不要为了识图再复制到 `C:\Users\20961\.openclaw\workspace`"), $insert.TrimEnd("`r","`n")

Set-Content -Encoding UTF8 -LiteralPath $path -Value $text2
Write-Output "Patched TOOLS.md"
