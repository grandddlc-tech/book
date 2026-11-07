#!/bin/sh
# Wraps src/page.html (the artifact page) into a standalone index.html.
cd "$(dirname "$0")"
{ printf '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0a0912"></head><body>\n'; cat src/page.html; printf '\n</body></html>\n'; } > index.html
