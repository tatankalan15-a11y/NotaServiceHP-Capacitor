# Nota Service HP — Capacitor 7

Aplikasi nota servis HP: riwayat nota, status servis, PDF, ekspor CSV/JSON, kamera/galeri, kontak, berbagi file, dan cetak thermal (perlu uji printer fisik).

## Build APK melalui GitHub
1. Ekstrak ZIP ini di komputer/HP.
2. Buat repository GitHub baru.
3. Upload **isi folder** `NotaServiceHP-Capacitor` ke repository (bukan file ZIP-nya saja). Pastikan `.github/workflows/build-apk.yml` ikut ter-upload.
4. Buka tab **Actions** → **Build APK** → **Run workflow**.
5. Setelah workflow selesai, buka hasil run dan unduh artifact `NotaServiceHP-debug-apk`. Ekstrak artifact untuk mengambil `app-debug.apk`.

Jika GitHub web tidak menampilkan pilihan upload folder, buka repo → **Add file → Upload files**, lalu seret file/folder proyek yang sudah diekstrak. Untuk folder tersembunyi seperti `.github`, pastikan workflow ikut masuk; cara paling andal adalah memakai GitHub Desktop atau `git push`.

## Build lokal
Membutuhkan Node.js 20, JDK 21, dan Android SDK:
```sh
npm install --legacy-peer-deps
npm run android:add   # hanya pertama kali
npm run android:sync  # setelah perubahan kode
```

## Catatan penting
- Kode plugin Capacitor (Camera, Filesystem, Share, Contacts) sekarang dibundle dari package resmi Capacitor, bukan mengandalkan `Capacitor.Plugins`.
- Password/pola perangkat tidak ditampilkan di nota pelanggan dan tidak diekspor ke CSV/backup. Informasi yang sudah tersimpan di database lokal lama tidak otomatis terhapus.
- Izin Bluetooth di manifest bukan jaminan semua printer kompatibel. Plugin printer thermal adalah plugin Cordova pihak ketiga; uji pairing, cetak 58/80 mm, karakter, dan Android 12+ pada perangkat nyata sebelum dipakai harian.
- APK workflow adalah debug APK, bukan build rilis Play Store.
