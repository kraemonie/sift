$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$tools=Join-Path $env:LOCALAPPDATA 'CompressorToolchain'
New-Item -ItemType Directory -Force -Path $tools | Out-Null
if(!(Test-Path -LiteralPath "$tools/java")){
 & curl.exe -fL --retry 2 --output "$tools/java17.zip" 'https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse'
 if($LASTEXITCODE -ne 0){throw 'Java 17 download failed'}
 Expand-Archive -LiteralPath "$tools/java17.zip" -DestinationPath "$tools/java"
}
$javaHome=(Get-ChildItem -LiteralPath "$tools/java" -Directory | Select-Object -First 1).FullName
New-Item -ItemType Directory -Force -Path "$root/.gradle" | Out-Null
[System.IO.File]::WriteAllText("$root/.gradle/config.properties",'java.home='+$javaHome.Replace('\','/').Replace(':','\:')+"`n")
$sdk=Join-Path $env:LOCALAPPDATA 'Android/Sdk'
[System.IO.File]::WriteAllText("$root/local.properties",'sdk.dir='+$sdk.Replace('\','/').Replace(':','\:')+"`n")
Write-Output "Compressor Java: $javaHome"
