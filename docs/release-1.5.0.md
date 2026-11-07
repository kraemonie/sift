# Sift 1.5.0

Interface pass. The math, worker, archive format and exports are unchanged.

## Readability
- No text below 12px (11px only for tiny tags like PNG/WAV). Spectrum labels are 12px.
- Long notes now sit behind small "i" folds: "How to read these numbers" and "About this file".

## Layout
- Preview, rank controls and export are three separate cards. The download and share buttons sit directly below the rank slider.
- The full header remains visible: PHOTO + SOUND / LESS DATA, a two-line title, and floating photo/disc artwork.

## Dark theme
- Follows the phone setting. About Sift has an Appearance switch (Auto, Light, Dark).

## Feedback and extras
- A moving bar and a plain reason ("controls unlock when it's ready") while a file is analysed; elapsed seconds appear after 3 s. The bar is indeterminate, not a real percentage, because the worker does not report progress.
- Reset to Balanced button.
- Archive size bar against raw working data (turns amber when the archive is larger than raw).
- Share button for the reconstructed PNG/WAV (native Android share sheet; Web Share where the browser supports it; hidden otherwise).
- The last rank used is remembered as a share of the maximum and used as the starting rank for audio. Photos still open at original resolution with no rank applied (1.3.0 behaviour).

## Housekeeping
- About screen, build.gradle (versionCode 13) and README now agree on the version.
- README has screenshots (docs/screenshots).

## Native changes
MainActivity reports the system dark setting to the page, turns WebView force-dark off so it cannot double-darken, tints the WebView background in night mode, and adds shareFile with a FileProvider (manifest, res/xml/file_paths.xml, androidx.core dependency). The imported native changes were compiled locally and installed on the connected Xiaomi.

## Checked
- Web UI loaded in headless Chromium at 320, 360, 412, 390x844 and 1280x900: no console errors, no horizontal overflow, rank slider, Reset, size bar, theme switch, audio tab.
- Local validation: Gradle assembleDebug and lintDebug passed for the imported native changes. Subsequent layout corrections were rebuilt successfully; APK assets matched the source and installation succeeded on Xiaomi 12aed080.
- StudioTest and numerical tests were not rerun for this UI update.

## Follow-up
- Download button placed directly below the rank slider.
- About Sift is now a clear filled button with an icon.
- Dark mode: the floating photo frame and record in the header get light edges and a teal centre so they stand out.
