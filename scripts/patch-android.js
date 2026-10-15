// Menambahkan permission Android yang dibutuhkan (aman dijalankan berulang).
const fs = require('fs');
const path = require('path');
const f = path.join(__dirname, '..', 'android/app/src/main/AndroidManifest.xml');
if (!fs.existsSync(f)) throw new Error('AndroidManifest.xml tidak ditemukan. Jalankan npx cap add android terlebih dahulu.');
let x = fs.readFileSync(f, 'utf8');
const permissions = [
  '<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />',
  '<uses-permission android:name="android.permission.CAMERA" />',
  '<uses-permission android:name="android.permission.READ_CONTACTS" />'
];
const missing = permissions.filter(p => !x.includes(p.match(/android:name="([^"]+)"/)[1]));
if (missing.length) {
  if (!x.includes('<application')) throw new Error('Tag <application> tidak ditemukan di AndroidManifest.xml');
  x = x.replace('<application', missing.join('\n    ') + '\n    <application');
}
if (!x.includes('android.hardware.camera')) x = x.replace('<application', '<uses-feature android:name="android.hardware.camera" android:required="false" />\n    <application');
fs.writeFileSync(f, x);
console.log('AndroidManifest.xml berhasil dipatch');
