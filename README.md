# Sift

An independent, offline Android studio for image/audio SVD and low-rank approximation. Open this folder in Android Studio. The folder remains named compressor; the installed app is Sift (dev.sift.rank).

## Run

Use scripts/build.ps1 to run the six math tests, bundle local assets, build the debug APK and run Android lint. Use scripts/build.ps1 -Test with one running Android emulator to run StudioTest. After instrumentation teardown, reinstall app/build/outputs/apk/debug/app-debug.apk if needed.

The Java 17 runtime is under %LOCALAPPDATA%/CompressorToolchain/java. Android SDK is under %LOCALAPPDATA%/Android/Sdk. The app requests no Internet or storage permissions. Android's document picker imports and saves chosen files.

## What it does

Import an image, audio clip or .svdc archive. Adjust retained rank; compare the reconstruction, energy, error and actual factor archive bytes. Export .svdc factors or reconstructed PNG/WAV. Images use up to 192px on their longest edge, composited on white. Audio uses up to the first eight seconds, resampled to 16 kHz mono in 128-sample rows.

Savings compare factor bytes with raw working pixels/PCM, not the original JPEG/MP3. Full rank quantized archives are not bit-exact originals. Energy is a matrix measure, not perceptual quality. Exported PNG/WAV may be larger than the original encoded file. The tool is educational, not a replacement for standard image/audio codecs.

## Branding and verification

Sift uses navy controls, clean white previews and neon teal rank controls throughout both photo and audio workspaces, with Space Grotesk headings and a matching ribbon S adaptive vector icon. Select file is centered above the preview; reconstructed media downloads sit directly below their output. Drag directly on the photo to compare, or focus the comparison with Tab and use arrow keys. Mode changes animate smoothly and respect reduced motion.

Six core tests pass. Android 9/API28 StudioTest passes: image/audio samples, rank-one/full-rank behavior, archive round trip, mathematical help/native Back, and no horizontal overflow at 320/360/412 CSS-pixel widths. Debug assembly and Android lint complete successfully; lint retains advisory SDK/toolchain warnings. Sift 1.2.2 is installed and launched successfully on the connected Xiaomi, including the S icon and centered mode control. Full flow verification used the Android 9 emulator. See docs/release-1.2.2.md for the current APK hash and evidence. Run scripts/test-built.ps1 after building both APKs to avoid running Gradle and the emulator together on a memory-constrained PC.

The Math button opens a dismissible popup. Hero artwork floats gently. The rank slider glows while adjusting, with teal retained-spectrum bars. Motion respects the device reduced-motion preference.

## About and original-photo preview (1.3.0)

About Sift is available in the footer and closes with Close, outside tap, Escape or Android Back. It explains offline processing, export behavior and processing limits.

Imported photos are displayed at their original intrinsic resolution on the reference side and in the initial preview, with no rank adjustment applied automatically. Move the rank slider or select a preset to generate the compressed working reconstruction. The reference remains full resolution. SVD processing and PNG exports still use a working copy up to 192px on the longest side; this is stated beneath the preview. Archives do not include the original full-resolution source. Exports become available once a rank has been applied.
