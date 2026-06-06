/**
 * database.js — Single Source of Truth
 * Semua data produk diambil dari data.json.
 *
 * FIX: Gunakan path relatif yang benar untuk GitHub Pages subfolder.
 * document.currentScript tidak bisa dipakai di defer, jadi kita
 * deteksi base path dari window.location secara otomatis.
 */

const Database = (() => {
  let _products = null;

  /**
   * Deteksi base URL otomatis — bekerja di Vercel, GitHub Pages subfolder,
   * maupun localhost tanpa perlu konfigurasi manual.
   */
  function _getBaseUrl() {
    // Ambil path folder dari URL yang sedang dibuka
    // Contoh: https://wawan0601.github.io/AR-Project/index.html
    //   → base = https://wawan0601.github.io/AR-Project/
    const scripts = document.getElementsByTagName('script');
    for (const s of scripts) {
      if (s.src && s.src.includes('database.js')) {
        // database.js ada di /js/database.js → naik 1 level ke root
        return s.src.replace('/js/database.js', '/');
      }
    }
    // Fallback: pakai lokasi halaman saat ini
    return window.location.href.replace(/\/[^/]*$/, '/');
  }

  async function load() {
    if (_products) return _products;
    try {
      const base = _getBaseUrl();
      const url = base + 'data.json';
      console.log('[DB] Fetching:', url);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Gagal memuat data.json: ${response.status}`);
      _products = await response.json();
      console.log(`[DB] Loaded ${Object.keys(_products).length} produk.`);
      return _products;
    } catch (err) {
      console.error('[DB] Error:', err);
      throw err;
    }
  }

  async function findByBarcode(barcode) {
    const data = await load();
    const trimmed = String(barcode).trim();
    return data[trimmed] || null;
  }

  async function getAll() {
    return await load();
  }

  return { findByBarcode, getAll, load };
})();
