#!/usr/bin/env bash
# Menjalankan file test-support/src/database-integration/*.test.ts.
#
# File-file ini BUKAN suite vitest - masing-masing adalah skrip `tsx` polos
# yang konek ke Postgres NYATA lewat DATABASE_URL (dari process.env atau
# .env, lihat packages/test-support/src/database-integration/_pg-helper.ts).
# Tidak ada satu runner bawaan untuk "jalankan semuanya sekaligus" sampai
# skrip ini ditambahkan (ADR-043, batch CI).
#
# Argumen opsional #1: pola egrep untuk memfilter nama file (dipakai job CI
# `concurrency-tests`/`security-tests`/`migration-invariant-verification`
# untuk menjalankan SUBSET file yang sama secara logis, bukan direktori
# terpisah - lihat ADR-043 keputusan pengelompokan logis-vs-fisik). Tanpa
# argumen, menjalankan SEMUA file (dipakai job `database-integration-tests`).
set -euo pipefail
cd "$(dirname "$0")/../packages/test-support"

PATTERN="${1:-.}"

shopt -s nullglob
all_files=(src/database-integration/*.test.ts)
files=()
for f in "${all_files[@]}"; do
  if [[ "$f" =~ $PATTERN ]]; then
    files+=("$f")
  fi
done

if [ ${#files[@]} -eq 0 ]; then
  echo "test:database-integration - tidak ada file cocok pola '$PATTERN' di src/database-integration/" >&2
  exit 1
fi

for f in "${files[@]}"; do
  echo "== $f"
  ./node_modules/.bin/tsx "$f"
done

echo "test:database-integration - ${#files[@]} file lulus (pola: '$PATTERN')."
