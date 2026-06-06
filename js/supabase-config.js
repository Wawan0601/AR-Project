/**
 * supabase-config.js — Konfigurasi Supabase
 * ⭐ SINGLE SOURCE OF TRUTH untuk semua kredensial Supabase.
 *
 * CARA ISI:
 * 1. Buka https://supabase.com → masuk ke project Anda
 * 2. Klik Settings (gear icon) → API
 * 3. Copy "Project URL" → isi SUPABASE_URL
 * 4. Copy "anon public" key → isi SUPABASE_ANON_KEY
 *
 * File ini dipakai oleh: database.js, admin.js
 * JANGAN commit file ini ke GitHub publik jika key bersifat sensitif.
 * (anon key aman untuk public, tapi tetap jaga RLS di Supabase)
 */

const SUPABASE_CONFIG = {
  url: 'https://abcd1234.supabase.co',      // contoh: https://abcdefgh.supabase.co
  anonKey: 'eyJhbGc...',     // contoh: eyJhbGci...

  // Nama bucket Storage untuk file .glb dan foto produk
  storageBucket: 'produk-assets',

  // Nama tabel di database Supabase
  tableName: 'produk',
};

// Freeze agar tidak ada yang tidak sengaja mengubahnya
Object.freeze(SUPABASE_CONFIG);
