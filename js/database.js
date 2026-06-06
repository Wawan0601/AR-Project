/**
 * database.js — Single Source of Truth
 * Semua data produk diambil dari data.json.
 * Modul ini menjadi satu-satunya jembatan antara UI dan data.
 */

const Database = (() => {
  let _products = null; // Cache produk setelah fetch pertama

  /**
   * Load data dari data.json (hanya sekali, lalu di-cache)
   */
  async function load() {
    if (_products) return _products; // Return cache jika sudah ada
    try {
      const response = await fetch('./data.json');
      if (!response.ok) throw new Error(`Gagal memuat data.json: ${response.status}`);
      _products = await response.json();
      console.log(`[DB] Loaded ${Object.keys(_products).length} produk.`);
      return _products;
    } catch (err) {
      console.error('[DB] Error:', err);
      throw err;
    }
  }

  /**
   * Cari produk berdasarkan barcode
   * @param {string} barcode - kode barcode yang discan
   * @returns {object|null} data produk atau null jika tidak ditemukan
   */
  async function findByBarcode(barcode) {
    const data = await load();
    const trimmed = String(barcode).trim();
    return data[trimmed] || null;
  }

  /**
   * Dapatkan semua produk (untuk keperluan debug/admin)
   */
  async function getAll() {
    return await load();
  }

  return { findByBarcode, getAll, load };
})();
