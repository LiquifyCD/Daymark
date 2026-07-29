import { getChatGPTUser, chatGPTSignInPath } from "./chatgpt-auth";
import { Dashboard } from "./dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();

  if (!user) {
    return (
      <main className="login-shell">
        <video
          className="login-video"
          muted
          loop
          playsInline
          preload="metadata"
          poster="/media/launch-poster.jpg"
          aria-hidden="true"
        >
          <source src="/media/launch-background.mp4" type="video/mp4" />
        </video>
        <div className="video-shade" />
        <section className="login-card">
          <img className="login-logo" src="/icons/icon-192.png" alt="" />
          <p className="eyebrow">NO-COMMENT · DAILY</p>
          <h1>Keep your word<br />to yourself.</h1>
          <p className="login-copy">
            One clear promise. One honest check-in. Every day.
          </p>
          <a className="primary-button login-button" href={chatGPTSignInPath("/")}>
            Sign in to Daymark
            <span aria-hidden="true">→</span>
          </a>
          <p className="privacy-note">Private by default · Your progress stays yours</p>
        </section>
      </main>
    );
  }

  return <Dashboard user={{ name: user.displayName, email: user.email }} />;
}
