"use client";

import { useEffect } from "react";

export function PwaBoot() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const video = document.querySelector<HTMLVideoElement>(".login-video");
    video?.play().catch(() => undefined);
  }, []);
  return null;
}
