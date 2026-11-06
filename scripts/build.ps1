param([switch]$Test)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$env:JAVA_HOME=(Get-ChildItem -LiteralPath "$env:LOCALAPPDATA/CompressorToolchain/java" -Directory | Select-Object -First 1).FullName
$env:ANDROID_HOME=Join-Path $env:LOCALAPPDATA 'Android/Sdk'
Set-Location -LiteralPath $root
& npm.cmd test
if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
& npm.cmd run bundle
if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
if($Test){& ./gradlew.bat connectedDebugAndroidTest --console=plain}else{& ./gradlew.bat assembleDebug lintDebug --console=plain}
exit $LASTEXITCODE
