import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import "./ScannerPage.css";
import { apiUrl } from "../config/api";

const SCANNER_REGION_ID = "public-qr-scanner";
const QR_PREFIX = "ALLWORLD_QR::";
const MANIFEST_QR_PREFIX = "ALLWORLD_MANIFEST_QR::";

function normalizeScannerError(err) {
  const raw = String(err?.message || err || "").trim();
  if (!raw) return "Camera start nahi ho paya.";
  if (/permission|denied|notallowed/i.test(raw)) {
    return "Camera permission allow nahi hui. Browser settings me camera access allow karein.";
  }
  if (/notfound|not supported|no camera|camera not found/i.test(raw)) {
    return "Is device me camera detect nahi hua.";
  }
  if (/secure context|https/i.test(raw)) {
    return "Camera access ke liye secure context chahiye. localhost ya HTTPS par page kholiye.";
  }
  return raw;
}

function readQrPayload(decodedText) {
  const raw = String(decodedText || "").trim();
  try {
    if (raw.startsWith(MANIFEST_QR_PREFIX)) {
      const parsed = JSON.parse(raw.slice(MANIFEST_QR_PREFIX.length));
      return {
        type: "manifest",
        manifestNumber: String(parsed?.manifestNumber || "").trim(),
      };
    }

    if (raw.startsWith(QR_PREFIX)) {
      const parsed = JSON.parse(raw.slice(QR_PREFIX.length));
      return {
        type: "order",
        docId: Number(parsed?.docId || 0),
        awbNo: String(parsed?.awbNo || "").trim(),
        boxCount: String(parsed?.boxCount || "").trim(),
      };
    }
  } catch {
    return null;
  }

  return null;
}

function readCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    });
  });
}

export default function ScannerPage() {
  const scannerRef = useRef(null);
  const [status, setStatus] = useState("Camera start karne ke liye button dabayein.");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    scannerRef.current = new Html5Qrcode(SCANNER_REGION_ID);

    return () => {
      const scanner = scannerRef.current;
      if (!scanner) return;
      const cleanup = async () => {
        try {
          if (scanner.isScanning) {
            await scanner.stop();
          }
          await Promise.resolve(scanner.clear());
        } catch {
          // Ignore cleanup failures during unmount.
        }
      };

      cleanup();
    };
  }, []);

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      await scanner.clear();
    } catch {
      // Ignore cleanup failures while stopping scanner UI.
    } finally {
      setIsScanning(false);
      setIsStarting(false);
    }
  };

  const startScanner = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      setError("");
      setResult("");
      setStatus("Camera access request bhej rahe hain...");
      setIsStarting(true);

      const cameras = await Html5Qrcode.getCameras();
      if (!Array.isArray(cameras) || cameras.length === 0) {
        throw new Error("No camera found");
      }

      const preferredCamera =
        cameras.find((camera) => /back|rear|environment/i.test(String(camera?.label || ""))) ||
        cameras[0];

      await scanner.start(
        preferredCamera.id,
        {
          fps: 10,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.3333333,
        },
        async (decodedText) => {
          const cleanValue = String(decodedText || "").trim();
          if (!cleanValue) return;

          setResult(cleanValue);
          await stopScanner();

          const payload = readQrPayload(cleanValue);
          if (!payload) {
            setStatus("QR code scan ho gaya, lekin yeh tracking QR format me nahi hai.");
            return;
          }

          try {
            setStatus("Location fetch karke order update kar rahe hain...");
            setError("");
            let latitude = null;
            let longitude = null;

            try {
              const position = await readCurrentPosition();
              latitude = position?.coords?.latitude ?? null;
              longitude = position?.coords?.longitude ?? null;
            } catch {
              latitude = null;
              longitude = null;
            }

            const res = await fetch(apiUrl("/api/orders/scan"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                docId: payload.type === "order" ? payload.docId : undefined,
                awbNo: payload.type === "order" ? payload.awbNo : undefined,
                manifestNumber: payload.type === "manifest" ? payload.manifestNumber : undefined,
                latitude,
                longitude,
              }),
            });
            const data = await res.json();
            if (!res.ok) {
              const endpoint = apiUrl("/api/orders/scan");
              setError(`${data?.message || "Scan update nahi ho paya."} | API: ${endpoint}`);
              setStatus("QR code scan ho gaya, par backend update fail hua.");
              return;
            }

            if (latitude !== null && longitude !== null) {
              setStatus(
                payload.type === "manifest"
                  ? `Manifest ${payload.manifestNumber} ke saare orders update ho gaye. Location aur IP save ho gaye.`
                  : `Order ${payload.awbNo} in transit me update ho gaya. Location aur IP save ho gaye.`
              );
            } else {
              setStatus(
                payload.type === "manifest"
                  ? `Manifest ${payload.manifestNumber} update ho gaya. IP save ho gaya, location permission nahi mili.`
                  : `Order ${payload.awbNo} update ho gaya. IP save ho gaya, location permission nahi mili.`
              );
            }
          } catch (err) {
            const message = normalizeScannerError(err);
            setError(message);
            setStatus("QR code scan ho gaya, lekin location update nahi ho paayi.");
          }
        },
        () => undefined
      );

      setStatus("QR code ko camera frame ke andar rakhiye.");
      setIsScanning(true);
      setIsStarting(false);
    } catch (err) {
      const message = normalizeScannerError(err);
      setError(message);
      setStatus("Camera start nahi ho paya.");
      setIsStarting(false);
      setIsScanning(false);
    }
  };

  return (
    <div className="scanner-page">
      <div className="scanner-card">
        <div className="scanner-copy">
          <p className="scanner-kicker">Public Scanner</p>
          <h1>QR Scanner</h1>
          <p>
            Yahan bina login ke QR code scan ho sakta hai. Camera allow karte hi live scanner open ho jayega.
          </p>
        </div>

        <div className="scanner-stage">
          <div className="scanner-videoWrap">
            <div id={SCANNER_REGION_ID} className="scanner-root" />
          </div>

          <div className="scanner-actions">
            <button
              type="button"
              className="scanner-btn"
              onClick={startScanner}
              disabled={isStarting || isScanning}
            >
              {isStarting ? "Starting..." : isScanning ? "Scanning..." : "Start Scanner"}
            </button>
            {isScanning && (
              <button type="button" className="scanner-btn scanner-btn-ghost" onClick={stopScanner}>
                Stop
              </button>
            )}
          </div>

          <p className="scanner-status">{status}</p>
          {error && <p className="scanner-error">{error}</p>}

          {result && (
            <div className="scanner-result">
              <div className="scanner-resultLabel">Scanned Value</div>
              <div className="scanner-resultValue">{result}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
