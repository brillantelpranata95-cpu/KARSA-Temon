#!/usr/bin/env bash
#
# Deploy manual KARSA + GRAHA ke Firebase Hosting.
#
# KENAPA MANUAL: CI (.github/workflows/deploy.yml) DINONAKTIFKAN karena akan
# menghapus /graha dari produksi — source GRAHA ada di luar repo ini sehingga CI
# tidak bisa membangunnya. Lihat deploy.yml.disabled untuk penjelasan lengkap.
#
# URUTAN ITU PENTING dan tidak boleh ditukar:
#   1. GRAHA dibangun dengan base /graha/  -> disalin ke KARSA/public/graha
#   2. KARSA dibangun (menyalin public/ -> dist/, termasuk graha)
#   3. Baru deploy. Kalau langkah 1-2 dilewat, /graha HILANG dari produksi.
#   4. GRAHA dibangun ULANG dengan base / untuk alias graha-temon.web.app,
#      lalu di-deploy ke site terpisah. Build ini TIDAK boleh dipakai untuk /graha.
#
# Pakai:  bash deploy.sh          (KARSA + GRAHA SSO + alias)
#         bash deploy.sh sso      (hanya KARSA + GRAHA SSO)
#         bash deploy.sh alias    (hanya alias graha-temon)
set -euo pipefail

BASE=/d/Temon
KARSA=$BASE/KARSA-Temon
GRAHA=$BASE/Graha-Temon
TARGET=${1:-semua}

# Jumlah SVG ikon yang diharapkan ada di setiap public/koboyo
IKON_MINIMAL=74

periksa_bersih() {
  # Berkas scratch (mis. daftar nama ikon) JANGAN sampai tayang: apa pun di public/
  # akan disalin ke dist/ dan disajikan ke internet.
  local dir=$1
  local nakal
  nakal=$(find "$dir" -type f ! -name '*.svg' 2>/dev/null | wc -l)
  if [ "$nakal" -ne 0 ]; then
    echo "!! ADA $nakal berkas NON-SVG di $dir — periksa dulu:"
    find "$dir" -type f ! -name '*.svg'
    exit 1
  fi
}

periksa_ikon() {
  local dir=$1
  local n
  n=$(find "$dir" -name '*.svg' 2>/dev/null | wc -l)
  if [ "$n" -lt "$IKON_MINIMAL" ]; then
    echo "!! Ikon kurang di $dir: hanya $n (harusnya $IKON_MINIMAL)"
    exit 1
  fi
  echo "   ikon OK: $n svg di $dir"
}

deploy_sso() {
  echo
  echo "=== 1/3  GRAHA build base /graha/ ==="
  cd "$GRAHA"
  VITE_BASE=/graha/ npm run build 2>&1 | tail -2
  periksa_bersih "$GRAHA/dist/koboyo"
  periksa_ikon "$GRAHA/dist/koboyo"

  echo
  echo "=== 2/3  Salin ke KARSA/public/graha lalu build KARSA ==="
  rm -rf "$KARSA/public/graha"
  cp -r "$GRAHA/dist" "$KARSA/public/graha"
  periksa_bersih "$KARSA/public/graha/koboyo"

  cd "$KARSA"
  npm run build 2>&1 | tail -2
  periksa_bersih "$KARSA/dist/koboyo"
  periksa_bersih "$KARSA/dist/graha/koboyo"
  periksa_ikon "$KARSA/dist/koboyo"
  periksa_ikon "$KARSA/dist/graha/koboyo"

  echo
  echo "=== 3/3  Deploy KARSA (termasuk /graha) ==="
  firebase login:use projectetcetera957@gmail.com >/dev/null 2>&1 || true
  firebase deploy --only hosting --project karsa-temon --non-interactive 2>&1 | tail -3
}

deploy_alias() {
  echo
  echo "=== GRAHA build base ROOT (untuk alias graha-temon.web.app) ==="
  cd "$GRAHA"
  npm run build 2>&1 | tail -2
  periksa_bersih "$GRAHA/dist/koboyo"
  periksa_ikon "$GRAHA/dist/koboyo"

  echo
  echo "=== Deploy alias graha-temon ==="
  firebase login:use projectetcetera957@gmail.com >/dev/null 2>&1 || true
  firebase deploy --only hosting:graha-temon --project karsa-temon --non-interactive 2>&1 | tail -3
}

case "$TARGET" in
  semua) deploy_sso; deploy_alias ;;
  sso)   deploy_sso ;;
  alias) deploy_alias ;;
  *) echo "Pakai: bash deploy.sh [semua|sso|alias]"; exit 1 ;;
esac

echo
echo "=== SELESAI ==="
echo "Periksa:"
echo "  https://karsa-temon.web.app            (KARSA)"
echo "  https://karsa-temon.web.app/graha      (GRAHA, SSO)"
echo "  https://graha-temon.web.app            (alias, tanpa SSO)"
echo
echo "Uji cepat ikon (harus mengembalikan <svg>, bukan index.html):"
echo "  curl -s https://karsa-temon.web.app/koboyo/fire.svg | head -c 60"
