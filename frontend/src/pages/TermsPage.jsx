import { Link } from "react-router-dom";

export default function TermsPage() {
  return (
    <main className="min-h-dvh bg-[var(--bg)] px-5 py-8 text-[var(--ink)] sm:px-8">
      <article className="mx-auto max-w-[720px]">
        <Link to="/" className="text-sm text-[var(--mute)] hover:text-[var(--ink)]">
          ← Back to ez-learningAI
        </Link>
        <h1 className="mt-10 text-3xl font-semibold">Terms &amp; Conditions</h1>
        <p className="mt-2 text-sm text-[var(--mute)]">Last updated November 7, 2026</p>
        <div className="mt-8 space-y-7 leading-7">
          <section>
            <h2 className="text-lg font-semibold">Using ez-learningAI</h2>
            <p className="mt-2">Use the service lawfully and only with materials you are permitted to upload. Keep your account credentials secure and provide accurate account information.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Course materials and content</h2>
            <p className="mt-2">
              You retain responsibility for the documents you upload and must have the rights or permission needed to use them. Do not upload unlawful, confidential, or personal information without
              authorization.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">AI-generated answers</h2>
            <p className="mt-2">
              Answers are generated automatically and may be incomplete, inaccurate, or lack context. They are study aids, not professional advice or a substitute for checking your course materials
              and instructor guidance.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Availability and accounts</h2>
            <p className="mt-2">Features may change, be interrupted, or become unavailable. We may suspend access when an account is used abusively or in violation of these terms.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Privacy and contact</h2>
            <p className="mt-2">
              Use of the service is also covered by our{" "}
              <Link to="/privacy" className="underline underline-offset-2">
                Privacy Policy
              </Link>
              . Questions about these terms can be sent through the{" "}
              <Link to="/contact" className="underline underline-offset-2">
                contact page
              </Link>
              .
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
