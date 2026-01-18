# PowerShell wrapper
# Delegates to the robust Windows batch launcher (handles PATH issues + correct working dir)

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $scriptPath

& "$scriptPath\smart-book-translator.bat"
