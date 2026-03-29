Option Explicit

Dim shell, env, cmd, root
Set shell = CreateObject("WScript.Shell")
Set env = shell.Environment("PROCESS")

root = "C:\Users\20961\.openclaw"
env("CODEX_HOME") = root & "\.codex-openclaw"
env("OPENCLAW_GATEWAY_PORT") = "18789"

cmd = """C:\Program Files\nodejs\node.exe"" " & _
      """C:\Users\20961\AppData\Roaming\npm\node_modules\openclaw\dist\index.js"" " & _
      "gateway --port 18789"

' 0 = hidden window, False = do not wait.
shell.CurrentDirectory = root
shell.Run cmd, 0, False
