import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <main className="auth-page">
      <header className="site-header auth-header">
        <Link className="wordmark" href="/" aria-label="Hakujina home">
          <span className="wordmark-mark" aria-hidden="true">h</span>
          hakujina
        </Link>
        <Link className="back-link" href="/">Back to home <span aria-hidden="true">↗</span></Link>
      </header>
      <div className="auth-layout">
        <aside className="auth-story">
          <div className="story-topline"><span className="story-flower">✳</span> Objects with a little soul</div>
          <div className="story-art">
            <div className="story-orbit" />
            <svg viewBox="0 0 360 360" fill="none" aria-hidden="true">
              <ellipse cx="180" cy="296" rx="125" ry="15" fill="#c6b89e" opacity=".55" />
              <path d="M142 77c5 17 6 36 0 54-5 15-17 30-28 48-15 24-23 51-19 78 4 35 33 55 84 55s81-22 84-57c3-29-8-56-21-80-10-19-20-35-25-50-6-17-5-33 0-48" fill="#c87952" />
              <path d="M142 77c5 17 6 36 0 54-5 15-17 30-28 48-15 24-23 51-19 78 4 35 33 55 84 55s81-22 84-57c3-29-8-56-21-80-10-19-20-35-25-50-6-17-5-33 0-48" stroke="#8e4e36" strokeWidth="3" />
              <path d="M141 78c26 12 55 13 96 0l-2 17c-27 12-61 12-92 0l-2-17Z" fill="#e1a47c" stroke="#8e4e36" strokeWidth="3" />
              <path d="M115 190c38 17 98 18 143 1M105 224c48 16 103 18 158 3" stroke="#e9b18a" strokeWidth="4" strokeLinecap="round" />
              <path d="M249 146c37-25 55-7 45 21-5 14-18 25-32 31" stroke="#8e4e36" strokeWidth="9" strokeLinecap="round" />
              <path d="M248 146c31-19 44-5 37 17-4 10-13 19-24 25" stroke="#e9b18a" strokeWidth="4" strokeLinecap="round" />
              <path d="M65 298h230" stroke="#94866e" strokeWidth="2" />
            </svg>
            <span className="story-art-note">A shape for<br />slow mornings</span>
          </div>
          <p className="story-quote">“The pieces we reach for, day after day.”</p>
          <p className="story-credit">Made by hand, meant for home.</p>
        </aside>
        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-heading">
            <p className="eyebrow"><span className="eyebrow-dot" /> {eyebrow}</p>
            <h1 id="auth-title">{title}</h1>
            <p>{description}</p>
          </div>
          {children}
          <div className="auth-card-footer">
            <span>Thoughtful pieces for everyday rituals.</span>
            <span aria-hidden="true">✳</span>
          </div>
        </section>
      </div>
      <footer className="auth-footer"><span>© Hakujina Studio</span><span>Made slowly. Made to last.</span></footer>
    </main>
  );
}
