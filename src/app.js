import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Contacts } from '@capacitor-community/contacts';


    // ============================================
    // APLIKASI UTAMA
    // ============================================
    const app = (function() {
        // Helper Capacitor
        function isCapacitor() {
            return typeof Capacitor !== 'undefined' && (typeof Capacitor.isNativePlatform === 'function' ? Capacitor.isNativePlatform() : (Capacitor.getPlatform && Capacitor.getPlatform() !== 'web'));
        }
        // Capacitor 7: akses plugin melalui package import, bukan Capacitor.Plugins.
        function getPlugin(name) {
            if (!isCapacitor()) return null;
            const plugins = { Camera, Filesystem, Share, Contacts };
            return plugins[name] || null;
        }

        function blobToB64(blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); }); }
        function textToB64(t) { return btoa(unescape(encodeURIComponent(t))); }
        async function shareFile(name, b64, mime, title) {
            const FS = getPlugin('Filesystem'), Share = getPlugin('Share');
            if (!FS || !Share) throw new Error('Plugin Filesystem/Share tidak tersedia');
            const w = await FS.writeFile({ path: name, data: b64, directory: 'CACHE' });
            await Share.share({ title, files: [w.uri], dialogTitle: title });
        }

        // Variabel Global
        let db, currentType = 'terima', currentStatus = 'diambil', currentNota = null;
        let tokoSettings = {}, historyData = [], logoData = null;
        let fotoDevicePath = null, fotoDeviceData = null;
        let footers = { terima:{text:'',enabled:false}, diagnosa:{text:'',enabled:false}, selesai:{text:'',enabled:false}, ambil:{text:'',enabled:false} };
        let skText = "", autoWASelesai = false, autoWAAmbil = false, waNotifTemplate = "";
        let lastPrinterId = localStorage.getItem('last_printer_id') || '', autoPrint = false;
        
        // Pattern Lock
        let patternPath = [], patternCanvas = null, patternCtx = null;
        const pointRadius = 15, gridSize = 3;
        let pointPositions = [];

        function initPatternCanvas() {
            patternCanvas = document.getElementById('patternCanvas');
            if (!patternCanvas) return;
            patternCtx = patternCanvas.getContext('2d');
            const size = patternCanvas.width, step = size / (gridSize + 1);
            pointPositions = [];
            for (let row = 0; row < gridSize; row++) {
                for (let col = 0; col < gridSize; col++) {
                    pointPositions.push({ x: step * (col + 1), y: step * (row + 1), index: row * gridSize + col });
                }
            }
            drawPatternCanvas();
            attachPatternEvents();
        }

        function attachPatternEvents() {
            if (!patternCanvas) return;
            const getPoint = (e) => {
                const rect = patternCanvas.getBoundingClientRect();
                const scaleX = patternCanvas.width / rect.width, scaleY = patternCanvas.height / rect.height;
                let cx = e.touches ? e.touches[0].clientX : e.clientX;
                let cy = e.touches ? e.touches[0].clientY : e.clientY;
                const x = (cx - rect.left) * scaleX, y = (cy - rect.top) * scaleY;
                for (let p of pointPositions) {
                    if (Math.sqrt((x-p.x)**2 + (y-p.y)**2) <= pointRadius) return p.index;
                }
                return null;
            };
            let drawing = false;
            const start = (e) => { e.preventDefault(); drawing = true; const i = getPoint(e); if (i !== null && !patternPath.includes(i)) { patternPath.push(i); drawPatternCanvas(); } };
            const move = (e) => { if (!drawing) return; e.preventDefault(); const i = getPoint(e); if (i !== null && !patternPath.includes(i)) { patternPath.push(i); drawPatternCanvas(); } };
            const end = () => { drawing = false; updatePatternOutput(); };
            patternCanvas.addEventListener('mousedown', start);
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', end);
            patternCanvas.addEventListener('touchstart', start);
            window.addEventListener('touchmove', move);
            window.addEventListener('touchend', end);
        }

        function drawPatternCanvas() {
            if (!patternCtx) return;
            patternCtx.clearRect(0, 0, patternCanvas.width, patternCanvas.height);
            patternCtx.fillStyle = '#f0f0f0';
            patternCtx.fillRect(0, 0, patternCanvas.width, patternCanvas.height);
            for (let p of pointPositions) {
                patternCtx.beginPath();
                patternCtx.arc(p.x, p.y, pointRadius, 0, 2 * Math.PI);
                patternCtx.fillStyle = patternPath.includes(p.index) ? '#4caf50' : '#aaa';
                patternCtx.fill();
                patternCtx.strokeStyle = '#333';
                patternCtx.lineWidth = 2;
                patternCtx.stroke();
            }
            if (patternPath.length > 1) {
                patternCtx.beginPath();
                patternCtx.moveTo(pointPositions[patternPath[0]].x, pointPositions[patternPath[0]].y);
                for (let i = 1; i < patternPath.length; i++) patternCtx.lineTo(pointPositions[patternPath[i]].x, pointPositions[patternPath[i]].y);
                patternCtx.strokeStyle = '#4caf50';
                patternCtx.lineWidth = 4;
                patternCtx.stroke();
            }
        }

        function updatePatternOutput() {
            let s = patternPath.join('-');
            document.getElementById('passwordDevice').value = s;
            document.getElementById('patternInfo').innerHTML = s ? `✅ Pola: ${s} (${patternPath.length} titik)` : `🔓 Pola kosong (atau gunakan input teks)`;
            let m = document.getElementById('passwordDeviceText');
            if (m && !m.value.trim()) m.value = s;
        }

        function resetPattern() { patternPath = []; drawPatternCanvas(); updatePatternOutput(); }
        function clearPattern() { patternPath = []; drawPatternCanvas(); updatePatternOutput(); document.getElementById('passwordDeviceText').value = ''; }

        // Utility Functions
        function showToast(msg) { let t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000); }
        function showLoading() { document.getElementById('loadingOverlay').classList.add('show'); }
        function hideLoading() { document.getElementById('loadingOverlay').classList.remove('show'); }
