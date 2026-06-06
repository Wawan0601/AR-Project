/**
 * scanner.js — Modul Barcode Scanner
 * Mengelola inisialisasi, start, stop, dan event kamera/barcode.
 *
 * FIX: SCAN_CONFIG dibuat di dalam fungsi init() — bukan di level module —
 * agar Html5QrcodeScanType & Html5QrcodeSupportedFormats sudah pasti
 * terdefinisi saat diakses (library sudah selesai load).
 */

const Scanner = (() => {
  let html5QrCode = null;
  let isRunning = false;
  let onSuccessCallback = null;

  /**
   * Inisialisasi scanner
   * @param {function} onSuccess - callback(barcode: string)
   */
  function init(onSuccess) {
    // Pastikan library sudah ada
    if (typeof Html5Qrcode === 'undefined') {
      throw new Error('Library html5-qrcode belum dimuat. Pastikan script CDN tidak menggunakan defer.');
    }

    onSuccessCallback = onSuccess;

    if (html5QrCode) {
      stop();
    }

    html5QrCode = new Html5Qrcode('qr-reader', { verbose: false });
  }

  /**
   * Buat config scan — dipanggil saat start() agar konstanta sudah tersedia
   */
  function _buildConfig() {
    return {
      fps: 10,
      qrbox: { width: 200, height: 200 },
      rememberLastUsedCamera: true,
      supportedScanTypes: [
        Html5QrcodeScanType.SCAN_TYPE_CAMERA
      ],
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.QR_CODE,
      ]
    };
  }

  /**
   * Start kamera dan scanning
   */
  async function start() {
    if (isRunning) return;
    if (!html5QrCode) throw new Error('Scanner belum diinisialisasi. Panggil Scanner.init() dulu.');

    try {
      await html5QrCode.start(
        { facingMode: 'environment' },
        _buildConfig(),
        _onScanSuccess,
        _onScanFailure
      );
      isRunning = true;
    } catch (err) {
      console.error('[Scanner] Gagal start:', err);
      throw new Error('Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan dan gunakan Chrome atau Safari.');
    }
  }

  /**
   * Stop kamera
   */
  async function stop() {
    if (!isRunning || !html5QrCode) return;
    try {
      await html5QrCode.stop();
      isRunning = false;
    } catch (err) {
      console.warn('[Scanner] Stop error (ignored):', err);
    }
  }

  // Debounce: abaikan scan yang sama dalam 3 detik
  let _lastScanned = '';
  let _lastScannedTime = 0;

  function _onScanSuccess(decodedText) {
    const now = Date.now();
    if (decodedText === _lastScanned && now - _lastScannedTime < 3000) return;
    _lastScanned = decodedText;
    _lastScannedTime = now;
    if (onSuccessCallback) onSuccessCallback(decodedText);
  }

  function _onScanFailure() {
    // Silent — tidak perlu log setiap frame gagal
  }

  function getIsRunning() {
    return isRunning;
  }

  return { init, start, stop, getIsRunning };
})();
