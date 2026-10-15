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
  '<uses-permission android:name="android.permission.READ_CONTACTS" />',
  '<uses-permission android:name="android.permission.WRITE_CONTACTS" />'
];
const missing = permissions.filter(p => !x.includes(p.match(/android:name="([^"]+)"/)[1]));
if (missing.length) {
  if (!x.includes('<application')) throw new Error('Tag <application> tidak ditemukan di AndroidManifest.xml');
  x = x.replace('<application', missing.join('\n    ') + '\n    <application');
}
if (!x.includes('android.hardware.camera')) x = x.replace('<application', '<uses-feature android:name="android.hardware.camera" android:required="false" />\n    <application');
fs.writeFileSync(f, x);
console.log('AndroidManifest.xml berhasil dipatch');

// ---- Plugin native: kirim gambar nota langsung ke chat WhatsApp nomor pelanggan ----
const javaDir = path.join(__dirname, '..', 'android/app/src/main/java/com/notaservice/hp');
fs.mkdirSync(javaDir, { recursive: true });
fs.copyFileSync(path.join(__dirname, 'native', 'WhatsAppSharePlugin.java'), path.join(javaDir, 'WhatsAppSharePlugin.java'));
fs.writeFileSync(path.join(javaDir, 'MainActivity.java'), `package com.notaservice.hp;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WhatsAppSharePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`);
let m = fs.readFileSync(f, 'utf8');
if (!m.includes('com.whatsapp.w4b')) {
  m = m.replace('<application', '<queries>\n        <package android:name="com.whatsapp" />\n        <package android:name="com.whatsapp.w4b" />\n    </queries>\n    <application');
  fs.writeFileSync(f, m);
}
console.log('Plugin WhatsAppShare berhasil ditambahkan');
