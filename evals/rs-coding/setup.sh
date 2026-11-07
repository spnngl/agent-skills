#!/bin/sh
# Creates one fresh working directory per prompt under <out>/p1 … <out>/p6.
# Usage: evals/rs-coding/setup.sh <out>
set -eu

here="$(cd "$(dirname "$0")" && pwd)"
out="$1"
[ ! -e "$out" ] || { echo "error: $out exists" >&2; exit 1; }
mkdir -p "$out"

commit() { git -C "$1" add -A && git -C "$1" -c user.name=eval -c user.email=eval@localhost commit -qm base; }

cargo new -q --vcs git --lib --name confy "$out/p1"
mkdir "$out/p2" && git init -q "$out/p2"
mkdir "$out/p3" && git init -q "$out/p3" && cp -R "$here/fixtures/p3/csrc" "$out/p3/"
cargo new -q --vcs git --lib --name pool "$out/p4"

# p5: the base commit, then the change under review left uncommitted.
cp -R "$here/fixtures/p5/base" "$out/p5"
git init -q "$out/p5" && commit "$out/p5"
cp -R "$here/fixtures/p5/change/." "$out/p5/"
git -C "$out/p5" add -N src/endpoint.rs

cargo new -q --vcs git --bin --name hello "$out/p6"
