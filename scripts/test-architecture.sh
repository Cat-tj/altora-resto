#!/usr/bin/env bash
# Menjalankan seluruh file test-support/src/architecture/*.test.ts.
#
# File-file ini BUKAN suite vitest - masing-masing adalah skrip Node polos
# yang membaca prisma/schema/schema.prisma dan/atau tipe Prisma Client secara
# statis (tidak butuh koneksi database), dijalankan lewat
# `node --experimental-strip-types` (lihat ADR-030 dan
# docs/engineering/CORRECTION-LOOP-STATUS.md). Tidak ada satu runner bawaan
# untuk "jalankan semuanya sekaligus" sampai skrip ini ditambahkan
# (ADR-043, batch CI).
#
# Catatan versi Node: `--experimental-strip-types` butuh Node >= 22.6 - lihat
# ADR-043 untuk diskusi mismatch dengan `engines.node` (">=20.0.0") di
# package.json root.
set -euo pipefail
cd "$(dirname "$0")/.."

shopt -s nullglob
files=(packages/test-support/src/architecture/*.test.ts)
if [ ${#files[@]} -eq 0 ]; then
  echo "test:architecture - tidak ada file *.test.ts ditemukan di packages/test-support/src/architecture/" >&2
  exit 1
fi

for f in "${files[@]}"; do
  echo "== $f"
  node --experimental-strip-types "$f"
done

echo "test:architecture - ${#files[@]} file lulus."
