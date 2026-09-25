#!/bin/bash
# Lists hard-coded colors, font families/sizes and radii in view code, so each design PR can prove
# its screens only use `constants/Theme.ts` tokens (mirrors mobile-seller's check of the same name).
# Usage: pnpm design:check [paths...] (defaults to app/ and components/). Exit code 1 when
# anything is found. A radius written as half the element's own size (`56 / 2`) is geometry, not
# a token, and is skipped.
cd "$(dirname "$0")/.." || exit 2
[ $# -eq 0 ] && set -- app components
pattern="['\"]#[0-9A-Fa-f]{3,8}['\"]|rgba?\(|fontFamily:|fontSize: *[0-9]|borderRadius: *[0-9]"
matches=$(git grep --untracked -n -E "$pattern" -- "$@" ':(exclude)constants/Theme.ts' ':(exclude)**/__tests__/**' \
    | grep -E '^[^:]+\.(tsx?|jsx?):' | grep -v -E '^[^:]+:[0-9]+: *//' \
    | grep -v -E 'borderRadius: *[0-9]+ */ *2,?$')
[ -z "$matches" ] && exit 0
echo "$matches"
exit 1