function escapeHtml(str) { if (str === null || str === undefined) return ''; return String(str).replace(/&(?!(?:amp|lt|gt|quot|#39);)/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
        function unesc(str) { return String(str ?? '').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&'); }
        function isSafeImg(src) { return typeof src === 'string' && /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+\/=]+$/.test(src); }
        function sanitizeDeep(v) { if (typeof v === 'string') return escapeHtml(v); if (Array.isArray(v)) return v.map(sanitizeDeep); if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = sanitizeDeep(v[k]); return o; } return v; }
        function sanitizeNota(n) {
            if (!n || typeof n !== 'object' || typeof n.id !== 'string' || !n.id) return null;
            const foto = n.fotoDevice; const c = sanitizeDeep({ ...n, fotoDevice: null });
            ['totalBiaya','dp','sisa'].forEach(k => { c[k] = Number(n[k]) || 0; });
            if (foto && typeof foto === 'object') {
                if (foto.type === 'base64' && isSafeImg(foto.data)) c.fotoDevice = { type: 'base64', data: foto.data };
                else if (foto.type === 'file' && typeof foto.path === 'string') c.fotoDevice = { type: 'file', path: escapeHtml(foto.path) };
            }
            return c;
        }
        function normalizePhone(v) { let d = String(v || '').replace(/\D/g, ''); if (d.startsWith('62')) return d; if (d.startsWith('0')) return '62' + d.slice(1); if (d.startsWith('8')) return '62' + d; return d; }
        function csvCell(v) { let t = unesc(v ?? '').toString(); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return '"' + t.replace(/"/g,'""') + '"'; }
        function newNotaId() { const d = new Date(), pad = x => String(x).padStart(2,'0'); const base = 'SRV-' + String(d.getFullYear()).slice(2) + pad(d.getMonth()+1) + pad(d.getDate()) + '-'; let id; do { id = base + Math.random().toString(36).slice(2,6).toUpperCase(); } while (historyData.some(h => h.id === id || h.notaId === id)); return id; }
        function formatRupiah(num) { return parseInt(num||0).toLocaleString('id-ID'); }
        function cleanPhoneInput(el) { let v = el.value.replace(/\D/g,''); if (v.startsWith('62')) v = '0'+v.substring(2); if (v.startsWith('+62')) v = '0'+v.substring(3); el.value = v; return v; }
        function validatePhone() { let inp = document.getElementById('nohp'), v = inp.value, valid = /^08[1-9]\d{6,10}$/.test(v); inp.classList.toggle('error-input', !valid); document.getElementById('phoneValidation').classList.toggle('show', !valid && v !== ''); return valid; }
        function hitungSisa() { let t = parseFloat(document.getElementById('totalBiaya').value)||0, d = parseFloat(document.getElementById('dp').value)||0, s = t - d; document.getElementById('sisa').value = s > 0 ? s.toLocaleString('id-ID') : '0'; }

        // IndexedDB
        function initDB() {
            return new Promise((resolve, reject) => {
                const r = indexedDB.open('NotaServiceDB', 8);
                r.onerror = (e) => reject(e.target.error);
                r.onsuccess = (e) => { db = e.target.result; resolve(db); };
                r.onupgradeneeded = (e) => { const d = e.target.result; if (!d.objectStoreNames.contains('nota')) d.createObjectStore('nota', { keyPath: 'id' }); };
            });
        }
        async function saveToDB(data) { if (!db) await initDB(); return new Promise((res, rej) => { const tx = db.transaction(['nota'], 'readwrite'), store = tx.objectStore('nota'), req = store.put(data); req.onsuccess = res; req.onerror = rej; }); }
        async function getAllFromDB() { if (!db) await initDB(); return new Promise((res, rej) => { const tx = db.transaction(['nota'], 'readonly'), store = tx.objectStore('nota'), req = store.getAll(); req.onsuccess = () => res(req.result); req.onerror = rej; }); }
        async function saveToHistory(nota) { try { await saveToDB(nota); const i = historyData.findIndex(h => h.id === nota.id); if (i !== -1) historyData[i] = nota; else historyData.unshift(nota); } catch (e) { showToast('Gagal menyimpan nota!'); } }
        async function loadHistory() { try { historyData = (await getAllFromDB()).map(sanitizeNota).filter(Boolean).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)); } catch (e) { historyData = []; } }

        function validateForm() {
            let v = true;
            if (!document.getElementById('nama').value.trim()) { document.getElementById('namaError').classList.add('show'); v = false; } else document.getElementById('namaError').classList.remove('show');
            if (!validatePhone()) v = false;
            if (!document.getElementById('merek').value.trim()) { document.getElementById('merekError').classList.add('show'); v = false; } else document.getElementById('merekError').classList.remove('show');
            if (!document.getElementById('model').value.trim()) { document.getElementById('modelError').classList.add('show'); v = false; } else document.getElementById('modelError').classList.remove('show');
            if (!document.getElementById('keluhan').value.trim()) { document.getElementById('keluhanError').classList.add('show'); v = false; } else document.getElementById('keluhanError').classList.remove('show');
            return v;
        }
        function getKondisi() { let a = []; document.querySelectorAll('.kondisi-checkbox.active').forEach(el => a.push(el.dataset.value)); let l = document.getElementById('kondisiLainnya').value.trim(); if (l) a.push(escapeHtml(l)); return a; }

        // ============================================
        // FUNGSI DENGAN PLUGIN CAPACITOR
        // ============================================
        async function handleFotoDevice(input) {
            if (isCapacitor()) {
                const Camera = getPlugin('Camera');
                if (Camera) {
                    try {
                        await Camera.requestPermissions();
                        const photo = await Camera.getPhoto({
                            quality: 60,
                            allowEditing: false,
                            resultType: 'dataUrl', width: 1280,
                            source: 'PROMPT', promptLabelHeader: 'Foto device', promptLabelPhoto: 'Dari galeri', promptLabelPicture: 'Ambil foto'
                        });
                        if (photo && photo.dataUrl) {
                            fotoDeviceData = photo.dataUrl;
                            fotoDevicePath = null;
                            let p = document.getElementById('fotoPreview');
                            p.innerHTML = `<img src="${photo.dataUrl}" style="max-width:100%; max-height:100px; border-radius:8px;">`;
                            p.classList.add('show');
                        }
                    } catch (err) {
                        showToast('Gagal mengambil foto: ' + err.message);
                    }
                } else {
                    showToast('Plugin Camera tidak tersedia');
                }
            } else {
                let f = input.files[0]; if(!f) return; if(f.size > 2*1024*1024){ showToast('Foto maksimal 2MB'); return; }
                let r = new FileReader();
                r.onload = e => { fotoDeviceData = e.target.result; fotoDevicePath = null; let p = document.getElementById('fotoPreview'); p.innerHTML = `<img src="${fotoDeviceData}" style="max-width:100%; max-height:100px; border-radius:8px;">`; p.classList.add('show'); };
                r.readAsDataURL(f);
            }
        }

        // ========== UNTUK @capacitor-community/contacts v5/v6/v7 ==========
        async function importContact() {
            if (isCapacitor()) {
                const Contacts = getPlugin('Contacts');
                if (Contacts) {
                    try {
                        const perm = await Contacts.requestPermissions();
                        if (perm.contacts !== 'granted') {
                            showToast('Izin akses kontak ditolak');
                            return;
                        }
                        
                        // v5/v6/v7: pickContact() mengembalikan { contact: {...} }
                        const result = await Contacts.pickContact();
                        console.log("Raw result:", JSON.stringify(result, null, 2));
                        
                        // ✅ CEK: result.contact (bukan result langsung)
                        if (!result || !result.contact) {
                            showToast('Tidak ada kontak dipilih');
                            return;
                        }
                        
                        const contact = result.contact;
                        
                        // ✅ Ambil nama dari contact.name.display
                        let nama = '';
                        if (contact.name) {
                            if (contact.name.display) {
                                nama = contact.name.display;
                            } else if (contact.name.given) {
                                nama = contact.name.given;
                                if (contact.name.family) nama += ' ' + contact.name.family;
                            }
                        }
                        
                        // ✅ Ambil nomor dari contact.phones (bukan phoneNumbers)
                        let phone = '';
                        if (contact.phones && contact.phones.length > 0) {
                            const mobilePhone = contact.phones.find(p => 
                                p.type && p.type.toLowerCase() === 'mobile'
                            );
                            phone = mobilePhone ? mobilePhone.number : contact.phones[0].number;
                        }
                        
                        // Bersihkan dan set value
                        phone = phone.replace(/\D/g, '');
                        if (phone.startsWith('62')) phone = '0' + phone.substring(2);
                        
                        document.getElementById('nama').value = nama.trim();
                        document.getElementById('nohp').value = phone;
                        
                        showToast(`✅ Kontak diimport: ${nama}`);
                        
                    } catch (e) {
                        console.error('Kontak error:', e);
                        showToast('❌ Gagal: ' + e.message);
                    }
                } else {
                    showToast('Plugin Contacts tidak tersedia');
                }
            } else {
                showToast('Fitur kontak hanya tersedia di aplikasi Android');
            }
        }
        // ================================================

        async function saveContact() {
            const nama = document.getElementById('nama').value.trim(); let nohp = document.getElementById('nohp').value.trim().replace(/\D/g, '');
            if (!nama) { showToast('Isi nama pelanggan terlebih dahulu'); return; }
            if (!nohp) { showToast('Isi nomor HP pelanggan terlebih dahulu'); return; }
            const vCard = `BEGIN:VCARD\nVERSION:3.0\nFN:${nama}\nN:${nama};;;\nTEL;TYPE=CELL:${nohp}\nEND:VCARD`;
            if (isCapacitor()) {
                const Filesystem = getPlugin('Filesystem');
                const Share = getPlugin('Share');
                if (Filesystem && Share) {
                    try {
                        const b64 = btoa(unescape(encodeURIComponent(vCard)));
                        const fn = `${nama.replace(/\s/g, '_')}.vcf`;
                        await Filesystem.writeFile({ path: fn, data: b64, directory: 'CACHE', recursive: true });
                        const uri = await Filesystem.getUri({ path: fn, directory: 'CACHE' });
                        await Share.share({ title: 'Simpan Kontak', text: `Kontak ${nama}`, url: uri.uri, dialogTitle: 'Simpan ke kontak' });
                        showToast('Kontak siap disimpan');
                    } catch (e) { showToast('Gagal: ' + e.message); }
                } else { showToast('Plugin Filesystem/Share tidak tersedia'); }
            } else {
                const blob = new Blob([vCard], { type: 'text/vcard' }), url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `${nama}.vcf`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                showToast('File kontak dibuat. Buka dengan aplikasi Kontak.');
            }
        }

        async function buatPreview() {
            if (!validateForm()) { showToast('Harap lengkapi data wajib!'); return; }
            showLoading();
            try {
                const device = `${document.getElementById('merek').value} ${document.getElementById('model').value}`.trim();
                const now = new Date(), notaId = newNotaId(), originalId = window._lanjutOriginalId || notaId;
                let timeline = [];
                if (window._lanjutOriginalId) { const p = historyData.find(h => h.id === window._lanjutOriginalId); if (p && p.timeline) timeline = [...p.timeline]; }
                timeline.push({ status: currentType, timestamp: now.toISOString(), waktu: now.toLocaleString('id-ID') });
                const totalBiaya = parseFloat(document.getElementById('totalBiaya').value)||0, dp = parseFloat(document.getElementById('dp').value)||0, sisa = totalBiaya - dp;
                let fotoStorage = null;
                if (isCapacitor() && fotoDevicePath) fotoStorage = { type: 'file', path: fotoDevicePath };
                else if (fotoDeviceData) fotoStorage = { type: 'base64', data: fotoDeviceData };
                let pwd = document.getElementById('passwordDevice').value, mt = document.getElementById('passwordDeviceText').value.trim();
                if (mt) pwd = mt;
                currentNota = { id: notaId, type: currentType, notaId, originalId, nama: escapeHtml(document.getElementById('nama').value.trim()), nohp: document.getElementById('nohp').value, device: escapeHtml(device), keluhan: escapeHtml(document.getElementById('keluhan').value.trim()), totalBiaya, dp, sisa, estimasi: escapeHtml(document.getElementById('estimasi').value), catatan: escapeHtml(document.getElementById('catatan').value), tanggal: now.toLocaleDateString('id-ID'), jam: now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}), timestamp: now.toISOString(), kelengkapan: currentType === 'terima' ? Array.from(document.querySelectorAll('#kelengkapanSection input:checked')).map(cb => cb.value) : [], kondisi: getKondisi(), passwordDevice: escapeHtml(pwd), fotoDevice: fotoStorage, diagnosa: currentType === 'diagnosa' ? { hasil: escapeHtml(document.getElementById('hasilDiagnosa').value), sparepart: escapeHtml(document.getElementById('sparepart').value), status: document.getElementById('statusDiagnosa').value } : null, selesai: currentType === 'selesai' ? { detail: escapeHtml(document.getElementById('detailPerbaikan').value), status: document.getElementById('statusSelesai').value, siapAmbil: escapeHtml(document.getElementById('siapAmbil').value) } : null, ambil: currentType === 'ambil' ? { status: currentStatus, alasan: document.getElementById('alasanBatal').value } : null, timeline };
                delete window._lanjutOriginalId;
                currentNota = sanitizeNota(currentNota);
                renderPreview(); await saveToHistory(currentNota); localStorage.removeItem('nota_draft');
                document.getElementById('formCard').classList.remove('active');
                document.getElementById('previewCard').classList.add('active');
                updateWorkflowButtons();
                if (currentType === 'selesai' && autoWASelesai) sendAutoWA(currentNota, 'selesai');
                else if (currentType === 'ambil' && currentNota.ambil?.status === 'diambil' && autoWAAmbil) sendAutoWA(currentNota, 'ambil');
                if (autoPrint) setTimeout(() => printBluetooth().catch(e => console.warn('Auto print gagal:', e)), 500);
            } catch (e) { showToast('Kesalahan menyimpan nota'); } finally { hideLoading(); }
        }

        function renderPreview() {
            let badgeClass, badgeText, paperClass;
            switch(currentType){ case 'terima': badgeClass='badge-terima'; badgeText='📥 NOTA PENERIMAAN'; paperClass='terima'; break; case 'diagnosa': badgeClass='badge-diagnosa'; badgeText='🔍 HASIL DIAGNOSA'; paperClass='diagnosa'; break; case 'selesai': badgeClass='badge-selesai'; badgeText='✅ SELESAI'; paperClass='selesai'; break; case 'ambil': if(currentNota.ambil?.status==='batal'){ badgeClass='badge-batal'; badgeText='❌ DIBATALKAN'; paperClass='batal'; } else { badgeClass='badge-ambil'; badgeText='📤 DIAMBIL'; paperClass='ambil'; } break; }
            let html = `<div class="nota-header">`;
            if(isSafeImg(logoData)) html+=`<img src="${logoData}" class="nota-logo">`;
            html+=`<h2>${escapeHtml(tokoSettings.nama||'Nota Service HP')}</h2>`;
            if(tokoSettings.slogan) html+=`<div class="nota-slogan">✨ ${escapeHtml(tokoSettings.slogan)}</div>`;
            if(tokoSettings.alamat) html+=`<div class="nota-alamat">📍 ${escapeHtml(tokoSettings.alamat)}</div>`;
            if(tokoSettings.telepon) html+=`<div class="nota-telp">📞 ${escapeHtml(tokoSettings.telepon)}</div>`;
            html+=`<span class="nota-type-badge ${badgeClass}">${badgeText}</span>`;
            html+=`<div style="font-size:12px; color:#666;">${currentNota.tanggal} • ${currentNota.jam}</div>`;
            html+=`<div class="nota-id">${currentNota.notaId}</div></div>`;
            html+=`<div class="nota-section"><div class="nota-section-title">👤 Pelanggan</div>`;
            html+=`<div class="nota-row"><span class="nota-label">Nama</span><span class="nota-value">${currentNota.nama}</span></div>`;
            html+=`<div class="nota-row"><span class="nota-label">No. HP</span><span class="nota-value">${currentNota.nohp}</span></div>`;
            html+=`<div class="nota-row"><span class="nota-label">Device</span><span class="nota-value">${currentNota.device}</span></div>`;
            // Password/pola perangkat sengaja tidak ditampilkan pada nota pelanggan.
            html+=`</div><div class="nota-section"><div class="nota-section-title">📋 Detail Service</div>`;
            html+=`<div><strong>Keluhan:</strong> ${currentNota.keluhan}</div>`;
            if(currentNota.kelengkapan?.length) html+=`<div style="margin-top:5px;"><strong>Kelengkapan:</strong> ${currentNota.kelengkapan.join(', ')}</div>`;
            if(currentNota.kondisi?.length) html+=`<div style="margin-top:5px;"><strong>Kondisi Fisik:</strong> ${currentNota.kondisi.join(', ')}</div>`;
            if(currentNota.fotoDevice) { let imgSrc = currentNota.fotoDevice.type === 'file' && isCapacitor() ? currentNota.fotoDevice.path : currentNota.fotoDevice.type === 'base64' ? currentNota.fotoDevice.data : ''; if(imgSrc && (isSafeImg(imgSrc) || currentNota.fotoDevice.type === 'file')) html+=`<div style="margin-top:8px;"><img src="${imgSrc}" style="max-width:100%; max-height:100px; border-radius:8px;"></div>`; }
            if(currentNota.catatan) html+=`<div style="margin-top:5px;"><strong>📝 Catatan:</strong> ${currentNota.catatan}</div>`;
            if(currentType==='diagnosa' && currentNota.diagnosa){ html+=`<div style="margin-top:10px;"><strong>🔍 Hasil Diagnosa:</strong> ${currentNota.diagnosa.hasil||'-'}</div>`; if(currentNota.diagnosa.sparepart) html+=`<div><strong>Sparepart:</strong> ${currentNota.diagnosa.sparepart}</div>`; let stat={bisa:'✅ Bisa diperbaiki',tidak:'❌ Tidak bisa diperbaiki',pending:'⏳ Menunggu konfirmasi'}; html+=`<div><strong>Status:</strong> ${stat[currentNota.diagnosa.status]||currentNota.diagnosa.status}</div>`; }
            if(currentType==='selesai' && currentNota.selesai){ html+=`<div style="margin-top:10px;"><strong>✅ Detail Perbaikan:</strong> ${currentNota.selesai.detail||'-'}</div>`; let stat={normal:'✅ Berfungsi normal',partial:'⚠️ Berfungsi sebagian',tidak:'❌ Tidak bisa'}; html+=`<div><strong>Status:</strong> ${stat[currentNota.selesai.status]||currentNota.selesai.status}</div>`; if(currentNota.selesai.siapAmbil) html+=`<div><strong>Siap diambil:</strong> ${currentNota.selesai.siapAmbil}</div>`; }
            if(currentType==='ambil' && currentNota.ambil){ if(currentNota.ambil.status==='diambil') html+=`<div style="margin-top:10px; background:#e8f5e9; padding:8px; border-radius:8px;"><strong>✅ Status:</strong> Sudah diambil oleh pelanggan</div>`; else html+=`<div style="margin-top:10px; background:#ffebee; padding:8px; border-radius:8px;"><strong>❌ Status:</strong> Dibatalkan<br>Alasan: ${escapeHtml(currentNota.ambil.alasan||'-')}</div>`; }
            html+=`</div>`;
            if(currentNota.totalBiaya>0){ html+=`<div class="nota-total"><div class="nota-row"><span class="nota-label">Total Biaya</span><span class="nota-value">Rp ${formatRupiah(currentNota.totalBiaya)}</span></div>`; if(currentNota.dp>0) html+=`<div class="nota-row"><span class="nota-label">DP / Panjar</span><span class="nota-value">Rp ${formatRupiah(currentNota.dp)}</span></div><div class="nota-row"><span class="nota-label">Sisa Pembayaran</span><span class="nota-value">Rp ${formatRupiah(currentNota.sisa)}</span></div>`; html+=`</div>`; }
            if(currentNota.timeline && currentNota.timeline.length>1){ html+=`<div class="timeline"><div style="font-size:12px; font-weight:bold; color:var(--primary); margin-bottom:8px;">📅 Timeline Service</div>`; currentNota.timeline.forEach(item=>{ let name={terima:'📥 Diterima',diagnosa:'🔍 Diagnosa',selesai:'✅ Selesai',ambil:'📤 Diambil/Dibatalkan'}[item.status]||item.status; html+=`<div style="font-size:11px; color:#666; margin-bottom:6px; display:flex; align-items:baseline; gap:8px;"><span style="width:8px; height:8px; border-radius:50%; background:var(--primary);"></span><span style="font-family:monospace; font-size:10px; color:#999;">${new Date(item.timestamp).toLocaleString('id-ID')}</span> <strong>${name}</strong></div>`; }); html+=`</div>`; }
            let footer = (footers[currentType]?.enabled && footers[currentType]?.text) ? footers[currentType].text : '';
            if(footer) html+=`<div class="nota-footer">${escapeHtml(footer).replace(/\n/g,'<br>')}</div>`;
            if((currentType==='terima' || currentType==='ambil') && skText.trim()) html+=`<div class="syarat-section"><strong>📜 SYARAT & KETENTUAN</strong>${escapeHtml(skText).replace(/\n/g,'<br>')}</div>`;
            html+=`<div style="text-align:center; margin-top:20px; font-size:11px; color:#999;">Terima kasih atas kepercayaan Anda<br>Simpan nota ini sebagai bukti</div>`;
            document.getElementById('notaContent').innerHTML = html;
            document.getElementById('notaContent').className = `nota-paper ${paperClass}`;
        }

        function isNotaLocked() { return currentNota && currentNota.type === 'ambil'; }
        function updateWorkflowButtons() {
            let c = document.getElementById('workflowButtons');
            if(!currentNota){ c.innerHTML=''; return; }
            if(isNotaLocked()){ c.innerHTML='<div style="text-align:center; padding:10px; background:#ffebee; border-radius:12px; color:#c62828;">🔒 Nota sudah selesai (diambil/dibatalkan). Tidak dapat diedit lagi.</div>'; return; }
            let btns='';
            if(currentType==='terima') btns='<button class="btn-workflow diagnosa" onclick="app.lanjutKe(\'diagnosa\')">🔍 Lanjut ke Diagnosa</button>';
            else if(currentType==='diagnosa') btns='<button class="btn-workflow selesai" onclick="app.lanjutKe(\'selesai\')">✅ Lanjut ke Selesai</button>';
            else if(currentType==='selesai') btns='<button class="btn-workflow ambil" onclick="app.lanjutKe(\'ambil\')">📤 Lanjut ke Ambil</button>';
            c.innerHTML = btns ? `<div style="margin-bottom:10px; font-size:13px;">📌 Lanjutkan ke tahap berikutnya:</div>${btns}` : '';
        }

        async function lanjutKe(tipeBaru) {
            if(!currentNota || isNotaLocked()){ showToast('Nota terkunci, tidak dapat dilanjutkan'); return; }
            document.getElementById('nama').value = currentNota.nama;
            document.getElementById('nohp').value = currentNota.nohp;
            let parts = currentNota.device.split(' ');
            document.getElementById('merek').value = parts[0]||'';
            document.getElementById('model').value = parts.slice(1).join(' ')||'';
            document.getElementById('keluhan').value = currentNota.keluhan;
            document.getElementById('totalBiaya').value = currentNota.totalBiaya||0;
            document.getElementById('dp').value = currentNota.dp||0;
            hitungSisa();
            document.getElementById('estimasi').value = currentNota.estimasi||'';
            document.getElementById('catatan').value = currentNota.catatan||'';
            let pwd = currentNota.passwordDevice || '';
            document.getElementById('passwordDevice').value = pwd;
            document.getElementById('passwordDeviceText').value = pwd;
            if (/^(\d+-)*\d+$/.test(pwd)) { patternPath = pwd.split('-').map(Number); drawPatternCanvas(); updatePatternOutput(); } else { patternPath = []; drawPatternCanvas(); updatePatternOutput(); }
            if(currentNota.kondisi){ document.querySelectorAll('.kondisi-checkbox').forEach(cb => cb.classList.remove('active')); currentNota.kondisi.forEach(k => { let el = Array.from(document.querySelectorAll('.kondisi-checkbox')).find(c => c.dataset.value === k); if(el) el.classList.add('active'); }); let lainnya = currentNota.kondisi.filter(k => !['Penyok','Lecet','Retak','Basah','Lainnya'].includes(k)).join(', '); document.getElementById('kondisiLainnya').value = lainnya; }
            if(currentNota.fotoDevice) { if (currentNota.fotoDevice.type === 'base64') { fotoDeviceData = currentNota.fotoDevice.data; fotoDevicePath = null; let p = document.getElementById('fotoPreview'); p.innerHTML = `<img src="${fotoDeviceData}" style="max-width:100%; max-height:100px;">`; p.classList.add('show'); } else if (currentNota.fotoDevice.type === 'file') { fotoDevicePath = currentNota.fotoDevice.path; fotoDeviceData = null; let p = document.getElementById('fotoPreview'); p.innerHTML = `<img src="${fotoDevicePath}" style="max-width:100%; max-height:100px;">`; p.classList.add('show'); } }
            if(currentNota.kelengkapan) document.querySelectorAll('#kelengkapanSection input[type="checkbox"]').forEach(cb => cb.checked = currentNota.kelengkapan.includes(cb.value));
            if(tipeBaru==='diagnosa'){ document.getElementById('hasilDiagnosa').value = ''; document.getElementById('sparepart').value = ''; document.getElementById('statusDiagnosa').value = 'bisa'; }
            else if(tipeBaru==='selesai'){ document.getElementById('detailPerbaikan').value = ''; document.getElementById('statusSelesai').value = 'normal'; document.getElementById('siapAmbil').value = ''; }
            else if(tipeBaru==='ambil'){ selectAmbilStatus('diambil'); document.getElementById('alasanBatal').value = 'Tidak bisa diperbaiki'; }
            selectType(tipeBaru);
            window._lanjutOriginalId = currentNota.originalId || currentNota.id;
            document.getElementById('previewCard').classList.remove('active');
            document.getElementById('formCard').classList.add('active');
            showToast(`Silakan lengkapi data untuk tahap ${tipeBaru.toUpperCase()}`);
        }

        async function captureNotaAsImage(targetWidth = 400, quality = 0.8, scale = 2.5) {
            const el = document.getElementById('notaContent'), ow = el.style.width, oc = el.className;
            el.style.width = targetWidth + 'px'; el.classList.add('capture-wide');
            await new Promise(r => setTimeout(r, 50));
            const canvas = await html2canvas(el, { scale, backgroundColor: '#ffffff', windowWidth: el.scrollWidth, logging: false });
            el.style.width = ow; el.className = oc;
            return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
        }

        async function kirimWA(mode){
            if(!currentNota) return;
            let no = normalizePhone(currentNota.nohp);
            if(mode==='teks'){
                let template = localStorage.getItem('wa_template') || `*{toko}*\n━━━━━━━━━━━━━━━\n{type_badge}\n━━━━━━━━━━━━━━━\n\n🆔 No: *{nota_id}*\n📅 {tanggal} | ⏰ {jam}\n\n👤 *Pelanggan:* {nama}\n📱 *Device:* {device}\n\n📋 *Keluhan:*\n{keluhan}\n\n{kelengkapan_line}\n💰 *Estimasi Biaya:* Rp {biaya}\n⏳ *Estimasi Waktu:* {estimasi}\n\n📝 *Catatan:* {catatan}\n\n━━━━━━━━━━━━\n{footer}`;
                let badge = {terima:'📥 *NOTA PENERIMAAN*',diagnosa:'🔍 *HASIL DIAGNOSA*',selesai:'✅ *NOTA SELESAI*',ambil:currentNota.ambil?.status==='batal'?'❌ *DIBATALKAN*':'📤 *NOTA AMBIL*'}[currentType]||'📋 *NOTA SERVICE*';
                let kelengkapanLine = currentNota.kelengkapan?.length ? `📦 *Kelengkapan:* ${currentNota.kelengkapan.join(', ')}` : '📦 *Kelengkapan:* -';
                let msg = template.replace(/{toko}/g, tokoSettings.nama||'Service HP').replace(/{type_badge}/g, badge).replace(/{nota_id}/g, currentNota.notaId).replace(/{tanggal}/g, currentNota.tanggal).replace(/{jam}/g, currentNota.jam).replace(/{nama}/g, () => unesc(currentNota.nama)).replace(/{device}/g, () => unesc(currentNota.device)).replace(/{keluhan}/g, () => unesc(currentNota.keluhan)).replace(/{kelengkapan_line}/g, kelengkapanLine).replace(/{biaya}/g, formatRupiah(currentNota.totalBiaya)).replace(/{estimasi}/g, currentNota.estimasi||'-').replace(/{catatan}/g, () => unesc(currentNota.catatan)||'-').replace(/{footer}/g, footers[currentType]?.enabled?footers[currentType].text:'');
                window.open(`https://wa.me/${no}?text=${encodeURIComponent(msg)}`,'_blank');
            } else if(mode==='gambar'){
                showLoading();
                try{
                    const blob = await captureNotaAsImage(400, 0.8, 2.5);
                    const file = new File([blob], `Nota_${currentNota.notaId}.jpg`, { type: 'image/jpeg' });
                    if (isCapacitor()) {
                        await shareFile(`Nota_${currentNota.notaId}.jpg`, await blobToB64(blob), 'image/jpeg', `Nota ${currentNota.notaId}`); showToast('Berhasil dibagikan');
                    } else if (navigator.share && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: `Nota ${currentNota.notaId}` }); }
                    else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Nota_${currentNota.notaId}.jpg`; a.click(); URL.revokeObjectURL(a.href); showToast('Gambar disimpan, silakan kirim manual'); }
                } catch(e){ showToast('Gagal membuat gambar: ' + e.message); }
                finally { hideLoading(); }
            }
        }

        class MiniEscPos {
            constructor() { this.b = []; }
            initialize() { this.b.push(0x1b, 0x40); return this; }
            width(n) { this.b.push(0x1d, 0x21, ((Math.max(1, Math.min(8, n)) - 1) << 4)); return this; }
            align(a) { this.b.push(0x1b, 0x61, { left: 0, center: 1, right: 2 }[a] || 0); return this; }
            text(t) { String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').split('').forEach(ch => { const c = ch.charCodeAt(0); this.b.push(c === 10 ? 10 : (c >= 32 && c < 127 ? c : 63)); }); return this; }
            newline() { this.b.push(0x0a); return this; }
            cut() { this.b.push(0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x00); return this; }
            encode() { return new Uint8Array(this.b); }
        }
        class NotaPrinter {
            constructor() { this.paperSize = localStorage.getItem('printer_size')||'58'; }
            async encodeData(data) {
                let encoder = new MiniEscPos();
                encoder.initialize();
                if (this.paperSize === '80' || this.paperSize === '75') encoder.width(2);
                encoder.align('center').text(data.toko||'Service HP').newline();
                if (data.slogan) encoder.align('center').text(data.slogan).newline();
                if (data.telepon) encoder.align('center').text(`📞 ${data.telepon}`).newline();
                encoder.text('===============================').newline().align('left');
                encoder.text(`No   : ${data.id}`).newline().text(`Tgl  : ${data.tanggal}`).newline().text(`Nama : ${data.nama}`).newline().text(`HP   : ${data.nohp}`).newline().text(`Device: ${data.device}`).newline().text('-------------------------------').newline().text('Keluhan:').newline().text(data.keluhan).newline().text('-------------------------------').newline();
                if(data.biaya>0) encoder.align('right').text(`Total: Rp ${data.biaya}`).newline().align('left');
                encoder.align('center').text('\nTerima Kasih\n');
                if(data.footer) encoder.text(data.footer).newline();
                encoder.text('Simpan Nota Ini').newline().cut();
                return encoder.encode();
            }
            buildText(d) {
                const n = (this.paperSize === '80' || this.paperSize === '75') ? 48 : 32;
                const clean = v => unesc(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[<>\[\]]/g, ' ').replace(/[^\x20-\x7E\n]/g, '').trim();
                const sep = '-'.repeat(n), rp = x => 'Rp ' + Number(x || 0).toLocaleString('id-ID');
                const L = [];
                L.push(`[C]<font size='big'><b>${clean(d.toko || 'Service HP')}</b></font>`);
                if (d.slogan) L.push(`[C]${clean(d.slogan)}`);
                if (d.telepon) L.push(`[C]Telp: ${clean(d.telepon)}`);
                L.push(`[C]${'='.repeat(n)}`);
                L.push(`[L]No      : ${clean(d.id)}`, `[L]Tanggal : ${clean(d.tanggal)}`, `[L]Nama    : ${clean(d.nama)}`, `[L]HP      : ${clean(d.nohp)}`, `[L]Device  : ${clean(d.device)}`);
                L.push(`[C]${sep}`, '[L]<b>Keluhan:</b>', `[L]${clean(d.keluhan)}`, `[C]${sep}`);
                if (d.biaya > 0) { L.push(`[L]Total   [R]${rp(d.biaya)}`); if (d.dp > 0) { L.push(`[L]DP      [R]${rp(d.dp)}`, `[L]<b>Sisa</b>    [R]<b>${rp(d.sisa)}</b>`); } L.push(`[C]${sep}`); }
                if (d.footer) L.push(`[C]${clean(d.footer)}`);
                L.push('[C]Terima Kasih', '[C]Simpan nota ini sebagai bukti');
                return L.join('\n');
            }
            async printNative(data) {
                const TP = window.ThermalPrinter || (window.cordova && cordova.plugins && cordova.plugins.ThermalPrinter);
                if (!TP) throw new Error('Plugin printer thermal tidak tersedia');
                const call = (fn, args) => new Promise((res, rej) => fn.call(TP, args, res, e => rej(new Error(typeof e === 'string' ? e : (e && e.message) || JSON.stringify(e)))));
                let id = lastPrinterId;
                if (!id) {
                    try { await call(TP.requestPermissions, { type: 'bluetooth' }); } catch (e) {}
                    const list = await call(TP.listPrinters, { type: 'bluetooth' });
                    if (!list || !list.length) throw new Error('Tidak ada printer Bluetooth terpasang. Pairing dulu di Pengaturan Bluetooth HP.');
                    let pick = list[0];
                    if (list.length > 1) { const k = parseInt(prompt('Pilih printer:\n' + list.map((x, i) => `${i + 1}. ${x.name}`).join('\n'), '1'), 10); if (!(k >= 1 && k <= list.length)) throw new Error('Dibatalkan'); pick = list[k - 1]; }
                    id = pick.id !== undefined ? pick.id : pick.address;
                    localStorage.setItem('last_printer_id', id); lastPrinterId = id;
                    const inp = document.getElementById('printerDeviceId'); if (inp) inp.value = id;
                }
                const wide = (this.paperSize === '80' || this.paperSize === '75');
                await call(TP.printFormattedTextAndCut, { type: 'bluetooth', id, text: this.buildText(data), mmFeedPaper: 12, printerDpi: 203, printerWidthMM: wide ? 72 : 48, printerNbrCharactersPerLine: wide ? 48 : 32 });
                showToast('✅ Nota terkirim ke printer');
            }
            async print(data) {
                if (isCapacitor()) return this.printNative(data);
                const bytes = await this.encodeData(data);
                if (isCapacitor()) {
                    const BluetoothLE = getPlugin('BluetoothLE');
                    if (BluetoothLE) {
                        try {
                            await BluetoothLE.requestPermissions(); await BluetoothLE.initialize();
                            let deviceId = lastPrinterId, device;
                            if (deviceId) { try { await BluetoothLE.connect(deviceId); device = { deviceId }; } catch(e) { showToast('ID printer tersimpan tidak valid, akan scan ulang'); deviceId = null; } }
                            if (!deviceId) {
                                const devices = await new Promise((resolve) => { let found = []; const unsub = BluetoothLE.addListener('onScanResult', (r) => { found.push(r); }); BluetoothLE.startScan({ services: [] }).then(() => { setTimeout(async () => { await BluetoothLE.stopScan(); unsub.remove(); resolve(found); }, 5000); }); });
                                if (devices.length === 0) throw new Error('Printer tidak ditemukan');
                                device = devices[0]; deviceId = device.device.deviceId;
                                await BluetoothLE.connect(deviceId);
                                localStorage.setItem('last_printer_id', deviceId); lastPrinterId = deviceId;
                                document.getElementById('printerDeviceId').value = deviceId;
                            }
                            for (let o = 0; o < bytes.length; o += 100) { await BluetoothLE.write({ deviceId, service: '000018f0-0000-1000-8000-00805f9b34fb', characteristic: '00002af0-0000-1000-8000-00805f9b34fb', value: Array.from(bytes.slice(o, o + 100)) }); }
                            await BluetoothLE.disconnect(deviceId);
                            showToast('✅ Nota terkirim ke printer'); return;
                        } catch (e) { throw new Error('Gagal cetak: ' + e.message); }
                    } else throw new Error('Plugin Bluetooth tidak tersedia');
                }
                if (navigator.bluetooth) {
                    let device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '0000ff00-0000-1000-8000-00805f9b34fb', '49535343-fe7d-4ae5-8fa9-9fafd205e455'] });
                    let server = await device.gatt.connect(), service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb'), chars = await service.getCharacteristics();
                    let char = chars.find(c => c.properties.write || c.properties.writeWithoutResponse);
                    if (!char) throw new Error('Karakteristik tulis printer tidak ditemukan'); for (let o = 0; o < bytes.length; o += 100) { const part = bytes.slice(o, o + 100); if (char.properties.writeWithoutResponse && char.writeValueWithoutResponse) await char.writeValueWithoutResponse(part); else await char.writeValue(part); }
                    showToast('✅ Nota terkirim ke printer'); return;
                }
                throw new Error('Tidak ada metode Bluetooth yang tersedia');
            }
        }
        const printer = new NotaPrinter();
        async function printBluetooth() { 
            if (!currentNota) { showToast('Buat nota dulu'); return; }
            showLoading();
            try { await printer.print({ toko: tokoSettings.nama||'Service HP', slogan: tokoSettings.slogan || '', telepon: tokoSettings.telepon || '', id: currentNota.notaId, tanggal: currentNota.tanggal+' '+currentNota.jam, nama: unesc(currentNota.nama), nohp: currentNota.nohp, device: unesc(currentNota.device), keluhan: unesc(currentNota.keluhan), biaya: currentNota.totalBiaya, dp: currentNota.dp, sisa: currentNota.sisa, footer: footers[currentType]?.enabled ? footers[currentType].text : '' }); }
            catch (e) { showToast('❌ Gagal cetak thermal: ' + e.message + '. Beralih ke PDF.'); generatePDF(); }
            finally { hideLoading(); }
        }
        function savePrinterId() { let id = document.getElementById('printerDeviceId').value.trim(); if (id) { localStorage.setItem('last_printer_id', id); lastPrinterId = id; showToast('ID printer disimpan'); } else showToast('ID tidak boleh kosong'); }
        function clearPrinterId() { localStorage.removeItem('last_printer_id'); lastPrinterId = ''; document.getElementById('printerDeviceId').value = ''; showToast('ID printer dihapus'); }

        async function generatePDF(){
            showLoading();
            try{
                const blob = await captureNotaAsImage(500, 0.9, 2.5), imgData = URL.createObjectURL(blob);
                let img = new Image(); await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = imgData; });
                let { jsPDF } = window.jspdf, doc = new jsPDF('p', 'mm', 'a4');
                let imgWidth = 190, imgHeight = (img.height * imgWidth) / img.width, pageHeight = doc.internal.pageSize.getHeight(), y = 0;
                while (y < imgHeight) { doc.addImage(imgData, 'JPEG', 10, y === 0 ? 10 : -y, imgWidth, imgHeight); y += pageHeight - 20; if (y < imgHeight) doc.addPage(); }
                if (isCapacitor()) { await shareFile(`Nota_${currentNota.notaId}.pdf`, doc.output('datauristring').split(',')[1], 'application/pdf', `Nota ${currentNota.notaId}`); } else { doc.save(`Nota_${currentNota.notaId}.pdf`); } URL.revokeObjectURL(imgData); showToast('✅ PDF siap');
            } catch(e){ showToast('Gagal PDF: ' + e.message); }
            hideLoading();
        }

        function previewThermal() {
            if (!currentNota) { showToast('Buat nota terlebih dahulu'); return; }
            const data = { toko: tokoSettings.nama || 'Service HP', slogan: tokoSettings.slogan || '', telepon: tokoSettings.telepon || '', id: currentNota.notaId, tanggal: currentNota.tanggal + ' ' + currentNota.jam, nama: unesc(currentNota.nama), nohp: currentNota.nohp, device: unesc(currentNota.device), keluhan: unesc(currentNota.keluhan), biaya: currentNota.totalBiaya, dp: currentNota.dp, sisa: currentNota.sisa, footer: footers[currentType]?.enabled ? footers[currentType].text : '' };
            let lines = []; lines.push('==============================='); lines.push(data.toko.toUpperCase()); if (data.slogan) lines.push(data.slogan); if (data.telepon) lines.push(`📞 ${data.telepon}`); lines.push('==============================='); lines.push(`No   : ${data.id}`); lines.push(`Tgl  : ${data.tanggal}`); lines.push(`Nama : ${data.nama}`); lines.push(`HP   : ${data.nohp}`); lines.push(`Device: ${data.device}`); lines.push('-------------------------------'); lines.push('Keluhan:'); lines.push(data.keluhan); lines.push('-------------------------------'); if (data.biaya > 0) lines.push(`Total: Rp ${formatRupiah(data.biaya)}`); lines.push('-------------------------------'); lines.push('Terima Kasih'); if (data.footer) lines.push(data.footer); lines.push('Simpan Nota Ini'); lines.push('===============================');
            document.getElementById('thermalPreviewText').textContent = lines.join('\n');
            document.getElementById('thermalPreviewModal').classList.add('active');
        }
        function closeThermalPreview() { document.getElementById('thermalPreviewModal').classList.remove('active'); }

        async function backupToDrive() {
            if (!historyData.length) { showToast('Tidak ada data untuk di-backup'); return; }
            const data = { settings:tokoSettings, history:historyData.map(({passwordDevice, ...n}) => n), logo:logoData, footers, sk:skText, autoWASelesai, autoWAAmbil, waNotifTemplate, exported:new Date(), note: 'Data password/pola perangkat sengaja tidak disertakan demi keamanan.' };
            const json = JSON.stringify(data, null, 2), blob = new Blob([json], {type: 'application/json'});
            const file = new File([blob], `Backup_${new Date().toISOString().slice(0,10)}.json`, { type: 'application/json' });
            if (isCapacitor()) {
                try { await shareFile(`Backup_${new Date().toISOString().slice(0,10)}.json`, textToB64(json), 'application/json', 'Backup Data Nota Service'); showToast('File backup siap dibagikan'); } catch(e) { showToast('Gagal share: ' + e.message); }
            } else if (navigator.share && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Backup Data Nota Service' }); showToast('Backup berhasil dibagikan'); } catch(e) { fallbackDownload(json); } }
            else fallbackDownload(json);
            function fallbackDownload(json) { const a = document.createElement('a'), url = URL.createObjectURL(new Blob([json], {type: 'application/json'})); a.href = url; a.download = `Backup_${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); showToast('File backup diunduh, silakan upload ke Drive'); }
        }

        function selectType(type) {
            currentType = type;
            ['terima','diagnosa','selesai','ambil'].forEach(t=>{ document.getElementById(`btn${t.charAt(0).toUpperCase()+t.slice(1)}`).classList.toggle('active', t===type); });
            document.querySelectorAll('.step').forEach(s=>s.classList.toggle('active', s.dataset.step===type));
            document.getElementById('formTitle').innerHTML = {terima:'📥 Nota Penerimaan',diagnosa:'🔍 Hasil Diagnosa',selesai:'✅ Nota Selesai',ambil:'📤 Nota Ambil/Batal'}[type];
            document.getElementById('kelengkapanSection').style.display = type==='terima'?'block':'none';
            document.getElementById('diagnosaSection').style.display = type==='diagnosa'?'block':'none';
            document.getElementById('selesaiSection').style.display = type==='selesai'?'block':'none';
            document.getElementById('ambilSection').style.display = type==='ambil'?'block':'none';
        }
        function selectAmbilStatus(status) { currentStatus = status; document.getElementById('statusDiambil').classList.toggle('active', status==='diambil'); document.getElementById('statusBatal').classList.toggle('active', status==='batal'); document.getElementById('alasanBatalGroup').style.display = status==='batal'?'block':'none'; }
        function resetForm() { document.getElementById('notaForm').reset(); document.querySelectorAll('.kondisi-checkbox').forEach(c => c.classList.remove('active')); document.getElementById('kondisiLainnya').value = ''; fotoDeviceData = null; fotoDevicePath = null; let p = document.getElementById('fotoPreview'); p.innerHTML = ''; p.classList.remove('show'); resetPattern(); document.getElementById('passwordDeviceText').value = ''; selectType('terima'); selectAmbilStatus('diambil'); hitungSisa(); localStorage.removeItem('nota_draft'); }
        function buatNotaBaru() { resetForm(); document.getElementById('previewCard').classList.remove('active'); document.getElementById('formCard').classList.add('active'); currentNota = null; delete window._lanjutOriginalId; }
        function backToForm() { document.querySelectorAll('.history-card, .settings-card, .preview-card').forEach(c=>c.classList.remove('active')); document.getElementById('formCard').classList.add('active'); delete window._lanjutOriginalId; }
        function showHistory() { renderHistory(); document.querySelectorAll('.form-card, .preview-card, .settings-card').forEach(c=>c.classList.remove('active')); document.getElementById('historyCard').classList.add('active'); }
        function showSettings() {
            document.getElementById('settingNamaToko').value = tokoSettings.nama||'';
            document.getElementById('settingSlogan').value = tokoSettings.slogan||'';
            document.getElementById('settingPrimaryColor').value = tokoSettings.primaryColor||'#667eea';
            document.getElementById('primaryColorPreview').style.backgroundColor = tokoSettings.primaryColor||'#667eea';
            document.getElementById('settingAlamat').value = tokoSettings.alamat||'';
            document.getElementById('settingTelepon').value = tokoSettings.telepon||'';
            document.getElementById('templateText').value = localStorage.getItem('wa_template')||'';
            document.getElementById('printerSize').value = localStorage.getItem('printer_size')||'58';
            autoWASelesai = localStorage.getItem('auto_wa_selesai') === 'true'; autoWAAmbil = localStorage.getItem('auto_wa_ambil') === 'true';
            document.getElementById('autoWASelesai').checked = autoWASelesai; document.getElementById('autoWAAmbil').checked = autoWAAmbil;
            waNotifTemplate = localStorage.getItem('wa_notif_template') || "Halo {nama}, perangkat {device} Anda sudah *{status}*. Silakan ambil di toko kami. Terima kasih 🙏\n\n{nota_id}";
            document.getElementById('waNotifTemplate').value = waNotifTemplate;
            let f = JSON.parse(localStorage.getItem('footers_settings')||'{}'); footers = {...footers, ...f};
            document.getElementById('footerTerimaText').value = footers.terima.text; document.getElementById('footerTerimaEnabled').checked = footers.terima.enabled;
            document.getElementById('footerDiagnosaText').value = footers.diagnosa.text; document.getElementById('footerDiagnosaEnabled').checked = footers.diagnosa.enabled;
            document.getElementById('footerSelesaiText').value = footers.selesai.text; document.getElementById('footerSelesaiEnabled').checked = footers.selesai.enabled;
            document.getElementById('footerAmbilText').value = footers.ambil.text; document.getElementById('footerAmbilEnabled').checked = footers.ambil.enabled;
            document.getElementById('skText').value = skText;
            if(logoData) document.getElementById('logoPreview').innerHTML = `<img src="${logoData}" style="max-width:100%;max-height:100%;">`;
            document.getElementById('printerDeviceId').value = lastPrinterId;
            autoPrint = localStorage.getItem('auto_print') === 'true'; document.getElementById('autoPrintCheckbox').checked = autoPrint;
            document.querySelectorAll('.form-card, .preview-card, .history-card').forEach(c=>c.classList.remove('active'));
            document.getElementById('settingsCard').classList.add('active');
        }
        function saveSettings() {
            tokoSettings = { nama: document.getElementById('settingNamaToko').value, slogan: document.getElementById('settingSlogan').value, primaryColor: document.getElementById('settingPrimaryColor').value, alamat: document.getElementById('settingAlamat').value, telepon: document.getElementById('settingTelepon').value };
            localStorage.setItem('toko_settings', JSON.stringify(tokoSettings));
            localStorage.setItem('wa_template', document.getElementById('templateText').value);
            localStorage.setItem('printer_size', document.getElementById('printerSize').value);
            autoWASelesai = document.getElementById('autoWASelesai').checked; autoWAAmbil = document.getElementById('autoWAAmbil').checked;
            localStorage.setItem('auto_wa_selesai', autoWASelesai); localStorage.setItem('auto_wa_ambil', autoWAAmbil);
            waNotifTemplate = document.getElementById('waNotifTemplate').value; localStorage.setItem('wa_notif_template', waNotifTemplate);
            footers = { terima: {text: document.getElementById('footerTerimaText').value, enabled: document.getElementById('footerTerimaEnabled').checked}, diagnosa: {text: document.getElementById('footerDiagnosaText').value, enabled: document.getElementById('footerDiagnosaEnabled').checked}, selesai: {text: document.getElementById('footerSelesaiText').value, enabled: document.getElementById('footerSelesaiEnabled').checked}, ambil: {text: document.getElementById('footerAmbilText').value, enabled: document.getElementById('footerAmbilEnabled').checked} };
            localStorage.setItem('footers_settings', JSON.stringify(footers));
            skText = document.getElementById('skText').value; localStorage.setItem('sk_text', skText);
            autoPrint = document.getElementById('autoPrintCheckbox').checked; localStorage.setItem('auto_print', autoPrint);
            document.getElementById('tokoNameDisplay').innerText = tokoSettings.nama||'Nota Service HP';
            document.getElementById('tokoSloganDisplay').innerText = tokoSettings.slogan||'';
            if(tokoSettings.primaryColor){ document.documentElement.style.setProperty('--primary', tokoSettings.primaryColor); document.getElementById('themeColorMeta').setAttribute('content', tokoSettings.primaryColor); }
            showToast('Pengaturan disimpan'); backToForm();
        }
        function handleLogo(e) {
            let f = e.target.files[0]; if(!f) return; if(f.size > 500*1024) return showToast('Logo max 500KB');
            let r = new FileReader();
            r.onload = ev => { logoData = ev.target.result; localStorage.setItem('toko_logo', logoData); document.getElementById('logoPreview').innerHTML = `<img src="${logoData}" style="max-width:100%;max-height:100%;">`; document.getElementById('headerIcon').innerHTML = `<img src="${logoData}" style="width:100%;height:100%;object-fit:contain;">`; };
            r.readAsDataURL(f);
        }
        function removeLogo() { logoData = null; localStorage.removeItem('toko_logo'); document.getElementById('logoPreview').innerHTML = '<span>Belum ada logo</span>'; document.getElementById('headerIcon').innerHTML = '📱'; showToast('Logo dihapus'); }
        function toggleDarkMode() { document.body.classList.toggle('dark-mode'); localStorage.setItem('dark_mode', document.body.classList.contains('dark-mode')); }
        async function renderHistory() {
            await loadHistory();
            let search = document.getElementById('searchHistory').value.toLowerCase(), filter = document.getElementById('filterType').value;
            let filtered = search ? historyData.filter(h => h.nama.toLowerCase().includes(search) || h.nohp.includes(search) || h.device.toLowerCase().includes(search)) : historyData;
            if(filter) filtered = filtered.filter(h => h.type === filter);
            let now = new Date(), bulanIni = historyData.filter(h => { let d = new Date(h.timestamp); return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear(); }).length;
            let selesai = historyData.filter(h => h.type==='ambil' && h.ambil?.status==='diambil').length, pending = historyData.filter(h => h.type==='terima'||h.type==='diagnosa').length;
            document.getElementById('statTotal').innerText = historyData.length; document.getElementById('statBulanIni').innerText = bulanIni; document.getElementById('statSelesai').innerText = selesai; document.getElementById('statPending').innerText = pending;
            let list = document.getElementById('historyList');
            if(!filtered.length){ list.innerHTML='<div style="text-align:center; padding:20px;">Tidak ada data</div>'; return; }
            list.innerHTML = filtered.map(h => `<div class="history-item" data-id="${escapeHtml(h.id)}"><div class="history-header"><div class="history-name">${escapeHtml(h.nama)}</div><div class="history-type ${h.type}">${h.type}</div></div><div style="font-size:13px;">📱 ${escapeHtml(h.device)} | 💰 Rp ${formatRupiah(h.totalBiaya)}</div><div style="font-size:12px;">${h.notaId} | ${h.tanggal}</div></div>`).join('');
        }
        async function loadHistoryItem(id) { let n = historyData.find(h => h.id === id); if(n){ currentNota = n; currentType = n.type; renderPreview(); updateWorkflowButtons(); document.getElementById('historyCard').classList.remove('active'); document.getElementById('previewCard').classList.add('active'); } }
        function exportCSV() { if(!historyData.length) return; let csv = '\ufeffNo,ID,OriginalID,Tanggal,Jam,Tipe,Nama,NoHP,Device,Keluhan,Kondisi,TotalBiaya,DP,Sisa,Catatan\n'; historyData.forEach((h,i)=>{ csv += [i+1,csvCell(h.notaId),csvCell(h.originalId||h.id),csvCell(h.tanggal),csvCell(h.jam),csvCell(h.type),csvCell(h.nama),csvCell(h.nohp),csvCell(h.device),csvCell(h.keluhan),csvCell((h.kondisi||[]).join(';')),h.totalBiaya||0,h.dp||0,h.sisa||0,csvCell(h.catatan||'')].join(',') + '\n'; }); if (isCapacitor()) { shareFile(`Riwayat_${new Date().toISOString().slice(0,10)}.csv`, textToB64(csv), 'text/csv', 'Riwayat Nota').catch(e => showToast('Gagal: ' + e.message)); return; } let blob = new Blob([csv],{type:'text/csv;charset=utf-8;'}), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Riwayat_${new Date().toISOString().slice(0,10)}.csv`; a.click(); }
        function exportJSON() { if (isCapacitor()) { return backupToDrive(); } let data = { settings:tokoSettings, history:historyData.map(({passwordDevice, ...n}) => n), logo:logoData, footers, sk:skText, autoWASelesai, autoWAAmbil, waNotifTemplate, exported:new Date(), note: 'Data password/pola perangkat sengaja tidak disertakan demi keamanan.' }; let json = JSON.stringify(data,null,2), blob = new Blob([json],{type:'application/json'}), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Backup_${new Date().toISOString().slice(0,10)}.json`; a.click(); }
        async function restoreData(e) {
            let f = e.target.files[0]; if(!f) return;
            if(!confirm('⚠️ Restore akan MENIMPA nota ber-ID sama dan menimpa pengaturan. Nota lain yang sudah ada tetap dipertahankan. Lanjutkan?')) { e.target.value=''; return; }
            showLoading();
            let r = new FileReader();
            r.onload = async ev => {
                try {
                    let d = JSON.parse(ev.target.result);
                    if(!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('Format backup tidak valid');
                    let notas = Array.isArray(d.history) ? d.history.map(sanitizeNota).filter(Boolean) : [];
                    if(Array.isArray(d.history) && d.history.length && !notas.length) throw new Error('Tidak ada nota valid di backup');
                    for(let n of notas) await saveToDB(n);
                    if(d.settings && typeof d.settings === 'object' && !Array.isArray(d.settings)) { tokoSettings = {}; ['nama','slogan','alamat','telepon','primaryColor'].forEach(k => { if(typeof d.settings[k] === 'string') tokoSettings[k] = d.settings[k]; }); localStorage.setItem('toko_settings', JSON.stringify(tokoSettings)); }
                    if(d.logo) { if(isSafeImg(d.logo)) { logoData = d.logo; localStorage.setItem('toko_logo', logoData); } }
                    if(d.footers && typeof d.footers === 'object') { ['terima','diagnosa','selesai','ambil'].forEach(k => { const x = d.footers[k]; if(x && typeof x === 'object') footers[k] = { text: String(x.text||''), enabled: !!x.enabled }; }); localStorage.setItem('footers_settings', JSON.stringify(footers)); }
                    if(typeof d.sk === 'string') { skText = d.sk; localStorage.setItem('sk_text', skText); }
                    if(typeof d.autoWASelesai === 'boolean') { autoWASelesai = d.autoWASelesai; localStorage.setItem('auto_wa_selesai', autoWASelesai); }
                    if(typeof d.autoWAAmbil === 'boolean') { autoWAAmbil = d.autoWAAmbil; localStorage.setItem('auto_wa_ambil', autoWAAmbil); }
                    if(typeof d.waNotifTemplate === 'string') { waNotifTemplate = d.waNotifTemplate; localStorage.setItem('wa_notif_template', waNotifTemplate); }
                    showToast(`Restore berhasil (${notas.length} nota), reload...`); setTimeout(()=>location.reload(),1200);
                } catch(err) { showToast('Gagal restore: ' + err.message); }
                hideLoading(); e.target.value='';
            };
            r.onerror = () => { hideLoading(); showToast('Gagal membaca file'); };
            r.readAsText(f);
        }
        function clearAllData() {
            if(!confirm('⚠️ Hapus semua data? Tidak bisa dikembalikan!')) return;
            if(historyData.length && confirm('Unduh backup dulu sebelum menghapus? (disarankan)')) { try { exportJSON(); } catch(e) {} }
            if(!confirm('Yakin hapus SEMUA data sekarang?')) return;
            ['wa_template','wa_notif_template','auto_wa_selesai','auto_wa_ambil','nota_draft','printer_size','last_printer_id','footers_settings','auto_print','toko_settings','toko_logo','sk_text','dark_mode','mask_pwd'].forEach(k => localStorage.removeItem(k));
            if(db) { db.close(); db = null; }
            const req = indexedDB.deleteDatabase('NotaServiceDB');
            const done = () => { showToast('Semua data dihapus'); setTimeout(()=>location.reload(),1000); };
            req.onsuccess = done; req.onerror = done; req.onblocked = done;
        }

        async function init() {
            await initDB();
            let saved = localStorage.getItem('toko_settings'); if(saved) tokoSettings = JSON.parse(saved);
            logoData = localStorage.getItem('toko_logo'); if(!isSafeImg(logoData)) logoData = null; if(logoData) document.getElementById('headerIcon').innerHTML = `<img src="${logoData}" style="width:100%;height:100%;object-fit:contain;">`;
            if(localStorage.getItem('dark_mode') === 'true') document.body.classList.add('dark-mode');
            let f = localStorage.getItem('footers_settings'); if(f) footers = JSON.parse(f);
            skText = localStorage.getItem('sk_text') || '• Resiko kehilangan data bukan tanggung jawab kami.\n• Barang tidak diambil dalam 30 hari dianggap hangus.\n• Garansi hanya berlaku pada sparepart yang diganti.';
            if(!localStorage.getItem('wa_template')) localStorage.setItem('wa_template', '*{toko}*\n━━━━━━━━━━━━━━━\n{type_badge}\n━━━━━━━━━━━━━━━\n\n🆔 No: *{nota_id}*\n📅 {tanggal} | ⏰ {jam}\n\n👤 *Pelanggan:* {nama}\n📱 *Device:* {device}\n\n📋 *Keluhan:*\n{keluhan}\n\n{kelengkapan_line}\n💰 *Estimasi Biaya:* Rp {biaya}\n⏳ *Estimasi Waktu:* {estimasi}\n\n📝 *Catatan:* {catatan}\n\n━━━━━━━━━━━━\n{footer}');
            autoWASelesai = localStorage.getItem('auto_wa_selesai') === 'true'; autoWAAmbil = localStorage.getItem('auto_wa_ambil') === 'true';
            waNotifTemplate = localStorage.getItem('wa_notif_template') || "Halo {nama}, perangkat {device} Anda sudah *{status}*. Silakan ambil di toko kami. Terima kasih 🙏\n\n{nota_id}";
            lastPrinterId = localStorage.getItem('last_printer_id') || ''; autoPrint = localStorage.getItem('auto_print') === 'true'; document.getElementById('autoPrintCheckbox').checked = autoPrint;
            document.getElementById('tokoNameDisplay').innerText = tokoSettings.nama||'Nota Service HP'; document.getElementById('tokoSloganDisplay').innerText = tokoSettings.slogan||'';
            if(tokoSettings.primaryColor){ document.documentElement.style.setProperty('--primary', tokoSettings.primaryColor); document.getElementById('themeColorMeta').setAttribute('content', tokoSettings.primaryColor); }
            let draft = localStorage.getItem('nota_draft');
            if(draft){ let d = JSON.parse(draft); if((new Date() - new Date(d.timestamp)) < 24*3600000){ document.getElementById('nama').value = d.nama||''; document.getElementById('nohp').value = d.nohp||''; document.getElementById('merek').value = d.merek||''; document.getElementById('model').value = d.model||''; document.getElementById('keluhan').value = d.keluhan||''; } }
            document.querySelectorAll('#nama, #nohp, #merek, #model, #keluhan').forEach(inp => inp.addEventListener('input',()=>{ localStorage.setItem('nota_draft', JSON.stringify({ nama:document.getElementById('nama').value, nohp:document.getElementById('nohp').value, merek:document.getElementById('merek').value, model:document.getElementById('model').value, keluhan:document.getElementById('keluhan').value, timestamp:new Date() })); }));
            document.querySelectorAll('.kondisi-checkbox').forEach(el => el.addEventListener('click',()=>el.classList.toggle('active')));
            if(!navigator.onLine) document.getElementById('connectionStatus').classList.add('offline');
            await loadHistory(); initPatternCanvas();
            let mi = document.getElementById('passwordDeviceText');
            if (mi) mi.addEventListener('input', function() { if (this.value.trim()) { patternPath = []; drawPatternCanvas(); document.getElementById('passwordDevice').value = this.value; document.getElementById('patternInfo').innerHTML = `📝 Teks: ${this.value}`; } else updatePatternOutput(); });
        }

        async function sendAutoWA(nota, statusType) {
            if (!nota.nohp) return;
            let template = waNotifTemplate || "Halo {nama}, perangkat {device} Anda sudah *{status}*. Silakan ambil di toko kami. Terima kasih 🙏\n\n{nota_id}";
            let statusText = statusType === 'selesai' ? 'SELESAI diperbaiki' : 'SIAP DIAMBIL';
            let msg = template.replace(/{nama}/g, () => unesc(nota.nama)).replace(/{device}/g, () => unesc(nota.device)).replace(/{nota_id}/g, nota.notaId).replace(/{toko}/g, tokoSettings.nama || 'Service HP').replace(/{status}/g, statusText);
            window.open(`https://wa.me/${normalizePhone(nota.nohp)}?text=${encodeURIComponent(msg)}`, '_blank');
            showToast(`Notifikasi WA dikirim ke ${nota.nama}`);
        }

        return { init, selectType, selectAmbilStatus, buatPreview, renderPreview, updateWorkflowButtons, lanjutKe, kirimWA, printBluetooth, generatePDF, exportCSV, exportJSON, restoreData, clearAllData, showHistory, showSettings, saveSettings, handleLogo, removeLogo, toggleDarkMode, backToForm, buatNotaBaru, resetForm, importContact, handleFotoDevice, cleanPhoneInput, validatePhone, hitungSisa, loadHistoryItem, renderHistory, backupData: exportJSON, backupToDrive, previewThermal, closeThermalPreview, saveContact, savePrinterId, clearPrinterId, resetPattern, clearPattern };
    })();

    (async () => {
    await app.init();
    window.app = app;
    console.log('✅ Aplikasi Nota Service HP berhasil diinisialisasi');

    const fotoIn = document.getElementById('fotoDevice');
    if (fotoIn) fotoIn.addEventListener('click', e => { if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) { e.preventDefault(); app.handleFotoDevice(fotoIn); } });
    document.getElementById('historyList').addEventListener('click', e => { const it = e.target.closest('[data-id]'); if (it) app.loadHistoryItem(it.dataset.id); });
    const maskCb = document.getElementById('maskPwdCheckbox'); if (maskCb) maskCb.checked = localStorage.getItem('mask_pwd') === 'true';

    if ('serviceWorker' in navigator && typeof Capacitor === 'undefined' && location.protocol.startsWith('http')) {
        fetch('./service-worker.js', { method: 'HEAD' }).then(r => { if (r.ok) return navigator.serviceWorker.register('./service-worker.js'); }).catch(() => {});
    }
    })();
