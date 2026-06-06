/**
 * app.js — Orchestrator Utama
 * Menghubungkan Scanner, Database, dan UI.
 * Ini satu-satunya file yang boleh memanggil modul lain secara langsung.
 *
 * Alur:
 * User klik "Mulai Scan" → Scanner.start()
 *   → Barcode terdeteksi → Database.findByBarcode()
 *     → Produk ditemukan → UI.showProduct()
 *     → Produk tidak ditemukan → UI.setStatus('error')
 * User klik "Lihat AR" → UI.activateAR()
 * User klik "Lihat 3D" → UI.showModelViewer()
 * User klik "Scan Lagi" → reset()
 */

document.addEventListener('DOMContentLoaded', async () => {
  // === PRELOAD DATABASE ===
  try {
    await Database.load();
    console.log('[App] Database siap.');
  } catch (err) {
    console.error('[App] Gagal load database:', err);
  }

  // === INISIALISASI SCANNER ===
  Scanner.init(handleBarcode);

  // === EVENT LISTENERS ===

  // 1. Tombol "Mulai Scan"
  document.getElementById('btn-start-scanner').addEventListener('click', async () => {
    const btn = document.getElementById('btn-start-scanner');
    btn.innerHTML = `<span class="spinner"></span> Membuka kamera...`;
    btn.disabled = true;

    try {
      await Scanner.start();
      UI.setScannerActive(true);
      UI.setStatus('scanning', 'Kamera aktif — arahkan ke barcode produk');
    } catch (err) {
      UI.setStatus('error', err.message);
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
        Mulai Scan Barcode`;
      btn.disabled = false;
    }
  });

  // 2. Tombol "Lihat di Ruangan (AR)"
  document.getElementById('btn-ar').addEventListener('click', () => {
    const product = UI.getCurrentProduct();
    if (!product) return;

    // Cek apakah WebXR/AR didukung
    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
        if (supported) {
          UI.activateAR(product);
        } else {
          // Fallback ke 3D viewer
          alert('Perangkat Anda belum mendukung AR. Menampilkan mode 3D Viewer saja.');
          UI.showModelViewer(product);
        }
      });
    } else {
      // Fallback ke 3D viewer
      UI.showModelViewer(product);
    }
  });

  // 3. Tombol "Lihat 3D Saja"
  document.getElementById('btn-3d-viewer').addEventListener('click', () => {
    const product = UI.getCurrentProduct();
    if (!product) return;
    UI.showModelViewer(product);
  });

  // 4. Tombol "Tutup Viewer"
  document.getElementById('btn-close-viewer').addEventListener('click', () => {
    UI.hideModelViewer();
  });

  // 5. Tombol "Scan Produk Lain"
  document.getElementById('btn-scan-again').addEventListener('click', async () => {
    UI.reset();

    const btn = document.getElementById('btn-start-scanner');
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
      Mulai Scan Barcode`;
    btn.disabled = false;

    // Jika scanner masih jalan, stop dulu
    if (Scanner.getIsRunning()) {
      await Scanner.stop();
    }
  });

  // 6. Manual input — klik kode contoh atau ketik sendiri
  document.getElementById('btn-manual-search').addEventListener('click', () => {
    const barcode = document.getElementById('manual-input').value.trim();
    if (!barcode) return;
    handleBarcode(barcode);
  });

  document.getElementById('manual-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const barcode = e.target.value.trim();
      if (barcode) handleBarcode(barcode);
    }
  });

  // 7. Klik barcode contoh di helper section
  document.querySelectorAll('.helper-code').forEach(el => {
    el.addEventListener('click', () => {
      const barcode = el.dataset.barcode;
      if (barcode) {
        document.getElementById('manual-input').value = barcode;
        handleBarcode(barcode);

        // Scroll ke scanner
        document.getElementById('scanner-card').scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});

/**
 * Handler utama saat barcode berhasil discan atau diinput manual
 */
async function handleBarcode(barcode) {
  console.log('[App] Barcode:', barcode);

  // Stop scanner setelah sukses
  if (Scanner.getIsRunning()) {
    await Scanner.stop();
  }

  UI.setStatus('scanning', `Mencari produk: ${barcode}...`);

  try {
    const product = await Database.findByBarcode(barcode);

    if (product) {
      UI.setStatus('success', `Produk ditemukan: ${product.nama}`);
      UI.showProduct(barcode, product);
    } else {
      UI.setStatus('error', `Produk dengan barcode "${barcode}" tidak ditemukan di database.`);
      UI.setScannerActive(false);

      // Aktifkan scanner lagi setelah 2 detik
      const btn = document.getElementById('btn-start-scanner');
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
        Scan Lagi`;
      btn.disabled = false;
    }
  } catch (err) {
    console.error('[App] Error:', err);
    UI.setStatus('error', 'Terjadi kesalahan saat mencari produk.');
  }
}
