import Link from "next/link";

export default function Home() {
  return (
    <main className="landing">
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="Hakujina home">
          <span className="wordmark-mark" aria-hidden="true">h</span>
          hakujina
        </Link>
        <nav className="header-nav" aria-label="Main navigation">
          <Link href="/login">Log in</Link>
          <Link className="button button-small" href="/register">Join the studio</Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> A little more handmade</p>
          <h1>Find joy in the <em>everyday.</em></h1>
          <p className="hero-description">
            Thoughtful pottery, shaped slowly by hand. Find your next everyday
            favourite, and a little more room for ritual.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/register">Create your account <span aria-hidden="true">↗</span></Link>
            <Link className="text-link" href="/login">Already a member? Log in</Link>
          </div>
          <div className="hero-note">
            <span className="note-line" />
            <span>Small batches. Made to be lived with.</span>
          </div>
        </div>
        <div className="hero-art" aria-label="Illustration of handmade pottery" role="img">
          <div className="art-sun" />
          <div className="art-caption">Made slowly,<br />with feeling.</div>
          <svg className="pottery-illustration" viewBox="0 0 520 520" fill="none" aria-hidden="true">
            <path d="M92 402c48-16 95-22 146-19 65 4 120 19 191 7" stroke="#6b7057" strokeWidth="2" strokeLinecap="round" />
            <path d="M219 122c10 23 10 54 1 82-6 18-21 39-35 63-17 28-29 65-25 99 5 42 39 69 96 69 59 0 94-28 97-72 3-37-11-69-27-99-13-24-25-43-31-62-8-28-8-57 2-80" fill="#c87952" />
            <path d="M219 122c10 23 10 54 1 82-6 18-21 39-35 63-17 28-29 65-25 99 5 42 39 69 96 69 59 0 94-28 97-72 3-37-11-69-27-99-13-24-25-43-31-62-8-28-8-57 2-80" stroke="#8e4e36" strokeWidth="3" />
            <path d="M217 122c26 14 67 15 104 0l-4 24c-25 14-67 15-97 1l-3-25Z" fill="#e1a47c" stroke="#8e4e36" strokeWidth="3" />
            <path d="M188 258c46 20 112 22 161 2M171 301c55 19 126 21 183 4" stroke="#e8aa7b" strokeWidth="5" strokeLinecap="round" opacity=".8" />
            <path d="M232 135c17 6 39 8 59 5" stroke="#f2c5a5" strokeWidth="3" strokeLinecap="round" />
            <path d="M340 202c51-34 78-8 65 30-7 19-25 35-45 44" stroke="#8e4e36" strokeWidth="12" strokeLinecap="round" />
            <path d="M340 202c44-27 64-7 53 24-5 15-19 28-34 36" stroke="#e8aa7b" strokeWidth="5" strokeLinecap="round" />
            <path d="M122 402h331" stroke="#bcae91" strokeWidth="2" />
            <path d="M130 402c4-7 11-11 20-11M423 402c4-7 11-11 20-11" stroke="#6b7057" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="art-stamp">One of<br />a kind</span>
        </div>
      </section>

      <footer className="landing-footer">
        <span>Handmade with care, for the way you live.</span>
        <span>Pottery for everyday rituals <span aria-hidden="true">✳</span></span>
      </footer>
    </main>
  );
}
