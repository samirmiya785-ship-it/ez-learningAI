import { useState } from "react";
import api from "../api.js";
import { Link } from "react-router-dom";

export default function ContactPage() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setStatus("");
    const form = new FormData(formElement);
    try {
      await api.post("/api/contact", { name: form.get("name"), email: form.get("email"), message: form.get("message") });
      formElement.reset();
      setStatus("Your message has been sent. Thanks for getting in touch.");
    } catch (error) {
      setStatus(error.response?.data?.message || error.message || "Your message could not be sent. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const fieldClass = "mt-1 block w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-base text-[var(--ink)] outline-none focus:border-[var(--accent)]";
  return (
    <main className="min-h-dvh bg-[var(--bg)] px-5 py-8 text-[var(--ink)] sm:px-8">
      <article className="mx-auto max-w-[620px]">
        <Link to="/" className="text-sm text-[var(--mute)] hover:text-[var(--ink)]">
          ← Back to ez-learningAI
        </Link>
        <h1 className="mt-10 text-3xl font-semibold">Contact</h1>
        <p className="mt-2 text-[var(--mute)]">
          Send a message to{" "}
          <a className="underline underline-offset-2" href="mailto:zynix011@gmail.com">
            zynix011@gmail.com
          </a>
          .
        </p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block text-sm text-[var(--mute)]">
            Name
            <input required maxLength={120} name="name" autoComplete="name" className={fieldClass} />
          </label>
          <label className="block text-sm text-[var(--mute)]">
            Email
            <input required type="email" maxLength={254} name="email" autoComplete="email" className={fieldClass} />
          </label>
          <label className="block text-sm text-[var(--mute)]">
            Message
            <textarea required maxLength={5000} minLength={10} name="message" rows={6} className={`${fieldClass} resize-y`} />
          </label>
          <p role="status" aria-live="polite" className="min-h-5 text-sm text-[var(--mute)]">
            {status}
          </p>
          <button disabled={busy} className="rounded-xl bg-[var(--accent)] px-5 py-3 font-medium text-white disabled:opacity-60">
            {busy ? "Sending…" : "Send message"}
          </button>
        </form>
      </article>
    </main>
  );
}
