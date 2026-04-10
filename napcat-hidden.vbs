Option Explicit

Dim shell, quote, napcatExe, cmd
Set shell = CreateObject("WScript.Shell")

quote = Chr(34)
napcatExe = "C:\Users\20961\AppData\Local\NapCatFramework\NapCat.44498.Shell\NapCatWinBootMain.exe"

cmd = quote & napcatExe & quote

' 0 = hidden window, False = do not wait.
shell.CurrentDirectory = "C:\Users\20961\AppData\Local\NapCatFramework\NapCat.44498.Shell"
shell.Run cmd, 0, False
