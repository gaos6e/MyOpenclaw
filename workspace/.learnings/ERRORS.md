2026-03-18 | Remove lancedb folder | Attempted to remove C:\\Users\\20961\\.openclaw\\memory\\lancedb but path did not exist. Ignore.
2026-03-18 | powershell Where-Object syntax | Used .Name instead of $_.Name in PowerShell; command failed. Use $_.Name.
2026-03-18 | rg memorySearch quoting | PowerShell string terminator error while running rg. Use single quotes around pattern and escape paths.
2026-03-18 | rg not installed | ripgrep (rg) not found when searching docs. Use Select-String instead.
2026-03-18 | star-office-state json decode | Star-Office state file JSON invalid (extra data) when setting state. Consider fixing Star-Office-UI state file.
2026-03-18 | powershell Where-Object syntax | Used .FullName instead of .FullName when searching for tavily skill path. Use .FullName.
2026-03-18 | PowerShell quoting | String terminator error when running tavily_search.py due to quoting. Use here-string with escaped quotes.
2026-03-19 | PowerShell var assignment | Command started with = causing parse errors; use proper  assignment in here-string.
2026-03-19 | openclaw models set-image routes to qwen-portal | set-image auto-switched to qwen-portal/qwen3-vl-plus; avoid set-image when forcing DashScope qwen, edit openclaw.json + models.json instead.
2026-03-19 | PowerShell heredoc in Windows | Using python - <<'PY' caused PowerShell parse errors; use python -c or write a temp .py file.
2026-03-19 | PowerPoint COM visible flag | Setting Visible=false raised MsoTriState/cannot hide error; set Visible=1 for export.
2026-03-19 | image tool path restriction | Local image in qqbot\downloads not readable by image tool; copy to workspace before analysis.
2026-03-19 | openclaw skill --help hangs | Running `openclaw skill <name> --help` across skills hung without output; need per-skill targeted commands or timeout wrapper.
