# Sift implementation plan

**Goal:** Deliver a standalone working image/audio SVD tool and debug APK inside compressor/.

- [ ] Install pinned math/bundling dependencies; write failing numerical/format tests.
- [ ] Implement SVD factorization, reconstruction, validated .svdc codec and WAV export; prove tests pass.
- [ ] Build the independent image/audio interface and bundled worker with useful demos, import, comparison, rank controls and honest metrics.
- [ ] Create the independent Android Studio project, document picker and Save As bridge.
- [ ] Build/lint, test in the emulator, inspect screenshots, review/fix and deliver the independent APK with instructions.

Scope decisions: Android inferred from the explicitly requested Test Android Apps plugin; both image and audio are implemented. Public SVD library is bundled locally; media never leaves the device. Numerical rank and retained rank are distinct. Shared machine SDK/Java tools are permitted infrastructure, never app-source dependencies.
