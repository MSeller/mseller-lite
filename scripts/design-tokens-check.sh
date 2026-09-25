#!/bin/bash
# Lists hard-coded colors, font families/sizes and radii in view code, so each design PR can prove
# its screens only use `constants/Theme.ts` tokens (mirrors mobile-seller's check of the same name).
# Usage: pnpm design:check [paths...] (defaults to app/ and components/). Exit code 1 when
# anything is found. A radius written as half the element's own size (`56 / 2`) is geometry, not
# a token: that expression is ignored, but the rest of its line is still checked.
cd "$(dirname "$0")/.." || exit 2
[ $# -eq 0 ] && set -- app components
# Hex in any quote style, `${color}14`-style alpha suffixes, rgb()/rgba(), font families, numeric
# font sizes, and numeric radii including per-corner ones (borderTopLeftRadius…).
pattern="['\"\`]#[0-9A-Fa-f]{3,8}['\"\`]|\\\$\{[^}]+\}[0-9A-Fa-f]{2}\`|rgba?\(|fontFamily:|fontSize: *[0-9]|[A-Za-z]*Radius: *[0-9]"
geometry='[A-Za-z]*Radius: *[0-9]+ */ *2([^0-9.]|$)'
matches=$(git grep --untracked -n -E "$pattern" -- "$@" ':(exclude)constants/Theme.ts' ':(exclude)**/__tests__/**' \
    | grep -E '^[^:]+\.(tsx?|jsx?):' | grep -v -E '^[^:]+:[0-9]+: *//' \
    | while IFS= read -r hit; do
        code=${hit#*:*:}
        printf '%s\n' "$code" | sed -E "s#$geometry##g" | grep -q -E "$pattern" && printf '%s\n' "$hit"
      done)
[ -z "$matches" ] && exit 0
echo "$matches"
exit 1
