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

/** Small JPEG from a photo file. Some phones can't decode one way, so try two. */
export async function shrinkPhoto(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const blob = await toJpeg(bitmap, bitmap.width, bitmap.height);
    bitmap.close();
    return blob;
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return await toJpeg(img, img.naturalWidth, img.naturalHeight);
    } catch {
      throw new Error("The phone couldn't open that photo. Please take it again.");
    } finally {
      URL.revokeObjectURL(url);
    }
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
  onPhoto,
  onClose,
  onProblem,
}: {
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
          {busy ? "Saving..." : "Take photo"}
        </button>
      </div>
    </div>
  );
}
