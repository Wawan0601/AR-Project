/**
 * scanner.js — Modul Barcode Scanner
 * Mengelola inisialisasi, start, stop, dan event kamera/barcode.
 * Menggunakan library html5-qrcode.
 */

const Scanner = (() => {
  let html5QrCode = null;
  let isRunning = false;
  let onSuccessCallback = null;

  const SCAN_CONFIG = {
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

  /**
   * Inisialisasi scanner di element dengan id 'qr-reader'
   * @param {function} onSuccess - callback(barcode: string)
   */
  function init(onSuccess) {
    onSuccessCallback = onSuccess;

    // Bersihkan instance lama jika ada
    if (html5QrCode) {
      stop();
    }

    html5QrCode = new Html5Qrcode('qr-reader', { verbose: false });
  }

  /**
   * Start kamera dan scanning
   */
  async function start() {
    if (isRunning) return;
    if (!html5QrCode) throw new Error('Scanner belum diinisialisasi. Panggil Scanner.init() dulu.');

    try {
      await html5QrCode.start(
        { facingMode: 'environment' }, // Kamera belakang
        SCAN_CONFIG,
        _onScanSuccess,
        _onScanFailure
      );
      isRunning = true;
    } catch (err) {
      console.error('[Scanner] Gagal start:', err);
      throw new Error('Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.');
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

  /**
   * Handler sukses scan — dipanggil setiap kali barcode terdeteksi
   */
  let _lastScanned = '';
  let _lastScannedTime = 0;

  function _onScanSuccess(decodedText) {
    const now = Date.now();
    // Debounce: abaikan scan yang sama dalam 3 detik
    if (decodedText === _lastScanned && now - _lastScannedTime < 3000) return;

    _lastScanned = decodedText;
    _lastScannedTime = now;

    if (onSuccessCallback) {
      onSuccessCallback(decodedText);
    }
  }

  function _onScanFailure() {
    // Silent — tidak perlu log setiap frame gagal
  }

  function getIsRunning() {
    return isRunning;
  }

  return { init, start, stop, getIsRunning };
})();
