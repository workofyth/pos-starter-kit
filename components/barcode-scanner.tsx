"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanLine, CheckCircle2 } from "lucide-react";

interface BarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (code: string) => void;
  title?: string;
  /** Keep scanning after a hit instead of closing (e.g. POS adding items one after another). */
  continuous?: boolean;
}

const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.ITF,
  BarcodeFormat.CODABAR,
  BarcodeFormat.QR_CODE,
]);

// Debounce so a barcode that stays in frame doesn't get re-added on every
// decode tick while in continuous mode.
const RESCAN_COOLDOWN_MS = 1500;

export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onDetected,
  title = "Scan Barcode",
  continuous = false,
}: BarcodeScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const onDetectedRef = useRef(onDetected);
  const lastHitRef = useRef<{ code: string; at: number } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  // List available cameras (for the picker) whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    BrowserMultiFormatReader.listVideoInputDevices()
      .then((list) => {
        if (!cancelled) setDevices(list);
      })
      .catch(() => {
        // No permission yet / no devices — the scan effect below will surface the error.
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Reset transient state whenever the dialog is (re)opened.
  useEffect(() => {
    if (open) {
      setError(null);
      setManualCode("");
      setLastScanned(null);
      lastHitRef.current = null;
    }
  }, [open]);

  // Start/stop the live decode loop whenever the dialog is open or the chosen camera changes.
  useEffect(() => {
    if (!open || !videoRef.current) return;
    let cancelled = false;
    const reader = new BrowserMultiFormatReader(hints);

    reader
      .decodeFromVideoDevice(deviceId, videoRef.current, (result) => {
        if (cancelled || !result) return;
        const code = result.getText();
        const now = Date.now();
        if (lastHitRef.current?.code === code && now - lastHitRef.current.at < RESCAN_COOLDOWN_MS) {
          return;
        }
        lastHitRef.current = { code, at: now };
        setLastScanned(code);
        onDetectedRef.current(code);
        if (!continuous) {
          onOpenChange(false);
        }
      })
      .then((controls) => {
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Barcode scanner error:", err);
        setError(
          err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")
            ? "Akses kamera ditolak. Izinkan akses kamera di browser untuk memakai scanner, atau masukkan barcode manual di bawah."
            : "Tidak bisa mengakses kamera di perangkat ini. Masukkan barcode secara manual di bawah."
        );
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, deviceId, continuous, onOpenChange]);

  const handleManualSubmit = () => {
    if (!manualCode.trim()) return;
    onDetectedRef.current(manualCode.trim());
    setManualCode("");
    if (!continuous) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" /> {title}
          </DialogTitle>
          <DialogDescription>
            Arahkan kamera ke barcode produk, atau ketik/tempel manual di bawah.
          </DialogDescription>
        </DialogHeader>

        <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-4/5 h-1/3 border-2 border-primary/80 rounded-lg" />
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {continuous && lastScanned && !error && (
          <p className="text-xs text-chart-2 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Terakhir terbaca: {lastScanned}
          </p>
        )}

        {devices.length > 1 && (
          <select
            className="w-full text-sm border rounded-md p-2 bg-background"
            value={deviceId || ""}
            onChange={(e) => setDeviceId(e.target.value || undefined)}
          >
            <option value="">Kamera otomatis</option>
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
              </option>
            ))}
          </select>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Atau ketik/scan barcode di sini..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
            autoFocus={!!error}
          />
          <Button onClick={handleManualSubmit}>OK</Button>
        </div>

        {continuous && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Selesai</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
