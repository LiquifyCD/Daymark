"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Dashboard } from "./dashboard";

const SESSION_STORAGE = "daymark-session";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const API_BASE = "https://daymark-api.liquifycd.workers.dev";

export function AuthShell() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      setSession(localStorage.getItem(SESSION_STORAGE) || "");
      setReady(true);
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, []);

  useEffect(() => {
    if (!ready || session) return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    const play = () => void video.play().catch(() => undefined);
    play();
    video.addEventListener("canplay", play, { once: true });
    return () => video.removeEventListener("canplay", play);
  }, [ready, session]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: String(form.get("username") || ""),
          password: String(form.get("password") || ""),
        }),
      });
      if (!response.ok) throw new Error("Incorrect username or password.");
      const result = await response.json() as { token: string };
      localStorage.setItem(SESSION_STORAGE, result.token);
      setSession(result.token);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    localStorage.removeItem(SESSION_STORAGE);
    setSession("");
  }

  if (!ready) return null;
  if (session) return <Dashboard user={{ name: "Liquify" }} session={session} onSignOut={signOut} />;

  return (
    <main className="login-shell">
      <video
        ref={videoRef}
        className="login-video"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={`${basePath}/media/launch-poster.jpg`}
        aria-hidden="true"
      >
        <source src={`${basePath}/media/launch-background.mp4`} type="video/mp4" />
      </video>
      <div className="video-shade" />
      <section className="login-card">
        <img className="login-logo" src={`${basePath}/icons/icon-192.png`} alt="" />
        <p className="eyebrow">NO-COMMENT · DAILY</p>
        <h1>Keep your word<br />to yourself.</h1>
        <p className="login-copy">One clear promise. One honest check-in. Every day.</p>
        <form className="device-login" onSubmit={signIn}>
          <label>
            Username
            <input name="username" type="text" autoComplete="username" defaultValue="Liquify" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          {error && <div className="login-error" role="alert">{error}</div>}
          <button className="primary-button login-button" type="submit" disabled={busy}>
            Enter Daymark <span aria-hidden="true">→</span>
          </button>
        </form>
        <p className="privacy-note">Single private account · Stored securely in Turso</p>
      </section>
    </main>
  );
}
