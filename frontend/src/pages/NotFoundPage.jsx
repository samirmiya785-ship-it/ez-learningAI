import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--bg)] px-5 text-center text-[var(--ink)]">
      <div>
        <p className="text-sm font-semibold text-[var(--accent)]">404</p>
        <h1 className="mt-2 text-3xl font-semibold">This page isn’t here</h1>
        <p className="mt-2 text-[var(--mute)]">The link may be out of date, or the page may have moved.</p>
        <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-medium text-[var(--bg)]">
          Return to learning <span aria-hidden="true">→</span>
        </Link>
      </div>
    </main>
  );
}
