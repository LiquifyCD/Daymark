"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Habit = {
  id: number;
  title: string;
  note: string;
  icon: string;
  createdAt: string;
};

type Checkin = {
  id: number;
  habitId: number;
  checkedOn: string;
};

type ApiState = {
  habits: Habit[];
  checkins: Checkin[];
  today: string;
};

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const EMPTY_STATE: ApiState = { habits: [], checkins: [], today: "" };
const ICONS = ["💧", "✦", "☀️", "🌿", "📖", "🏃"];

function dayLabel(date: Date) {
  return new Intl.DateTimeFormat("en", { weekday: "short" }).format(date).slice(0, 2);
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStreak(checkins: Checkin[], habitId: number, today: string) {
  const checked = new Set(
    checkins.filter((item) => item.habitId === habitId).map((item) => item.checkedOn),
  );
  const cursor = new Date(`${today}T12:00:00`);
  if (!checked.has(today)) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (checked.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function Dashboard({ user }: { user: { name: string; email: string } }) {
  const [data, setData] = useState<ApiState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [error, setError] = useState("");
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    [],
  );

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/habits?tz=${encodeURIComponent(timezone)}`);
      if (!response.ok) throw new Error("Could not load your promises.");
      setData(await response.json());
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [timezone]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, [load]);

  const completed = data.habits.filter((habit) =>
    data.checkins.some(
      (checkin) => checkin.habitId === habit.id && checkin.checkedOn === data.today,
    ),
  ).length;
  const progress = data.habits.length ? completed / data.habits.length : 0;

  async function toggleCheckin(habit: Habit, done: boolean) {
    setBusyId(habit.id);
    setError("");
    const method = done ? "DELETE" : "POST";
    try {
      const response = await fetch(`/api/habits/${habit.id}/checkins`, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ timezone }),
      });
      if (!response.ok) throw new Error("The check-in could not be saved.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  async function createHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/habits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        note: form.get("note"),
        icon: form.get("icon"),
      }),
    });
    if (!response.ok) {
      setError("Your promise could not be created.");
      return;
    }
    setShowCreate(false);
    await load();
  }

  async function archiveHabit(id: number) {
    if (!window.confirm("Archive this promise? Its history will be kept.")) return;
    const response = await fetch(`/api/habits/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("The promise could not be archived.");
      return;
    }
    await load();
  }

  async function install() {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
      return;
    }
    setShowInstall(true);
  }

  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return { label: dayLabel(date), key: dateKey(date), day: date.getDate() };
  });

  return (
    <main className="app-shell">
      <div className="ambient-orb ambient-orb-one" />
      <div className="ambient-orb ambient-orb-two" />
      <header className="topbar">
        <div className="brand-lockup">
          <img src="/icons/icon-192.png" alt="" />
          <span>Daymark</span>
        </div>
        <button className="install-button" type="button" onClick={install}>
          <span aria-hidden="true">⌑</span> Add to iPhone
        </button>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">TODAY · {data.today || "YOUR DAY"}</p>
          <h1>{completed === data.habits.length && data.habits.length ? "Promises kept." : "Show up for yourself."}</h1>
          <p className="hero-copy">
            {loading
              ? "Loading your day…"
              : data.habits.length
                ? `${completed} of ${data.habits.length} complete today`
                : "Start with one small thing you want to do every day."}
          </p>
        </div>
        <div className="progress-ring" style={{ "--progress": `${progress * 360}deg` } as React.CSSProperties}>
          <div>
            <strong>{Math.round(progress * 100)}%</strong>
            <span>today</span>
          </div>
        </div>
      </section>

      {error && <div className="error-banner" role="alert">{error}</div>}

      <section className="content-grid">
        <div className="promise-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR DAILY LIST</p>
              <h2>Today’s promises</h2>
            </div>
            <button className="add-button" type="button" onClick={() => setShowCreate(true)}>
              <span aria-hidden="true">＋</span> New
            </button>
          </div>

          {!loading && data.habits.length === 0 && (
            <button className="empty-card" type="button" onClick={() => setShowCreate(true)}>
              <span className="empty-icon">✦</span>
              <strong>Create your first promise</strong>
              <span>“Drink one cup of water” is a perfect start.</span>
            </button>
          )}

          <div className="promise-list">
            {data.habits.map((habit) => {
              const done = data.checkins.some(
                (item) => item.habitId === habit.id && item.checkedOn === data.today,
              );
              const streak = getStreak(data.checkins, habit.id, data.today);
              return (
                <article className={`promise-card ${done ? "is-done" : ""}`} key={habit.id}>
                  <span className="habit-icon" aria-hidden="true">{habit.icon}</span>
                  <div className="habit-copy">
                    <h3>{habit.title}</h3>
                    <p>{habit.note || (streak ? `${streak} day streak` : "Ready when you are")}</p>
                    {habit.note && <span className="streak">✦ {streak} day{streak === 1 ? "" : "s"} in a row</span>}
                  </div>
                  <button
                    className="check-button"
                    type="button"
                    aria-label={done ? `Undo ${habit.title} for today` : `Mark ${habit.title} done`}
                    aria-pressed={done}
                    disabled={busyId === habit.id}
                    onClick={() => toggleCheckin(habit, done)}
                  >
                    <span aria-hidden="true">{done ? "✓" : ""}</span>
                  </button>
                  <button className="archive-button" type="button" aria-label={`Archive ${habit.title}`} onClick={() => archiveHabit(habit.id)}>•••</button>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="week-card">
          <p className="eyebrow">YOUR RHYTHM</p>
          <h2>Last 7 days</h2>
          <div className="week-row">
            {week.map((day) => {
              const total = data.habits.length;
              const checked = data.habits.filter((habit) =>
                data.checkins.some((item) => item.habitId === habit.id && item.checkedOn === day.key),
              ).length;
              const complete = total > 0 && checked === total;
              return (
                <div className="week-day" key={day.key}>
                  <span>{day.label}</span>
                  <b className={complete ? "complete" : checked ? "partial" : ""}>{complete ? "✓" : day.day}</b>
                </div>
              );
            })}
          </div>
          <div className="identity-row">
            <div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div>
            <div>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
            <a href="/signout-with-chatgpt?return_to=%2F">Sign out</a>
          </div>
        </aside>
      </section>

      {showCreate && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowCreate(false)}>
          <section className="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="new-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="sheet-handle" />
            <button className="close-button" type="button" aria-label="Close" onClick={() => setShowCreate(false)}>×</button>
            <p className="eyebrow">A PROMISE TO YOURSELF</p>
            <h2 id="new-title">What will you do each day?</h2>
            <form onSubmit={createHabit}>
              <label>
                Promise
                <input type="text" name="title" maxLength={80} required autoFocus placeholder="Drink one cup of water" />
              </label>
              <label>
                A little context <span>optional</span>
                <input type="text" name="note" maxLength={160} placeholder="Before my morning coffee" />
              </label>
              <fieldset>
                <legend>Choose a mark</legend>
                <div className="icon-picker">
                  {ICONS.map((icon, index) => (
                    <label key={icon}>
                      <input type="radio" name="icon" value={icon} defaultChecked={index === 0} />
                      <span>{icon}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <button className="primary-button" type="submit">Create daily promise <span aria-hidden="true">→</span></button>
            </form>
          </section>
        </div>
      )}

      {showInstall && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowInstall(false)}>
          <section className="modal-sheet install-sheet" role="dialog" aria-modal="true" aria-labelledby="install-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="sheet-handle" />
            <button className="close-button" type="button" aria-label="Close" onClick={() => setShowInstall(false)}>×</button>
            <img src="/icons/apple-touch-icon.png" alt="" />
            <p className="eyebrow">INSTALL ON IPHONE</p>
            <h2 id="install-title">Keep Daymark on your Home Screen</h2>
            <ol>
              <li><b>1</b><span>Open this page in <strong>Safari</strong>.</span></li>
              <li><b>2</b><span>Tap the <strong>Share</strong> button.</span></li>
              <li><b>3</b><span>Choose <strong>Add to Home Screen</strong>.</span></li>
            </ol>
            <button className="secondary-button" type="button" onClick={() => setShowInstall(false)}>Got it</button>
          </section>
        </div>
      )}
    </main>
  );
}
