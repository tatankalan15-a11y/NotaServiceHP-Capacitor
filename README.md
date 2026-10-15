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

## Preview thermal
- Preview kini memakai pembangun teks yang sama dengan cetak asli (detail perbaikan, garansi, rincian, DP/sisa, catatan estimasi ikut tampil).
- Tombol **🖨️ Cetak via Bluetooth** tersedia langsung di jendela preview.

## Klaim Garansi, Menunggu Sparepart, Nota Penjualan
- **🛡️ Klaim Garansi**: tombol di atas form. Isi No. Nota asal (nomor nota tahap mana pun) atau No. HP lalu tekan **Cek**: data pelanggan terisi dan status garansi (sisa hari / habis) ditampilkan. Klaim berjalan lewat alur biasa (Terima > Diagnosa > Selesai > Ambil), ditandai di nota dan laporan.
- **Garansi (hari)** kini ada di tahap Selesai (dan Servis Langsung). Garansi dihitung dari tanggal unit diambil, dan tercetak di nota Ambil.
- **Diagnosa**: status baru *Menunggu Sparepart* dan *Sedang Dikerjakan*; tombol **🔄 Update Status / Sparepart** pada nota diagnosa membuat catatan baru di timeline tanpa mengulang data. Laporan menghitung servis yang menunggu sparepart.
- **🛍️ Nota Penjualan**: daftar barang (nama, jumlah, harga, modal), total dan modal dihitung otomatis, satu nota langsung lunas dan terkunci. Nama pelanggan dan nomor HP opsional (bawaan "Pelanggan Umum").
- Laporan Keuangan memisahkan hitungan servis, penjualan, dan klaim; CSV laporan punya kolom Jenis.

## Pembukuan lengkap (Laporan & Pembukuan)
Menu Riwayat > **📈 Laporan & Pembukuan**. Periode bisa **Harian / Bulanan / Tahunan**.
- **Laba / Rugi**: omzet, modal, laba kotor, pengeluaran operasional, dan **laba bersih**.
- **Pengeluaran**: catat sewa, listrik/internet, gaji, transport, pulsa/alat kerja, lain-lain, dan **Beli Stok/Sparepart** (tanggal, jumlah, metode bayar). Bisa dihapus. Ikut Backup/Restore.
  - "Beli Stok/Sparepart" hanya masuk arus kas dan **tidak mengurangi laba**, karena modalnya sudah dicatat di tiap nota (menghindari hitung ganda).
- **DP servis batal**: pilih *Refund* (keluar dari kas, tidak mempengaruhi laba) atau *Hangus* (jadi pendapatan toko).
- **Arus Kas**: kas masuk/keluar menurut **tanggal uang diterima** (DP dihitung saat DP dibayar, pelunasan saat unit diambil), plus rekap saldo per metode **Tunai / Transfer / QRIS** untuk dicocokkan dengan laci dan rekening.
- **Piutang / servis berjalan**: daftar servis yang belum diambil beserta DP dan sisa tagihan.
- **Ekspor**: Laporan PDF periode terpilih, Buku Kas CSV (dengan saldo berjalan), dan CSV per servis.
- Catatan: metode bayar DP dianggap sama dengan metode pelunasan karena nota hanya menyimpan satu metode bayar.
- Database pada versi dasar naik ke versi 9 (store baru `pengeluaran`).

## Pembaruan pembukuan lanjutan (Tahap 1–3)

Versi kerja ini menambahkan modul lokal berikut:

- **Buku pembayaran terpisah**: tanggal, ID servis, nominal, metode (Tunai/Transfer/QRIS/Lain-lain), pembayaran masuk/refund, dan transaksi pembalik untuk koreksi. Pembayaran manual masuk ke buku kas dan perhitungan sisa tagihan apabila `serviceId` cocok dengan ID servis yang tercatat.
- **Saldo awal** per Tunai, Transfer, QRIS, dan Lain-lain. Nilai disimpan lokal dan ikut backup.
- **Persediaan sparepart terintegrasi**: master SKU/nama/kategori/supplier, stok, modal, harga jual, batas minimum, nilai stok, pergerakan masuk/keluar/koreksi, dan riwayat 30 pergerakan terakhir. Penjualan nota otomatis mengurangi stok bila nama barang atau SKU cocok persis dengan master. Untuk pemakaian servis, gunakan form barang keluar dan masukkan ID nota; catatan sparepart di teks diagnosis juga dicocokkan secara otomatis saat servis selesai bila nama cocok persis.
- **Audit log** untuk simpan/perbarui nota, pembayaran, koreksi pembayaran, perubahan saldo awal, stok, pengeluaran, dan gabung backup.
- **Pengingat backup** saat aplikasi dibuka apabila belum ada backup selama 7 hari; backup lengkap mencakup nota, pengeluaran, pembayaran, inventori, audit, dan saldo awal. Android akan meminta pengguna menyimpan/membagikan file, tidak mengunggah diam-diam.
- **Pengingat servis berjalan**: panel menampilkan servis berjalan, umur servis, dan sisa estimasi.
- **Pemindahan data antarperangkat**: backup lengkap dapat digabung melalui impor pada perangkat kedua; data dengan ID sama diperbarui. Buat backup dahulu sebelum menggabungkan.
- **IndexedDB v11**: menambah store `pembayaran`, `inventori`, `mutasi_stok`, dan `audit` tanpa menghapus store nota/pengeluaran lama. Upgrade database mempertahankan store yang sudah ada.

