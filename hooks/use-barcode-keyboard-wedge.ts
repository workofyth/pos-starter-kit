"use client";

import { useEffect, useRef } from "react";

/**
 * useBarcodeKeyboardWedge
 *
 * Mendeteksi input dari scanner barcode hardware (USB / Bluetooth) yang
 * bekerja sebagai "keyboard wedge" — mengirim karakter sangat cepat
 * (< 50ms antar karakter) lalu diakhiri Enter atau jeda panjang.
 *
 * Cara kerja:
 * 1. Pasang event listener `keydown` secara global.
 * 2. Kumpulkan karakter yang masuk jika interval antar karakter < CHAR_INTERVAL_MS.
 * 3. Saat Enter terdeteksi ATAU jeda > CHAR_INTERVAL_MS, panggil onScan(buffer).
 * 4. Abaikan input jika pengguna sedang mengetik di <input>, <textarea>, <select>.
 *
 * @param onScan   Callback yang dipanggil ketika barcode terdeteksi.
 * @param enabled  Set false untuk menonaktifkan hook (misal saat dialog scan terbuka).
 * @param minLength Panjang minimum kode sebelum dianggap valid (default 3).
 */

const CHAR_INTERVAL_MS = 50; // maks jarak antar karakter dari scanner
const MIN_BARCODE_LENGTH = 3; // minimum panjang kode yang valid

interface Options {
  onScan: (code: string) => void;
  enabled?: boolean;
  minLength?: number;
}

export function useBarcodeKeyboardWedge({
  onScan,
  enabled = true,
  minLength = MIN_BARCODE_LENGTH,
}: Options) {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onScanRef = useRef(onScan);

  // Keep onScan ref up to date without restarting the effect
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    const flush = () => {
      const code = bufferRef.current.trim();
      bufferRef.current = "";
      if (code.length >= minLength) {
        onScanRef.current(code);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when user is typing in an editable element
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      // Ignore modifier-only key presses
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const now = Date.now();
      const timeSinceLast = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // If there's a big gap, reset buffer (new barcode starting)
      if (timeSinceLast > CHAR_INTERVAL_MS * 3 && bufferRef.current.length > 0) {
        bufferRef.current = "";
      }

      // Enter = end of barcode
      if (e.key === "Enter") {
        if (timerRef.current) clearTimeout(timerRef.current);
        flush();
        return;
      }

      // Only accumulate printable single characters
      if (e.key.length === 1) {
        bufferRef.current += e.key;

        // Restart the auto-flush timer (in case scanner doesn't send Enter)
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(flush, CHAR_INTERVAL_MS * 4);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
      bufferRef.current = "";
    };
  }, [enabled, minLength]);
}
