Option Explicit

Dim cmd, cmdExe, env, gatewayCmd, quote, root, shell
Set shell = CreateObject("WScript.Shell")
Set env = shell.Environment("PROCESS")

root = "C:\Users\20961\.openclaw"
env("CODEX_HOME") = root & "\.codex-openclaw"
env("OPENCLAW_GATEWAY_PORT") = "18789"

cmdExe = shell.ExpandEnvironmentStrings("%SystemRoot%\System32\cmd.exe")
gatewayCmd = root & "\gateway.cmd"
quote = Chr(34)
cmd = quote & cmdExe & quote & " /c " & quote & gatewayCmd & quote

' 0 = hidden window, False = do not wait.
shell.CurrentDirectory = root
shell.Run cmd, 0, False
