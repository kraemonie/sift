$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$adb=Join-Path $env:LOCALAPPDATA 'Android/Sdk/platform-tools/adb.exe'
$serial='emulator-5556'
if(-not ((& $adb devices) -match '^emulator-5556\s+device')){
 Start-Process -FilePath (Join-Path $env:LOCALAPPDATA 'Android/Sdk/emulator/emulator.exe') -ArgumentList @('-avd','Atmos_Light_API_28','-port','5556','-no-window','-no-audio','-no-boot-anim','-no-snapshot','-memory','768','-cores','2','-gpu','swiftshader') -WindowStyle Hidden -RedirectStandardOutput "$root/docs/emulator.log" -RedirectStandardError "$root/docs/emulator-errors.log"
}
$booted=$false
for($attempt=0;$attempt -lt 60;$attempt++){if((& $adb -s $serial shell getprop sys.boot_completed 2>$null) -match '1'){$booted=$true;break};Start-Sleep -Seconds 2}
if(!$booted){throw 'Emulator did not boot'}
& $adb -s $serial shell input keyevent 82
& $adb -s $serial install -r "$root/app/build/outputs/apk/debug/app-debug.apk"
if($LASTEXITCODE -ne 0){throw 'App install failed'}
& $adb -s $serial install -r "$root/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk"
if($LASTEXITCODE -ne 0){throw 'Test install failed'}
$evidence=(& $adb -s $serial shell am instrument -w -r -e class dev.sift.rank.StudioTest dev.sift.rank.test/androidx.test.runner.AndroidJUnitRunner | Out-String)
Set-Content -LiteralPath "$root/docs/emulator-test.txt" -Value $evidence
Write-Output $evidence
if($evidence -notmatch 'OK \(1 test\)'){throw 'Android flow did not pass'}
& $adb -s $serial shell am start -W -n dev.sift.rank/.MainActivity
$appProcess=(& $adb -s $serial shell pidof dev.sift.rank).Trim()
if(!$appProcess){throw 'Sift did not launch'}
& $adb -s $serial forward tcp:9238 "localabstract:webview_devtools_remote_$appProcess"
& node "$root/scripts/qa-webview.cjs" 9238 $serial
if($LASTEXITCODE -ne 0){throw 'Direct interaction checks failed'}
