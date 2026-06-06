/**
 * database.js — Single Source of Truth (Supabase Edition)
 * Menggantikan data.json dengan Supabase sebagai backend.
 *
 * Semua modul lain (app.js, ui.js) TIDAK BERUBAH —
 * hanya file ini yang tahu tentang Supabase.
 */

const Database = (() => {
  let _supabase = null;

  /**
   * Inisialisasi Supabase client (lazy — hanya sekali)
   */
  function _getClient() {
    if (_supabase) return _supabase;

    if (!SUPABASE_CONFIG.url || SUPABASE_CONFIG.url.includes('GANTI')) {
      throw new Error('Supabase belum dikonfigurasi. Isi SUPABASE_CONFIG di js/supabase-config.js');
    }

    _supabase = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    console.log('[DB] Supabase client siap.');
    return _supabase;
  }

  /**
   * Cari produk berdasarkan barcode
   * @param {string} barcode
   * @returns {object|null}
   */
  async function findByBarcode(barcode) {
    const client = _getClient();
    const { data, error } = await client
      .from(SUPABASE_CONFIG.tableName)
      .select('*')
      .eq('barcode', String(barcode).trim())
      .maybeSingle();

    if (error) {
      console.error('[DB] findByBarcode error:', error.message);
      throw new Error('Gagal mencari produk: ' + error.message);
    }

    return data || null;
  }

  /**
   * Ambil semua produk (untuk halaman admin)
   */
  async function getAll() {
    const client = _getClient();
    const { data, error } = await client
      .from(SUPABASE_CONFIG.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error('Gagal mengambil data: ' + error.message);
    return data || [];
  }

  /**
   * Tambah produk baru
   * @param {object} produk - { barcode, nama, deskripsi, dimensi, berat, harga, model_url, poster_url }
   */
  async function insert(produk) {
    const client = _getClient();
    const { data, error } = await client
      .from(SUPABASE_CONFIG.tableName)
      .insert([produk])
      .select()
      .single();

    if (error) throw new Error('Gagal menambah produk: ' + error.message);
    return data;
  }

  /**
   * Update produk berdasarkan id
   * @param {string} id
   * @param {object} updates
   */
  async function update(id, updates) {
    const client = _getClient();
    const { data, error } = await client
      .from(SUPABASE_CONFIG.tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error('Gagal update produk: ' + error.message);
    return data;
  }

  /**
   * Hapus produk berdasarkan id
   * @param {string} id
   */
  async function remove(id) {
    const client = _getClient();
    const { error } = await client
      .from(SUPABASE_CONFIG.tableName)
      .delete()
      .eq('id', id);

    if (error) throw new Error('Gagal menghapus produk: ' + error.message);
    return true;
  }

  /**
   * Upload file ke Supabase Storage
   * @param {File} file - File object dari input
   * @param {string} folder - 'models' atau 'posters'
   * @returns {string} public URL file
   */
  async function uploadFile(file, folder) {
    const client = _getClient();
    const ext = file.name.split('.').pop();
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await client.storage
      .from(SUPABASE_CONFIG.storageBucket)
      .upload(filename, file, { upsert: false });

    if (uploadError) throw new Error('Gagal upload file: ' + uploadError.message);

    const { data } = client.storage
      .from(SUPABASE_CONFIG.storageBucket)
      .getPublicUrl(filename);

    return data.publicUrl;
  }

  /**
   * Hapus file dari Storage berdasarkan public URL
   * @param {string} publicUrl
   */
  async function deleteFile(publicUrl) {
    try {
      const client = _getClient();
      // Ekstrak path dari URL
      const url = new URL(publicUrl);
      const pathParts = url.pathname.split(`/storage/v1/object/public/${SUPABASE_CONFIG.storageBucket}/`);
      if (pathParts.length < 2) return;
      const filePath = pathParts[1];

      await client.storage.from(SUPABASE_CONFIG.storageBucket).remove([filePath]);
    } catch (e) {
      console.warn('[DB] deleteFile warning (non-fatal):', e.message);
    }
  }

  // Expose load() agar app.js tidak perlu diubah (backward compatible)
  async function load() {
    _getClient(); // Validasi config saja
    return {};
  }

  return { findByBarcode, getAll, insert, update, remove, uploadFile, deleteFile, load };
})();
