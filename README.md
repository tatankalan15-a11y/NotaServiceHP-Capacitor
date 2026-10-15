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
