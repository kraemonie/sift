# Sift — independent Android app

## Intent
An offline image/audio compression studio for understanding SVD and low-rank approximation. Everything belonging to the new app lives in compressor/. Distinct brand, package dev.sift.rank, visual design, sources, assets, and APK. It does not import or modify the containing project's app.

## Approach
Bundle a responsive local interface into its own Android Studio project. Use tested ml-matrix SVD in a background worker so the rank slider stays responsive. Native Android handles document import and explicit Save As export. No Internet or storage permissions.

## Product
- Image and Audio workspaces, built-in useful samples, user imports, rank slider and presets.
- Image split comparison, audio waveform/listening comparison, singular-value spectrum and energy retention.
- Real downloadable .svdc factor archives with quantized 16-bit U/V and float32 singular values; reload those archives. Reconstructed PNG and WAV are separate exports with actual measured byte sizes.
- Display original encoded file bytes, working raw bytes, archive bytes, retained rank, numerical rank and reconstruction quality separately. A factor archive or PNG can exceed the source JPEG/MP3; never imply rank guarantees encoded-file savings.
- Bound image working resolution to 192px longest edge; alpha is composited on white. Audio uses the first 8 seconds, resampled to 16kHz mono, arranged into 128-sample matrix rows. Explain these transformations visibly.
- Independent graphite/ivory/mint design, crisp vector marks, readable labels, compact mobile layout, dark/light accessible contrast and reduced-motion support.

## Verification
Known matrices, zero/rank-one/wide/tall cases, monotonic error/energy, malformed archives, factor round trips, WAV headers, imported media and real Android file picking/export paths. Check image/audio switching, rank interaction, no horizontal overflow at phone widths, offline operation and native Back. Render screenshots and inspect before delivering the APK.
