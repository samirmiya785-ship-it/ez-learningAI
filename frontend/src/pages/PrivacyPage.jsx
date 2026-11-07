import { Link } from "react-router-dom";

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-[var(--bg)] px-5 py-8 text-[var(--ink)] sm:px-8">
      <article className="mx-auto max-w-[720px]">
        <Link to="/" className="text-sm text-[var(--mute)] hover:text-[var(--ink)]">
          ← Back to ez-learningAI
        </Link>
        <h1 className="mt-10 text-3xl font-semibold">Privacy policy</h1>
        <p className="mt-2 text-sm text-[var(--mute)]">Last updated November 7, 2026</p>
        <div className="mt-8 space-y-7 leading-7">
          <section>
            <h2 className="text-lg font-semibold">Information we handle</h2>
            <p className="mt-2">
              When you create an account, we process your name, email address, and password credential. Passwords are stored as a hash by the service. When you use the learning assistant, your
              questions and generated answers are stored as conversation history. If you upload a PDF, its text is extracted and indexed so the assistant can retrieve relevant passages.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">How information is used</h2>
            <p className="mt-2">
              Account information supports sign-in and session management. Uploaded document text and questions are used to retrieve course material and generate answers. Contact-form details are used
              to reply to your request. The service does not currently provide account or document deletion controls; contact us to request deletion.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Storage and service providers</h2>
            <p className="mt-2">
              Account, session, document-index, and chat data are stored by the application using MongoDB. AI responses and embeddings are generated through Google AI services. The browser may keep
              chat history locally to make recent conversations available on that device. Do not upload confidential, sensitive, or personally identifying material unless you have permission to do so.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Cookies and security</h2>
            <p className="mt-2">
              The sign-in service uses an HTTP-only refresh-token cookie to maintain your session. We use reasonable technical safeguards, but no internet service can guarantee absolute security.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Your choices and contact</h2>
            <p className="mt-2">
              You can sign out to end the current session. For privacy questions or data removal requests, use the{" "}
              <Link to="/contact" className="underline underline-offset-2">
                contact form
              </Link>{" "}
              or email{" "}
              <a className="underline underline-offset-2" href="mailto:zynix011@gmail.com">
                zynix011@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
