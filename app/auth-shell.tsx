"use client";

import { FormEvent, useEffect, useState } from "react";
import { Dashboard } from "./dashboard";

const KEY_STORAGE = "daymark-access-key";
const NAME_STORAGE = "daymark-name";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

function newAccessKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export function AuthShell() {
  const [ready, setReady] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [name, setName] = useState("My Daymark");

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      setAccessKey(localStorage.getItem(KEY_STORAGE) || "");
      setName(localStorage.getItem(NAME_STORAGE) || "My Daymark");
      setReady(true);
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, []);

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const suppliedKey = String(form.get("accessKey") || "").trim();
    const nextName = String(form.get("name") || "My Daymark").trim().slice(0, 40) || "My Daymark";
    const nextKey = suppliedKey || newAccessKey();
    if (nextKey.length < 32) return;
    localStorage.setItem(KEY_STORAGE, nextKey);
    localStorage.setItem(NAME_STORAGE, nextName);
    setName(nextName);
    setAccessKey(nextKey);
  }

  function signOut() {
    localStorage.removeItem(KEY_STORAGE);
    setAccessKey("");
  }

  if (!ready) return null;
  if (accessKey) return <Dashboard user={{ name }} accessKey={accessKey} onSignOut={signOut} />;

  return (
    <main className="login-shell">
      <video className="login-video" muted loop playsInline preload="metadata" poster={`${basePath}/media/launch-poster.jpg`} aria-hidden="true">
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
            Your name
            <input name="name" type="text" maxLength={40} defaultValue="My Daymark" />
          </label>
          <details>
            <summary>Use an existing account key</summary>
            <label>
              Account key
              <input name="accessKey" type="password" minLength={32} autoComplete="off" />
            </label>
          </details>
          <button className="primary-button login-button" type="submit">
            Enter Daymark <span aria-hidden="true">→</span>
          </button>
        </form>
        <p className="privacy-note">Private by default · Stored securely in Turso</p>
      </section>
    </main>
  );
}
