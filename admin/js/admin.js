/**
 * admin.js — Logika Panel Admin
 * Tambah, edit, hapus produk + upload file ke Supabase Storage
 */

// ===================== STATE =====================
let allProducts = [];
let editingId = null;
let pendingModelUrl = null;   // URL setelah upload berhasil
let pendingPosterUrl = null;
let removeModelFlag = false;
let removePosterFlag = false;

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', async () => {
  checkConfig();
  setupEventListeners();
  await loadProducts();
});

function checkConfig() {
  const isDefault = SUPABASE_CONFIG.url.includes('GANTI');
  if (isDefault) {
    document.getElementById('config-warning').classList.remove('hidden');
  }
}

// ===================== LOAD & RENDER =====================
async function loadProducts() {
  showTableState('loading');
  try {
    allProducts = await Database.getAll();
    renderTable(allProducts);
    updateStats(allProducts);
  } catch (err) {
    console.error('[Admin] loadProducts error:', err);
    showTableState('empty');
    showToast('Gagal memuat data: ' + err.message, 'error');
  }
}

function renderTable(products) {
  if (products.length === 0) {
    showTableState('empty');
    return;
  }
  showTableState('table');

  const tbody = document.getElementById('product-tbody');
  tbody.innerHTML = products.map(p => `
    <tr>
      <td>
        <div class="table-product-info">
          ${p.poster_url
            ? `<img class="table-poster" src="${p.poster_url}" alt="${p.nama}" loading="lazy" onerror="this.style.display='none'" />`
            : `<div class="table-poster-placeholder"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`
          }
          <div>
            <div class="table-product-name">${escHtml(p.nama)}</div>
            <div class="table-product-desc">${escHtml(p.deskripsi || '—')}</div>
          </div>
        </div>
      </td>
      <td><span class="barcode-tag">${escHtml(p.barcode)}</span></td>
      <td>${escHtml(p.dimensi || '—')}</td>
      <td>${escHtml(p.harga || '—')}</td>
      <td>
        <span class="asset-badge ${p.model_url ? 'yes' : 'no'}">
          ${p.model_url ? '✓ 3D' : '✗ 3D'}
        </span>
        <span class="asset-badge ${p.poster_url ? 'yes' : 'no'}" style="margin-left:4px">
          ${p.poster_url ? '✓ Foto' : '✗ Foto'}
        </span>
      </td>
      <td>
        <div class="action-buttons">
          <button class="btn-action" title="Generate Barcode" onclick="openBarcodeModal('${p.barcode}', '${escHtml(p.nama)}', '${escHtml(p.harga||'')}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="4" height="16"/><rect x="7" y="4" width="2" height="16"/><rect x="11" y="4" width="4" height="16"/><rect x="17" y="4" width="2" height="16"/><rect x="21" y="4" width="2" height="16"/></svg>
          </button>
          <button class="btn-action" title="Edit" onclick="openEditModal('${p.barcode}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-action delete" title="Hapus" onclick="openDeleteModal('${p.barcode}', '${escHtml(p.nama)}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function updateStats(products) {
  document.getElementById('stat-total').textContent = products.length;
  document.getElementById('stat-with-model').textContent = products.filter(p => p.model_url).length;
  document.getElementById('stat-with-poster').textContent = products.filter(p => p.poster_url).length;
}

function showTableState(state) {
  document.getElementById('table-loading').classList.toggle('hidden', state !== 'loading');
  document.getElementById('table-empty').classList.toggle('hidden', state !== 'empty');
  document.getElementById('table-wrapper').classList.toggle('hidden', state !== 'table');
}

// ===================== SEARCH =====================
document.getElementById('search-input').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  const filtered = allProducts.filter(p =>
    p.nama.toLowerCase().includes(q) ||
    p.barcode.toLowerCase().includes(q) ||
    (p.deskripsi || '').toLowerCase().includes(q)
  );
  renderTable(filtered);
});

// ===================== MODAL TAMBAH/EDIT =====================
function openAddModal() {
  editingId = null;
  pendingModelUrl = null;
  pendingPosterUrl = null;
  removeModelFlag = false;
  removePosterFlag = false;

  document.getElementById('modal-title').textContent = 'Tambah Produk';
  document.getElementById('btn-submit-text').textContent = 'Simpan Produk';
  document.getElementById('product-form').reset();
  document.getElementById('form-id').value = '';
  document.getElementById('form-barcode').readOnly = false;
  document.getElementById('form-barcode').style.opacity = '1';
  document.getElementById('form-barcode').title = '';

  // Reset file previews
  hideCurrentAsset('model');
  hideCurrentAsset('poster');
  document.getElementById('poster-preview').classList.add('hidden');
  document.getElementById('poster-preview-img').src = '';
  document.getElementById('form-model-file').value = '';
  document.getElementById('form-poster-file').value = '';

  showModal('modal-overlay');
}

function openEditModal(barcode) {
  const p = allProducts.find(x => x.barcode === barcode);
  if (!p) return;

  editingId = barcode;
  pendingModelUrl = null;
  pendingPosterUrl = null;
  removeModelFlag = false;
  removePosterFlag = false;

  document.getElementById('modal-title').textContent = 'Edit Produk';
  document.getElementById('btn-submit-text').textContent = 'Simpan Perubahan';
  document.getElementById('form-id').value = p.barcode;
  document.getElementById('form-barcode').value = p.barcode;
  document.getElementById('form-barcode').readOnly = true;
  document.getElementById('form-barcode').style.opacity = '0.6';
  document.getElementById('form-barcode').title = 'Barcode tidak bisa diubah (primary key)';
  document.getElementById('form-nama').value = p.nama;
  document.getElementById('form-deskripsi').value = p.deskripsi || '';
  document.getElementById('form-dimensi').value = p.dimensi || '';
  document.getElementById('form-berat').value = p.berat || '';
  document.getElementById('form-harga').value = p.harga || '';

  // Tampilkan asset saat ini
  if (p.model_url) {
    showCurrentAsset('model', p.model_url);
  } else {
    hideCurrentAsset('model');
  }

  if (p.poster_url) {
    showCurrentAsset('poster', p.poster_url);
    document.getElementById('poster-preview').classList.add('hidden');
  } else {
    hideCurrentAsset('poster');
    document.getElementById('poster-preview').classList.add('hidden');
  }

  document.getElementById('form-error').classList.add('hidden');
  showModal('modal-overlay');
}

function showCurrentAsset(type, url) {
  const el = document.getElementById(`current-${type}-url`);
  const link = document.getElementById(`current-${type}-link`);
  if (!el || !link) return;
  el.style.display = 'flex';
  link.href = url;
  const filename = url.split('/').pop();
  link.textContent = filename.length > 40 ? filename.substring(0, 40) + '...' : filename;
}

function hideCurrentAsset(type) {
  const el = document.getElementById(`current-${type}-url`);
  if (el) el.style.display = 'none';
}

// ===================== FORM SUBMIT =====================
document.getElementById('product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-form');
  const errEl = document.getElementById('form-error');
  errEl.classList.add('hidden');
  btn.disabled = true;
  document.getElementById('btn-submit-text').textContent = 'Menyimpan...';

  try {
    const barcode = document.getElementById('form-barcode').value.trim();
    const nama = document.getElementById('form-nama').value.trim();

    if (!barcode || !nama) throw new Error('Barcode dan nama produk wajib diisi.');

    // Upload model jika ada file baru
    let modelUrl = pendingModelUrl;
    const modelFile = document.getElementById('form-model-file').files[0];
    if (modelFile) {
      showUploadProgress('model', 0, 'Mengupload model 3D...');
      modelUrl = await Database.uploadFile(modelFile, 'models');
      hideUploadProgress('model');
    } else if (removeModelFlag) {
      modelUrl = null;
    } else if (editingId) {
      // Pertahankan URL lama jika tidak ada perubahan
      modelUrl = allProducts.find(p => p.barcode === editingId)?.model_url || null;
    }

    // Upload poster jika ada file baru
    let posterUrl = pendingPosterUrl;
    const posterFile = document.getElementById('form-poster-file').files[0];
    if (posterFile) {
      showUploadProgress('poster', 0, 'Mengupload foto...');
      posterUrl = await Database.uploadFile(posterFile, 'posters');
      hideUploadProgress('poster');
    } else if (removePosterFlag) {
      posterUrl = null;
    } else if (editingId) {
      posterUrl = allProducts.find(p => p.barcode === editingId)?.poster_url || null;
    }

    const payload = {
      nama,
      deskripsi: document.getElementById('form-deskripsi').value.trim(),
      dimensi: document.getElementById('form-dimensi').value.trim(),
      berat: document.getElementById('form-berat').value.trim(),
      harga: document.getElementById('form-harga').value.trim(),
      model_url: modelUrl || null,
      poster_url: posterUrl || null,
    };

    if (editingId) {
      // Tidak perlu sertakan barcode di payload — sudah ada di .eq()
      await Database.update(editingId, payload);
      showToast('Produk berhasil diperbarui ✓', 'success');
    } else {
      await Database.insert({ barcode, ...payload });
      showToast('Produk berhasil ditambahkan ✓', 'success');
    }

    closeModal('modal-overlay');
    await loadProducts();

  } catch (err) {
    console.error('[Admin] submit error:', err);
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    document.getElementById('btn-submit-text').textContent = editingId ? 'Simpan Perubahan' : 'Simpan Produk';
  }
});

// ===================== FILE UPLOAD PREVIEW =====================
document.getElementById('form-poster-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    document.getElementById('poster-preview-img').src = ev.target.result;
    document.getElementById('poster-preview').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
});

document.getElementById('form-model-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const content = document.getElementById('model-upload-content').querySelector('span');
  content.textContent = file.name;
});

// Remove buttons
document.getElementById('btn-remove-model').addEventListener('click', () => {
  removeModelFlag = true;
  pendingModelUrl = null;
  hideCurrentAsset('model');
  document.getElementById('form-model-file').value = '';
});

document.getElementById('btn-remove-poster').addEventListener('click', () => {
  removePosterFlag = true;
  pendingPosterUrl = null;
  hideCurrentAsset('poster');
  document.getElementById('poster-preview').classList.add('hidden');
  document.getElementById('form-poster-file').value = '';
});

function showUploadProgress(type, pct, text) {
  document.getElementById(`${type}-upload-progress`).classList.remove('hidden');
  document.getElementById(`${type}-progress-fill`).style.width = pct + '%';
  document.getElementById(`${type}-progress-text`).textContent = text;
}

function hideUploadProgress(type) {
  document.getElementById(`${type}-upload-progress`).classList.add('hidden');
}

// ===================== DELETE =====================
let deletingId = null;

function openDeleteModal(barcode, nama) {
  deletingId = barcode;
  document.getElementById('delete-product-name').textContent = nama;
  showModal('delete-modal-overlay');
}

document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
  if (!deletingId) return;
  const btn = document.getElementById('btn-confirm-delete');
  btn.disabled = true;
  btn.textContent = 'Menghapus...';

  try {
    // Hapus file aset dari Storage
    const p = allProducts.find(x => x.barcode === deletingId);
    if (p?.model_url) await Database.deleteFile(p.model_url);
    if (p?.poster_url) await Database.deleteFile(p.poster_url);

    await Database.remove(deletingId);  // deletingId = barcode
    showToast('Produk berhasil dihapus', 'success');
    closeModal('delete-modal-overlay');
    await loadProducts();
  } catch (err) {
    showToast('Gagal hapus: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Ya, Hapus';
    deletingId = null;
  }
});

// ===================== MODAL HELPERS =====================
function showModal(id) {
  document.getElementById(id).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  document.body.style.overflow = '';
}

function setupEventListeners() {
  document.getElementById('btn-tambah-produk').addEventListener('click', openAddModal);

  // Barcode modal
  document.getElementById('btn-close-barcode').addEventListener('click', () => closeModal('barcode-modal-overlay'));
  document.getElementById('btn-cancel-barcode').addEventListener('click', () => closeModal('barcode-modal-overlay'));
  document.getElementById('btn-generate-barcode').addEventListener('click', _generateBarcode);
  document.getElementById('btn-download-barcode').addEventListener('click', _downloadBarcode);
  document.getElementById('btn-print-barcode').addEventListener('click', _printBarcode);
  document.getElementById('barcode-modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal('barcode-modal-overlay');
  });
  // Auto-generate saat options berubah
  document.getElementById('barcode-width').addEventListener('change', _generateBarcode);
  document.getElementById('barcode-height').addEventListener('change', _generateBarcode);
  document.getElementById('barcode-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') _generateBarcode();
  });
  document.getElementById('btn-tambah-empty').addEventListener('click', openAddModal);
  document.getElementById('btn-close-modal').addEventListener('click', () => closeModal('modal-overlay'));
  document.getElementById('btn-cancel-modal').addEventListener('click', () => closeModal('modal-overlay'));
  document.getElementById('btn-cancel-delete').addEventListener('click', () => closeModal('delete-modal-overlay'));

  // Tutup modal klik luar
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal('modal-overlay');
  });
  document.getElementById('delete-modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal('delete-modal-overlay');
  });
}

// ===================== TOAST =====================
let toastTimer = null;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3500);
}


// ===================== BARCODE GENERATOR =====================
let _barcodeProduct = { barcode: '', nama: '', harga: '' };

function openBarcodeModal(barcode, nama, harga) {
  _barcodeProduct = { barcode, nama, harga };

  // Isi info produk
  document.getElementById('barcode-product-info').innerHTML = `
    <div>
      <div class="barcode-product-info-name">${escHtml(nama)}</div>
      <div class="barcode-product-info-code">${escHtml(barcode)}</div>
    </div>
  `;

  // Isi input barcode
  document.getElementById('barcode-input').value = barcode;
  document.getElementById('barcode-label-name').textContent = nama;
  document.getElementById('barcode-label-price').textContent = harga || '';
  document.getElementById('barcode-copies').value = 1;

  showModal('barcode-modal-overlay');
  // Generate otomatis
  _generateBarcode();
}

function _generateBarcode() {
  const code = document.getElementById('barcode-input').value.trim();
  if (!code) return;

  const width  = parseInt(document.getElementById('barcode-width').value);
  const height = parseInt(document.getElementById('barcode-height').value);

  try {
    JsBarcode('#barcode-svg', code, {
      format: 'CODE128',
      width,
      height,
      displayValue: true,
      fontSize: 14,
      margin: 8,
      background: '#ffffff',
      lineColor: '#000000',
    });
    // Update label jika kode diubah manual
    document.getElementById('barcode-label-name').textContent =
      _barcodeProduct.nama || code;
  } catch (e) {
    showToast('Format kode tidak valid untuk barcode', 'error');
  }
}

function _downloadBarcode() {
  const svg = document.getElementById('barcode-svg');
  const code = document.getElementById('barcode-input').value.trim() || 'barcode';

  // Convert SVG → Canvas → PNG
  const svgData = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const padding = 24;
    canvas.width  = img.width + padding * 2;
    canvas.height = img.height + padding * 2 + 40; // ruang untuk nama & harga

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Nama produk
    const nama = _barcodeProduct.nama || '';
    ctx.fillStyle = '#1A1714';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(nama.length > 35 ? nama.substring(0, 35) + '...' : nama,
                 canvas.width / 2, padding + 16);

    // Barcode image
    ctx.drawImage(img, padding, padding + 20);

    // Harga
    const harga = _barcodeProduct.harga || '';
    if (harga) {
      ctx.fillStyle = '#6B6259';
      ctx.font = '12px Arial';
      ctx.fillText(harga, canvas.width / 2, canvas.height - 10);
    }

    const link = document.createElement('a');
    link.download = code + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

function _printBarcode() {
  const code   = document.getElementById('barcode-input').value.trim();
  const copies = Math.max(1, Math.min(100, parseInt(document.getElementById('barcode-copies').value) || 1));
  const nama   = _barcodeProduct.nama || code;
  const harga  = _barcodeProduct.harga || '';
  const width  = parseInt(document.getElementById('barcode-width').value);
  const height = parseInt(document.getElementById('barcode-height').value);

  // Buat window print terpisah
  const printWin = window.open('', '_blank', 'width=800,height=600');
  printWin.document.write(`<!DOCTYPE html>
<html><head>
<title>Print Barcode — ${escHtml(code)}</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: white; padding: 10mm; }
  .grid { display: flex; flex-wrap: wrap; gap: 6mm; }
  .label {
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 5mm 6mm 3mm;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 2mm;
    break-inside: avoid;
  }
  .label-name { font-size: 10pt; font-weight: 600; font-family: Arial; text-align: center; max-width: 60mm; }
  .label-price { font-size: 8pt; color: #555; font-family: Arial; }
  svg { max-width: 70mm; }
  @media print {
    @page { margin: 8mm; }
  }
</style>
</head><body>
<div class="grid" id="grid"></div>
<script>
  const grid = document.getElementById('grid');
  for (let i = 0; i < ${copies}; i++) {
    const label = document.createElement('div');
    label.className = 'label';
    label.innerHTML = \`
      <div class="label-name">${escHtml(nama)}</div>
      <svg id="bc\${i}"></svg>
      ${harga ? `<div class="label-price">${escHtml(harga)}</div>` : ''}
    \`;
    grid.appendChild(label);
    JsBarcode('#bc' + i, '${escHtml(code)}', {
      format: 'CODE128',
      width: ${width},
      height: ${height},
      displayValue: true,
      fontSize: 12,
      margin: 6,
    });
  }
  setTimeout(() => { window.print(); window.close(); }, 600);
<\/script>
</body></html>`);
  printWin.document.close();
}

// ===================== UTILS =====================
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
