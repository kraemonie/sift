$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $root
& npm.cmd install --no-audit --no-fund
if($LASTEXITCODE -ne 0){throw 'Compressor dependency installation failed'}
New-Item -ItemType Directory -Force -Path './gradle/wrapper' | Out-Null
foreach($name in @('gradlew','gradlew.bat','gradle/wrapper/gradle-wrapper.jar')){
 if(!(Test-Path -LiteralPath $name)){
  & curl.exe -fsSL --retry 2 --output $name ('https://raw.githubusercontent.com/gradle/gradle/v8.13.0/'+$name)
  if($LASTEXITCODE -ne 0){throw "Gradle wrapper download failed: $name"}
 }
}
& npm.cmd test
exit $LASTEXITCODE
