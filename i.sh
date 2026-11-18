#!/bin/sh
d="$HOME/.dh"; rm -rf "$d"; mkdir -p "$d"
for f in manifest.json inject.js; do curl -fsSL "https://raw.githubusercontent.com/VineetKamath/dh/main/ext/$f" -o "$d/$f"; done
echo "Installed to $d. In Chrome: Developer mode > Load unpacked > select $d"
