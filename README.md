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

## Kirim gambar nota langsung ke WhatsApp pelanggan
Tombol **WA Gambar** memakai plugin native `WhatsAppShare` (`scripts/native/WhatsAppSharePlugin.java`).
Plugin ini disalin ke proyek Android dan didaftarkan di `MainActivity` otomatis oleh `scripts/patch-android.js`
(jalan di workflow GitHub setelah `npx cap add android`). Chat pelanggan terbuka dengan gambar siap kirim;
tombol kirim tetap ditekan manual. Jika WhatsApp tidak terpasang, aplikasi kembali memakai menu bagikan biasa.
Fitur ini memakai extra `jid` yang tidak resmi didokumentasikan WhatsApp, jadi uji di HP sebelum dipakai harian.

## Nota Servis Langsung & Laporan Keuangan
- Tombol **⚡ NOTA SERVIS LANGSUNG**: untuk servis yang selesai dan langsung diambil (satu nota, tanpa tahap terima/diagnosa/selesai/ambil). Berisi detail perbaikan, sparepart, garansi (hari), modal, dan metode bayar. Nota langsung terkunci dan dianggap lunas.
- **📈 Laporan Keuangan** (menu Riwayat): omzet, modal, laba kotor, DP batal, dan servis berjalan per bulan. Satu servis dihitung satu kali.
- Cetak thermal (dan preview thermal) kini memuat detail perbaikan, sparepart, garansi, dan metode bayar untuk nota langsung; detail perbaikan/diagnosa juga untuk nota selesai/diagnosa.
- Tombol **Simpan Kontak** menyimpan langsung ke phone book (cek duplikat); jika gagal, memakai menu bagikan.

## Kolom wajib
Hanya 4 kolom wajib: **Nama, Merek, Model, Keluhan**. Selain itu opsional (Nomor HP boleh kosong, tetapi jika diisi harus berformat 08xx; tanpa nomor, tombol WhatsApp dan simpan kontak tidak bisa dipakai).
Nama, Merek, Model otomatis berhuruf kapital di awal kata (kata yang sudah memuat huruf besar seperti iPhone atau NFC tidak diubah).

## Update aplikasi tanpa uninstall
- `keystore/debug.keystore` adalah kunci tanda tangan **tetap**; workflow menyalinnya ke runner sebelum build, sehingga semua APK berikutnya bertanda tangan sama.
- `versionCode` otomatis naik di setiap build (`scripts/patch-android.js`).
- Hasilnya: APK baru bisa dipasang **di atas** versi lama dan data nota tetap ada. Syaratnya: file `keystore/debug.keystore` jangan diganti/dihapus dari repository.
- Pemasangan pertama dengan kunci ini tetap memerlukan uninstall APK lama (kuncinya berbeda). **Backup dulu** lewat menu Backup di aplikasi, lalu Restore setelah pasang.
- Sebaiknya repository dibuat **Private**, karena kunci ini ikut tersimpan di dalamnya.

## Estimasi biaya di Diagnosa
- Label biaya mengikuti tahap: **Estimasi Biaya** (Terima, Diagnosa) dan **Biaya Akhir** (Selesai, Ambil, Langsung), termasuk di preview, PDF, WhatsApp, dan cetak thermal.
- Diagnosa punya kolom **Harga Sparepart** dan **Biaya Jasa**; total estimasi dihitung otomatis (masih bisa diubah manual).
- Status baru **Disetujui Pelanggan** (tercatat di timeline).
- Nota diagnosa memuat catatan "estimasi dapat berubah".
- Saat membuat nota Selesai/Ambil dengan biaya berbeda dari estimasi diagnosa, muncul konfirmasi, dan estimasi awal ditampilkan di nota.

## Format nomor & WhatsApp Business
- Nomor boleh diketik/ditempel sebagai `+62 895-3380-1234`, `62895...`, `0895...`, atau `895...`; otomatis menjadi `0895...` (9-14 digit).
- Pengaturan > **Aplikasi WhatsApp untuk kirim gambar**: Otomatis, WhatsApp Business, atau WhatsApp biasa. Pesan teks (wa.me) dibuka oleh aplikasi WhatsApp bawaan HP.
