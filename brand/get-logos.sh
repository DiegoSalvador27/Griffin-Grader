#!/usr/bin/env bash
# Downloads the Ernest Manning logos used by Griffin Grader into this folder.
# Run from anywhere:  bash brand/get-logos.sh
set -euo pipefail
cd "$(dirname "$0")"

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"

# School crest from the official EMHS website header.
# Note: the URL ends in .svg but the file is actually a PNG (134x140).
if [ ! -s emhs-crest.png ]; then
  curl -fsSL -A "$UA" -o emhs-crest.png "https://ernestmanning.cbe.ab.ca/images/826-logo.svg" \
    && echo "Saved emhs-crest.png" || echo "Could not download the crest"
fi

# EM + Griffin athletics mark from the EMHS Hudl page (225x225 JPEG).
if [ ! -s em-griffin-athletics.jpg ]; then
  curl -fsSL -A "$UA" -o em-griffin-athletics.jpg "https://static.hudl.com/users/temp/2179796_e32872a68616465f822e1d47232eed4f.jpg" \
    && echo "Saved em-griffin-athletics.jpg" || echo "Could not download the athletics mark"
fi

ls -la
