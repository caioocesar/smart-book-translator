# PowerShell silent launcher wrapper
# Delegates to launch.bat (minimized windows + robust PATH handling)

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $scriptPath

& "$scriptPath\launch.bat"