### Batasan yang harus diketahui

1. Sinkronisasi otomatis real-time antar-HP **belum aktif**. UI menyimpan konfigurasi URL/key Supabase sebagai persiapan saja; belum ada autentikasi, API sinkronisasi, konflik data, atau kebijakan akses yang aman. Jangan menganggap pengisian URL/key sebagai sinkronisasi aktif dan jangan pernah memasukkan `service_role` key di aplikasi.
2. Backup otomatis ke cloud belum tersedia; aplikasi hanya memberi pengingat dan membuka dialog berbagi/menyimpan backup. Pengunggahan ke Drive perlu dilakukan pengguna atau diintegrasikan dengan provider OAuth yang aman.
3. Pengingat servis saat ini tampil di dalam aplikasi ketika dibuka, bukan notifikasi Android terjadwal di latar belakang.
4. Buku pembayaran baru tidak mengubah otomatis status workflow servis. Untuk menghubungkan pembayaran, masukkan ID servis yang sama persis dengan ID pada riwayat. Data nota lama tanpa entri buku pembayaran tetap menggunakan perhitungan DP/pelunasan lama.
5. Inventori terhubung dengan transaksi stok masuk/keluar. Stok penjualan nota berkurang otomatis hanya jika nama barang/SKU pada nota cocok persis dengan master inventori dan stok cukup. Untuk servis, gunakan form barang keluar dengan ID nota yang sama; pencocokan otomatis dari teks sparepart hanya bekerja jika nama item tepat sama. Stok tidak akan menjadi negatif. Modal barang yang dipakai pada servis belum otomatis mengubah total/modal pada nota, jadi tetap periksa kolom modal servis. Saat mencatat pembelian melalui form inventori, pengeluaran kategori `Beli Stok/Sparepart` dibuat otomatis; jangan mencatat pembelian yang sama lagi di menu pengeluaran agar tidak menggandakan arus kas.
6. Build APK belum berhasil diverifikasi dalam lingkungan ini karena dependensi npm (termasuk `html2canvas`) belum tersedia dan `npm install` tidak selesai. Jalankan `npm install`, lalu `npm run build:web` dan verifikasi workflow GitHub Actions sebelum dipakai produksi.

### Tes sebelum dipakai untuk transaksi nyata

- Backup, lalu restore di instalasi uji dan pastikan nota/pengeluaran/pembayaran/stok/audit kembali.
- Catat DP, pembayaran tambahan, dan pelunasan sebagai transaksi terpisah dengan ID servis yang sama; pastikan buku kas tidak menggandakan transaksi legacy.
- Catat pembayaran dengan metode berbeda dan cocokkan total Tunai/Transfer/QRIS dengan uang/rekening nyata.
- Uji transaksi pembalik pembayaran dan pastikan audit menyimpan jejak transaksi asal.
- Uji upgrade dari database lama ke IndexedDB v10 pada salinan data terlebih dahulu.


### Pembaruan inventaris terintegrasi

- Form master item menerima nama, SKU, kategori, supplier, stok, modal/unit, harga jual, batas minimum, tanggal masuk, jenis stok masuk, dan metode pembayaran.
- Pilih **Pembelian baru** untuk membuat mutasi stok masuk sekaligus catatan pengeluaran `Beli Stok/Sparepart`; pilih **Stok awal/migrasi** untuk memasukkan saldo stok tanpa mencatat kas keluar.
- Penjualan dari nota otomatis mengurangi stok hanya untuk item yang cocok persis berdasarkan SKU/nama. Jika tidak cocok atau stok kurang, nota tetap disimpan dan aplikasi menampilkan peringatan agar stok diperiksa.
- Pemakaian servis, kerusakan/kehilangan, dan barang keluar lain dicatat lewat form barang keluar. Pemakaian servis memerlukan ID nota sebagai referensi.
- Penyesuaian stok memerlukan alasan dan dicatat pada kartu stok serta audit log. Stok negatif ditolak.
- Backup lengkap mencakup master inventori dan `mutasiStok`; impor gabung memulihkan kedua jenis data tersebut.
- Batasan: belum ada retur pembelian otomatis, hutang supplier, barcode scanner, pemakaian multi-item langsung dari form servis, atau penyesuaian modal nota otomatis. Lakukan uji coba dengan data salinan sebelum penggunaan produksi.
