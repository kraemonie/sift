# Sift reference palette — 1.2.0

Sampled directly from the user's supplied image:
- Deep navy: #213448
- Muted blue: #547792
- Dusty blue: #94B4C1
- Warm cream: #EAE0CF

Both workspaces now share these colors. UI tokens are centralized at the top of web/app.css. The S monogram, native splash/system bars, SVG waveforms, spectrum, selection states, buttons and decorative media artwork match. Photo content itself is not recolored.

Darker text (#3F5D73) on cream has 5.31:1 contrast; light panel text (#B9CED4) on navy has 7.79:1; cream on navy has 9.74:1. A slightly lighter slate (#64869E) keeps the icon's secondary ribbon above 3:1 against navy. Surface/line tints stay within these hue families. Error red is reserved for errors.

Build/lint and JavaScript syntax checks passed. APK signature and bundled web hashes verified. Android WebView interaction checks passed and final native screenshots were inspected in Image and Audio modes (docs/sift-home.png and sift-audio.png). The current icon vector is docs/sift-icon-refined.svg. The v112 PNG is historical, from before this reference palette.

Current APK: Sift-debug.apk, versionName 1.2.0, versionCode 5
Size: 1,302,964 bytes
SHA256: 435B3AAC9939F12C6C9EE886ABE2B5B35DC4C54D7128841C13CE2A3DC54EBC45
Installed and launched successfully on Xiaomi 12aed080. The app remains independent and offline.
