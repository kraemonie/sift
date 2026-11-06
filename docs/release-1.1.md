# Sift 1.1.0 — media studio revision

- Photo darkroom styling and violet music studio styling, with Space Grotesk headings.
- Large centered Select file control. Download image/audio immediately below the active output; factor archive saving stays beside rank controls.
- The math button uses a vector matrix icon. Other actions use SVG icons.
- Sliding mode highlight, cancellable fade/slide transition, reduced-motion handling and rapid-toggle guards.
- Direct pointer/touch comparison on the image; no bottom comparison bar. A hidden native range retains keyboard/screen-reader control. Pointer release updates the final position.
- Audio waveforms use SVG to avoid the canvas painting issue seen in the old Android WebView during visual QA.
- User selected Lens & Wave from the four concept options and requested a tweak. Applied a refined native adaptive vector icon with rounded viewfinder corners, smooth audio wave, cream/charcoal/terracotta colors and safe mask margins. Header mark matches. Refined vector preview: docs/sift-icon-refined.svg.

Verification: six unchanged core tests passed; Android 9 StudioTest passed (image/audio, rank extremes, help/Back, archive round trip, 320/360/412 widths). Additional ADB/WebView QA passed direct photo drag, native arrow keys, centered 64px picker, output download placement, overflow, rapid toggles and reduced-motion handling. Native screenshots were inspected, including visible SVG waveforms. Final icon/header-only changes built and linted successfully. Emulator System UI stalled when Gradle and emulator competed for memory; running the already-built tests after Gradle exited resolved it. CDP screenshot capture omitted GPU canvas layers, so final screenshots use native screencap.

Deliverable: Sift-debug.apk
Size: 1330194 bytes
SHA256: D5FDE078468A658E7A630224358A99F577C8FAD46CA4DD79BB12C8C74207B9F5
Updated successfully on connected Xiaomi 12aed080. Compression core, file-format limits and offline behavior are unchanged.
