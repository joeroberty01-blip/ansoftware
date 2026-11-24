"use client";

import { useEffect, useRef, useState } from "react";

const MAX_SIDE = 640;

function toJpeg(source: CanvasImageSource, width: number, height: number): Promise<Blob> {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Could not read the photo. Please try again."));
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not read the photo. Please try again."))),
      "image/jpeg",
      0.75
    )
  );
}

/** The photo as something a canvas can draw; image decoding differs by phone. */
async function decodePhoto(photo: Blob): Promise<{ source: CanvasImageSource; w: number; h: number }> {
  try {
    const bitmap = await createImageBitmap(photo);
    return { source: bitmap, w: bitmap.width, h: bitmap.height };
  } catch {
    const url = URL.createObjectURL(photo);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("decode"));
        img.src = url;
      });
      return { source: img, w: img.naturalWidth, h: img.naturalHeight };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/**
 * Writes lines of text along the bottom of the photo (time, patient,
 * location). Never holds up a check-in: if it fails or is slow, the plain
 * photo is sent, and the time and location are saved with it anyway.
 */
export async function stampPhoto(photo: Blob, lines: string[]): Promise<Blob> {
  const draw = async (): Promise<Blob> => {
    const { source, w, h } = await decodePhoto(photo);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return photo;
    ctx.drawImage(source, 0, 0);
    const size = Math.max(12, Math.round(w / 30));
    const pad = Math.round(size * 0.6);
    const lineHeight = Math.round(size * 1.35);
    const barHeight = lineHeight * lines.length + pad * 2;
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, h - barHeight, w, barHeight);
    ctx.fillStyle = "#fff";
    ctx.font = `600 ${size}px sans-serif`;
    ctx.textBaseline = "top";
    lines.forEach((line, n) =>
      ctx.fillText(line, pad, h - barHeight + pad + n * lineHeight, w - pad * 2)
    );
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? photo), "image/jpeg", 0.8));
  };
  return Promise.race([
    draw().catch(() => photo),
    new Promise<Blob>((resolve) => setTimeout(() => resolve(photo), 4000)),
  ]);
}

/** Small JPEG from a photo file taken with the phone's own camera app. */
export async function shrinkPhoto(file: File): Promise<Blob> {
  try {
    const { source, w, h } = await decodePhoto(file);
    return await toJpeg(source, w, h);
  } catch {
    throw new Error("The phone couldn't open that photo. Please take it again.");
  }
}

export const inPageCameraSupported = () =>
  typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

/**
 * Selfie camera inside the page. Opening the phone's own camera app instead
 * makes Android close the browser on phones with little memory, so the page
 * reloads and the photo is lost.
 */
export function SelfieCamera({
  status,
  onPhoto,
  onClose,
  onProblem,
}: {
  /** Shown under the picture: the time and how the location is going. */
  status: React.ReactNode;
  onPhoto: (photo: Blob) => void;
  onClose: () => void;
  /** The camera can't be used here: offer the phone's camera app instead. */
  onProblem: (kind: "camera-denied" | "camera-failed", detail: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const problemRef = useRef(onProblem);

  useEffect(() => {
    problemRef.current = onProblem;
  }, [onProblem]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let closed = false;
    const report = (err: unknown) => {
      if (closed) return;
      const name = (err as DOMException)?.name ?? "Error";
      problemRef.current(
        name === "NotAllowedError" || name === "SecurityError" ? "camera-denied" : "camera-failed",
        name
      );
    };
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
        });
        if (closed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        if (!closed) setReady(true);
      } catch (err) {
        report(err);
      }
    })();
    return () => {
      closed = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const shoot = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setBusy(true);
    try {
      onPhoto(await toJpeg(video, video.videoWidth, video.videoHeight));
    } catch (err) {
      onProblem("camera-failed", (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Take a selfie"
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-black/90 p-4"
    >
      <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-zinc-900">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="h-full w-full -scale-x-100 object-cover"
        />
        {!ready && (
          <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white">
            Opening the camera... If your phone asks, tap Allow.
          </p>
        )}
      </div>
      <div className="w-full max-w-sm text-center text-sm text-white">{status}</div>
      <div className="flex w-full max-w-sm gap-3">
        <button
          type="button"
          onClick={onClose}
          className="min-h-12 flex-1 rounded-xl border border-white/40 px-4 text-sm font-semibold text-white"
        >
          Close
        </button>
        <button
          type="button"
          onClick={shoot}
          disabled={!ready || busy}
          className="min-h-12 flex-[2] rounded-xl bg-brand-blue px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Saving..." : "Take photo and check in"}
        </button>
      </div>
    </div>
  );
}
