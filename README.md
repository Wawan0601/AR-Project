# 📱 Web AR Barcode Scanner — Setup Guide

Panduan lengkap untuk men-deploy proyek ini dari nol hingga live.

---

## 📁 Struktur Folder Proyek

```
web-ar-scanner/
│
├── index.html          ← Halaman utama (entry point)
├── data.json           ← ⭐ DATABASE PRODUK (Single Source of Truth)
├── manifest.json       ← PWA manifest
│
├── css/
│   └── style.css       ← Semua styling
│
├── js/
│   ├── database.js     ← Loader & pencari data produk
│   ├── scanner.js      ← Modul kamera & barcode scanner
│   ├── ui.js           ← Renderer tampilan (product card, AR viewer)
│   └── app.js          ← Orchestrator utama
│
└── assets/             ← ⚠️ ANDA YANG ISI INI
    ├── icon-192.png    ← Icon PWA (buat sendiri)
    ├── icon-512.png    ← Icon PWA besar
    ├── kursi_estetik.glb       ← Model 3D produk Anda
    ├── kursi_preview.jpg       ← Foto preview produk
    └── ... (tambah produk lain)
```

---

## 🗄️ Cara Menambah Produk Baru

Edit file `data.json`. Ini adalah **satu-satunya file** yang perlu Anda ubah untuk menambah produk.

### Format:
```json
{
  "KODE_BARCODE_PRODUK": {
    "nama": "Nama Produk",
    "deskripsi": "Deskripsi singkat produk.",
    "dimensi": "P x L x T cm",
    "berat": "X kg",
    "modelUrl": "/assets/nama_file.glb",
    "posterUrl": "/assets/foto_preview.jpg",
    "harga": "Rp X.XXX.XXX"
  }
}
```

### Contoh nyata:
```json
{
  "8901234567890": {
    "nama": "Kursi Estetik Minimalis",
    "deskripsi": "Kursi kayu jati dengan bantal linen abu-abu.",
    "dimensi": "60cm × 60cm × 85cm",
    "berat": "8 kg",
    "modelUrl": "/assets/kursi_estetik.glb",
    "posterUrl": "/assets/kursi_preview.jpg",
    "harga": "Rp 1.250.000"
  }
}
```

> 💡 **Tip:** Kode barcode pada JSON HARUS sama persis dengan barcode fisik di produk Anda (termasuk jumlah digit).

---

## 🎨 Persiapan File 3D (.glb)

Sebelum deploy, siapkan model 3D produk Anda:

### Checklist model .glb:
- [ ] **Format:** `.glb` (bukan `.gltf`, bukan `.obj`, bukan `.fbx`)
- [ ] **Satuan:** Meter (bukan centimeter). Kursi tinggi 80cm → di Blender nilainya **0.8**
- [ ] **Pivot/Origin:** Titik asal di bagian **BAWAH** objek (kaki/dasar), bukan tengah
- [ ] **Ukuran file:** Usahakan di bawah **5 MB** per produk
- [ ] **Test:** Buka di https://modelviewer.dev/editor/ untuk verifikasi tampilan

### Cara export dari Blender:
1. Select objek → `File > Export > glTF 2.0`
2. Format: **glTF Binary (.glb)**
3. Transform: centang **+Y Up** jika model menghadap ke atas
4. Geometry: centang **Apply Modifiers**
5. Simpan ke folder `assets/`

---

## 🚀 Deploy ke Vercel (Gratis, HTTPS Otomatis)

### Langkah 1: Buat akun GitHub
Jika belum punya, daftar di https://github.com

### Langkah 2: Upload proyek ke GitHub
```bash
# Di terminal/command prompt:
cd web-ar-scanner
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/USERNAME/web-ar-scanner.git
git push -u origin main
```

### Langkah 3: Deploy ke Vercel
1. Buka https://vercel.com → Sign in with GitHub
2. Klik **"Add New Project"**
3. Pilih repository `web-ar-scanner`
4. Klik **"Deploy"** (tanpa perlu konfigurasi apapun)
5. Selesai! Vercel otomatis memberikan URL seperti: `https://web-ar-scanner-xxx.vercel.app`

### Langkah 4: Custom domain (opsional)
Di dashboard Vercel → Settings → Domains → tambahkan domain Anda sendiri.

---

## 📱 Cara Test di HP

### Prasyarat:
- **Android:** Chrome versi terbaru (Chrome 79+)
- **iOS:** Safari versi terbaru (iOS 12+)
- Koneksi internet (untuk load library dari CDN)
- Izinkan akses kamera saat diminta

### Langkah test:
1. Buka URL Vercel di browser HP
2. Klik "Mulai Scan Barcode"
3. Izinkan akses kamera
4. Arahkan ke barcode produk
5. Klik "Lihat di Ruangan Anda (AR)"

### Test tanpa barcode fisik:
Gunakan kode contoh di bagian bawah halaman (tap untuk langsung mencari).

---

## 🔧 Test Local (tanpa deploy)

Karena akses kamera butuh HTTPS, tidak bisa langsung buka `index.html` di browser.
Gunakan server lokal:

### Opsi 1 — Python (paling mudah):
```bash
cd web-ar-scanner
python3 -m http.server 8080
# Buka: http://localhost:8080
```
> ⚠️ Kamera mungkin tidak berjalan di localhost. Gunakan ngrok untuk HTTPS lokal.

### Opsi 2 — VS Code Live Server:
Install extension "Live Server" di VS Code → klik kanan `index.html` → "Open with Live Server"

### Opsi 3 — npx serve:
```bash
npx serve .
# Atau dengan HTTPS:
npx local-ssl-proxy --source 8443 --target 8080
```

---

## ❓ Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Kamera tidak bisa dibuka | Pastikan URL menggunakan HTTPS. Localhost http:// tidak akan bisa akses kamera di Chrome mobile. |
| Barcode tidak terbaca | Pastikan pencahayaan cukup. Jaga jarak 15-30cm dari barcode. |
| AR tidak muncul | AR WebXR hanya di Chrome Android. iOS gunakan AR Quick Look via Safari. |
| Model .glb mengambang | Pivot/origin model belum di bagian bawah. Fix di Blender lalu re-export. |
| Model terlalu besar/kecil | Cek satuan di Blender sudah Meter (bukan centimeter/millimeter). |
| Produk tidak ditemukan | Periksa kode barcode di `data.json` sudah sama persis dengan barcode fisik. |

---

## 📞 Informasi Teknis

- **Library Scanner:** html5-qrcode v2.3.8 — https://github.com/mebjas/html5-qrcode
- **Library AR/3D:** Google model-viewer v3.5.0 — https://modelviewer.dev
- **Hosting:** Vercel — https://vercel.com
- **AR Mode Android:** WebXR (Chrome) + Scene Viewer
- **AR Mode iOS:** AR Quick Look (Safari)
