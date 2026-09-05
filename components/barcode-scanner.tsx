"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { ScanLine, CheckCircle2, FlipHorizontal, Camera, Keyboard } from "lucide-react";

interface BarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (code: string) => void;
  title?: string;
  /** Keep scanning after a hit instead of closing (e.g. POS adding items one after another). */
  continuous?: boolean;
}

// ── All supported formats ─────────────────────────────────────────────────────
const ALL_FORMATS = [
  // 1D formats
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.ITF,
  BarcodeFormat.CODABAR,
  // 2D formats
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.PDF_417,
  BarcodeFormat.AZTEC,
  // GS1 / RSS formats
  BarcodeFormat.RSS_14,
  BarcodeFormat.RSS_EXPANDED,
];

const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, ALL_FORMATS);
hints.set(DecodeHintType.TRY_HARDER, true);

// Debounce: jangan re-add barcode yang sama dalam 1.5 detik (continuous mode)
const RESCAN_COOLDOWN_MS = 1500;

const FORMAT_LABELS = [
  "EAN-13", "EAN-8", "UPC-A", "UPC-E",
  "CODE-128", "CODE-39", "CODE-93", "ITF", "CODABAR",
  "QR Code", "Data Matrix", "PDF-417", "Aztec",
  "RSS-14", "RSS-Expanded",
];

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
  const [lastFormat, setLastFormat] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [preferFront, setPreferFront] = useState(false);
  const [tab, setTab] = useState<"camera" | "manual">("camera");

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  // List available cameras whenever dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    BrowserMultiFormatReader.listVideoInputDevices()
      .then((list) => {
        if (cancelled) return;
        setDevices(list);
        // Auto-select back camera for POS (better for barcode scanning)
        const backCam = list.find((d) => {
          const label = d.label.toLowerCase();
          return label.includes("back") || label.includes("rear") || label.includes("environment");
        });
        if (backCam && !deviceId) {
          setDeviceId(backCam.deviceId);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset state when dialog reopens
  useEffect(() => {
    if (open) {
      setError(null);
      setManualCode("");
      setLastScanned(null);
      setLastFormat(null);
      lastHitRef.current = null;
      setTab("camera");
    }
  }, [open]);

  // Start/stop live decode loop
  useEffect(() => {
    if (!open || !videoRef.current || tab !== "camera") return;
    let cancelled = false;
    setIsScanning(false);
    const reader = new BrowserMultiFormatReader(hints);

    reader
      .decodeFromVideoDevice(deviceId, videoRef.current, (result) => {
        if (cancelled || !result) return;
        setIsScanning(true);
        const code = result.getText();
        const format = result.getBarcodeFormat();
        const formatName = BarcodeFormat[format] ?? "UNKNOWN";
        const now = Date.now();
        if (
          lastHitRef.current?.code === code &&
          now - lastHitRef.current.at < RESCAN_COOLDOWN_MS
        ) {
          return;
        }
        lastHitRef.current = { code, at: now };
        setLastScanned(code);
        setLastFormat(formatName);
        onDetectedRef.current(code);
        if (!continuous) {
          onOpenChange(false);
        }
      })
      .then((controls) => {
        if (cancelled) { controls.stop(); return; }
        controlsRef.current = controls;
        setIsScanning(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Barcode scanner error:", err);
        setError(
          err instanceof DOMException &&
            (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")
            ? "Akses kamera ditolak. Izinkan akses kamera di browser, atau gunakan tab Input Manual."
            : "Tidak bisa mengakses kamera. Gunakan tab Input Manual di bawah."
        );
        setIsScanning(false);
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      setIsScanning(false);
    };
  }, [open, deviceId, continuous, onOpenChange, tab]);

  const handleManualSubmit = useCallback(() => {
    if (!manualCode.trim()) return;
    onDetectedRef.current(manualCode.trim());
    setManualCode("");
    if (!continuous) {
      onOpenChange(false);
    }
  }, [manualCode, continuous, onOpenChange]);

  const handleFlipCamera = useCallback(() => {
    const nextPreferFront = !preferFront;
    setPreferFront(nextPreferFront);
    const keywords = nextPreferFront
      ? ["front", "user", "face"]
      : ["back", "rear", "environment"];
    const match = devices.find((d) =>
      keywords.some((k) => d.label.toLowerCase().includes(k))
    );
    if (match) {
      setDeviceId(match.deviceId);
    } else if (devices.length > 1) {
      const currentIdx = devices.findIndex((d) => d.deviceId === deviceId);
      const nextIdx = (currentIdx + 1) % devices.length;
      setDeviceId(devices[nextIdx].deviceId);
    }
  }, [preferFront, devices, deviceId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            {title}
            {isScanning && tab === "camera" && !error && (
              <Badge
                variant="secondary"
                className="text-[10px] h-4 px-1.5 bg-green-500/15 text-green-600 border-green-500/20 animate-pulse"
              >
                ● LIVE
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Arahkan kamera ke barcode / QR code, atau masukkan manual.
          </DialogDescription>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex border-b mx-6 mt-3">
          <button
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "camera"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("camera")}
          >
            <Camera className="h-3.5 w-3.5" />
            Kamera
          </button>
          <button
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "manual"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("manual")}
          >
            <Keyboard className="h-3.5 w-3.5" />
            Manual / Scanner
          </button>
        </div>

        <div className="px-6 py-4 space-y-3">
          {tab === "camera" && (
            <>
              {/* Camera viewport */}
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video shadow-inner">
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                {/* Scan overlay with corner markers */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative w-4/5 h-2/5">
                    <span className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-primary rounded-tl" />
                    <span className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-primary rounded-tr" />
                    <span className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-primary rounded-bl" />
                    <span className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-primary rounded-br" />
                    {/* Animated scan line */}
                    {isScanning && (
                      <span
                        className="absolute left-1 right-1 h-0.5 bg-primary/80 rounded-full shadow-[0_0_6px_2px_hsl(var(--primary)/0.4)]"
                        style={{ animation: "pos-scanline 2s ease-in-out infinite" }}
                      />
                    )}
                  </div>
                </div>
                {/* Flip camera button */}
                {devices.length > 1 && (
                  <button
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    onClick={handleFlipCamera}
                    title="Ganti kamera"
                  >
                    <FlipHorizontal className="h-4 w-4" />
                  </button>
                )}
              </div>

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-md p-2 leading-relaxed">
                  {error}
                </p>
              )}

              {continuous && lastScanned && !error && (
                <p className="text-xs text-green-600 flex items-center gap-1.5 bg-green-500/10 rounded-md px-2 py-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    <span className="font-semibold font-mono">{lastScanned}</span>
                    {lastFormat && (
                      <span className="text-muted-foreground ml-1">({lastFormat})</span>
                    )}
                  </span>
                </p>
              )}

              {/* Camera selector */}
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
            </>
          )}

          {tab === "manual" && (
            <div className="py-2 space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ketik barcode secara manual, atau arahkan scanner hardware (USB/Bluetooth) ke sini lalu pindai — akan otomatis terdeteksi.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Ketik atau scan barcode di sini..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                  autoFocus
                  className="font-mono"
                />
                <Button onClick={handleManualSubmit} disabled={!manualCode.trim()}>
                  OK
                </Button>
              </div>
              {continuous && lastScanned && (
                <p className="text-xs text-green-600 flex items-center gap-1.5 bg-green-500/10 rounded-md px-2 py-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  Terakhir: <span className="font-semibold font-mono ml-1">{lastScanned}</span>
                </p>
              )}
            </div>
          )}

          {/* Supported format list */}
          <div className="pt-1">
            <p className="text-[10px] text-muted-foreground mb-1.5">Format yang didukung:</p>
            <div className="flex flex-wrap gap-1">
              {FORMAT_LABELS.map((f) => (
                <Badge key={f} variant="outline" className="text-[9px] h-4 px-1 font-normal">
                  {f}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {continuous && (
          <DialogFooter className="px-6 pb-6 pt-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Selesai Scan
            </Button>
          </DialogFooter>
        )}

        {/* Scanline animation keyframes */}
        <style>{`
          @keyframes pos-scanline {
            0%   { top: 8%; }
            50%  { top: 88%; }
            100% { top: 8%; }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
