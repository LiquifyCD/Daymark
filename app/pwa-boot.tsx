"use client";

import { useEffect } from "react";

export function PwaBoot() {
  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(`${basePath}/sw.js`, { scope: `${basePath}/` }).catch(() => undefined);
    }
    const video = document.querySelector<HTMLVideoElement>(".login-video");
    video?.play().catch(() => undefined);
  }, []);
  return null;
}
