/**
 * ui.js — Modul UI Renderer
 * Bertanggung jawab untuk merender semua perubahan tampilan:
 * - Status bar (scanning, success, error)
 * - Product card
 * - Model viewer (3D / AR)
 */

const UI = (() => {
  // === DOM REFERENCES ===
  const els = {
    statusBar: document.getElementById('status-bar'),
    productCard: document.getElementById('product-card'),
    productBarcodeTag: document.getElementById('product-barcode-tag'),
    productName: document.getElementById('product-name'),
    productDesc: document.getElementById('product-desc'),
    productDimensi: document.getElementById('product-dimensi'),
    productBerat: document.getElementById('product-berat'),
    productPrice: document.getElementById('product-price'),
    productPoster: document.getElementById('product-poster'),
    btnAr: document.getElementById('btn-ar'),
    btnViewer: document.getElementById('btn-3d-viewer'),
    viewerSection: document.getElementById('viewer-section'),
    modelViewer: document.getElementById('model-viewer'),
    viewerProductName: document.getElementById('viewer-product-name'),
    scannerIdle: document.getElementById('scanner-idle'),
    btnStartScanner: document.getElementById('btn-start-scanner'),
    btnScanAgain: document.getElementById('btn-scan-again'),
    manualInput: document.getElementById('manual-input'),
  };

  // Current product data
  let _currentProduct = null;

  /**
   * Set status bar
   * @param {string} type - 'scanning' | 'success' | 'error' | 'hidden'
   * @param {string} message
   */
  function setStatus(type, message) {
    const bar = els.statusBar;
    bar.className = `status-bar ${type}`;

    const icons = {
      scanning: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`,
      success: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
      error: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    };

    bar.innerHTML = `${icons[type] || ''} ${message}`;
  }

  /**
   * Tampilkan product card dengan data produk
   * @param {string} barcode
   * @param {object} product - data dari Supabase (snake_case fields)
   */
  function showProduct(barcode, product) {
    _currentProduct = product;

    els.productBarcodeTag.textContent = `Barcode: ${barcode}`;
    els.productName.textContent = product.nama;
    els.productDesc.textContent = product.deskripsi;
    els.productPrice.textContent = product.harga || '-';

    if (product.dimensi) {
      els.productDimensi.textContent = product.dimensi;
      els.productDimensi.parentElement.classList.remove('hidden');
    }

    if (product.berat) {
      els.productBerat.textContent = product.berat;
      els.productBerat.parentElement.classList.remove('hidden');
    }

    // Poster image
    if (product.poster_url) {
      els.productPoster.src = product.poster_url;
      els.productPoster.classList.remove('hidden');
      els.productPoster.parentElement?.querySelector('.product-poster-placeholder')?.classList.add('hidden');
    }

    els.productCard.classList.remove('hidden');
    els.btnScanAgain?.classList.remove('hidden');

    // Smooth scroll ke product card
    setTimeout(() => {
      els.productCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  /**
   * Tampilkan model viewer (3D mode biasa)
   */
  function showModelViewer(product) {
    if (!product) product = _currentProduct;
    if (!product) return;

    els.modelViewer.src = product.model_url;
    els.modelViewer.alt = product.nama;
    els.viewerProductName.textContent = product.nama;
    els.viewerSection.classList.remove('hidden');

    // Hapus atribut AR dulu — 3D mode saja
    els.modelViewer.removeAttribute('ar');
    els.modelViewer.removeAttribute('ar-modes');

    setTimeout(() => {
      els.viewerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  /**
   * Aktifkan AR mode langsung
   */
  function activateAR(product) {
    if (!product) product = _currentProduct;
    if (!product) return;

    els.modelViewer.src = product.model_url;
    els.modelViewer.alt = product.nama;
    els.viewerProductName.textContent = product.nama;

    // Aktifkan AR attributes
    els.modelViewer.setAttribute('ar', '');
    // scene-viewer diutamakan — menggunakan kamera utama (x1) bukan telefoto
    // webxr sebagai fallback jika scene-viewer tidak tersedia
    els.modelViewer.setAttribute('ar-modes', 'scene-viewer webxr quick-look');
    els.modelViewer.setAttribute('ar-scale', 'fixed');
    els.modelViewer.setAttribute('xr-environment', '');

    els.viewerSection.classList.remove('hidden');

    // Tunggu model viewer siap, lalu trigger AR otomatis
    els.modelViewer.addEventListener('load', () => {
      setTimeout(() => {
        const arButton = els.modelViewer.shadowRoot?.querySelector('[slot="ar-button"]')
          || els.modelViewer.querySelector('[slot="ar-button"]');

        // Trigger AR via model-viewer's activateAR()
        if (typeof els.modelViewer.activateAR === 'function') {
          els.modelViewer.activateAR();
        }
      }, 500);
    }, { once: true });

    setTimeout(() => {
      els.viewerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  /**
   * Sembunyikan model viewer
   */
  function hideModelViewer() {
    els.viewerSection.classList.add('hidden');
    els.modelViewer.src = '';
  }

  /**
   * Reset UI ke state awal (siap scan lagi)
   */
  function reset() {
    _currentProduct = null;
    els.productCard.classList.add('hidden');
    els.viewerSection.classList.add('hidden');
    els.statusBar.className = 'status-bar hidden';
    els.btnScanAgain?.classList.add('hidden');
    els.scannerIdle.classList.remove('hidden');
    els.modelViewer.src = '';
    if (els.manualInput) els.manualInput.value = '';
  }

  /**
   * Tandai scanner sebagai aktif (sembunyikan idle state)
   */
  function setScannerActive(active) {
    if (active) {
      els.scannerIdle.classList.add('hidden');
    } else {
      els.scannerIdle.classList.remove('hidden');
    }
  }

  function getCurrentProduct() {
    return _currentProduct;
  }

  return {
    setStatus,
    showProduct,
    showModelViewer,
    activateAR,
    hideModelViewer,
    reset,
    setScannerActive,
    getCurrentProduct,
  };
})();
