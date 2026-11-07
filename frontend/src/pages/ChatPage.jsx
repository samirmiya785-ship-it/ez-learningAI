import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png.png";

const colorSchemeQuery = "(prefers-color-scheme: dark)";

function subscribeToColorScheme(onChange) {
  const mediaQuery = window.matchMedia(colorSchemeQuery);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getSystemDarkMode() {
  return window.matchMedia(colorSchemeQuery).matches;
}

const storage = {
  get(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* Storage may be disabled in private browsing. */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* Storage may be disabled in private browsing. */
    }
  },
};

function objectId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function request(path, options = {}, token) {
  const activeToken = token ? storage.get("ez:auth", null)?.accessToken || token : token;
  const send = (currentToken) =>
    axios({
      url: path,
      method: options.method || "GET",
      data: options.body,
      withCredentials: true,
      headers: {
        ...(options.body instanceof FormData ? {} : options.body ? { "Content-Type": "application/json" } : {}),
        ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
        ...options.headers,
      },
    });

  try {
    return (await send(activeToken)).data;
  } catch (error) {
    if (error.response?.status === 401 && activeToken && !path.includes("/refreshToken")) {
      try {
        const { data } = await axios.get("/api/auth/refreshToken", { withCredentials: true });
        storage.set("ez:auth", { ...storage.get("ez:auth", {}), accessToken: data.accessToken });
        return (await send(data.accessToken)).data;
      } catch (refreshError) {
        const message = refreshError.response?.data?.message || error.response?.data?.message;
        throw new Error(message || "Your session has expired. Please sign in again.");
      }
    }
    throw new Error(error.response?.data?.message || error.response?.data?.error || error.message || "Something went wrong. Please try again.");
  }
}

function Icon({ type, size = 20 }) {
  const common = { width: size, height: size, viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (type === "plus")
    return (
      <svg {...common}>
        <path d="M10 3v14M3 10h14" />
      </svg>
    );
  if (type === "menu")
    return (
      <svg {...common}>
        <path d="M3 6h14M3 14h14" />
      </svg>
    );
  if (type === "clip")
    return (
      <svg {...common}>
        <path d="m16 9.5-6 6a4 4 0 0 1-5.7-5.7l6.4-6.4a2.7 2.7 0 0 1 3.8 3.8l-6.4 6.4a1.3 1.3 0 0 1-1.9-1.9l5.7-5.7" />
      </svg>
    );
  if (type === "eye")
    return (
      <svg {...common}>
        <path d="M2 10s2.8-5 8-5 8 5 8 5-2.8 5-8 5-8-5-8-5Z" />
        <circle cx="10" cy="10" r="2" />
      </svg>
    );
  if (type === "eye-off")
    return (
      <svg {...common}>
        <path d="m3 3 14 14M8.6 5.2A8 8 0 0 1 10 5c5.2 0 8 5 8 5a12 12 0 0 1-2.1 2.6M6.2 6.2C3.5 7.5 2 10 2 10s2.8 5 8 5c.8 0 1.5-.1 2.2-.3" />
        <path d="M8.6 8.6a2 2 0 0 0 2.8 2.8" />
      </svg>
    );
  if (type === "trash")
    return (
      <svg {...common}>
        <path d="M3 5h14M8 5V3h4v2m3 0-.8 12H5.8L5 5m3 3v6m4-6v6" />
      </svg>
    );
  if (type === "moon")
    return (
      <svg {...common}>
        <path d="M16.5 12.2A6.8 6.8 0 0 1 7.8 3.5 6.8 6.8 0 1 0 16.5 12.2Z" />
      </svg>
    );
  if (type === "sun")
    return (
      <svg {...common}>
        <circle cx="10" cy="10" r="3.3" />
        <path d="M10 2v1.5m0 13V18m8-8h-1.5m-13 0H2m13.7-5.7-1.1 1.1M5.4 14.6l-1.1 1.1m11.4 0-1.1-1.1M5.4 5.4 4.3 4.3" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M10 15V4M5.5 8.5 10 4l4.5 4.5" />
    </svg>
  );
}

function AuthDialog({ open, onClose, onSignedIn }) {
  const dialogRef = useRef(null);
  const [mode, setMode] = useState("in");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError("");
    setBusy(true);
    const form = new FormData(formElement);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    try {
      if (mode === "up") {
        if (!name) throw new Error("Enter your name.");
        if (password.length < 8) throw new Error("Use at least 8 characters for your password.");
        await request("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
      }
      const data = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      const session = { ...data.user, accessToken: data.accessToken };
      storage.set("ez:auth", session);
      onSignedIn(session);
      formElement.reset();
      onClose();
    } catch (issue) {
      setError(issue.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onClose={onClose}
      className="w-[min(400px,calc(100%-32px))] rounded-[22px] border border-[var(--line)] bg-[var(--bg)] p-7 text-[var(--ink)] backdrop:bg-black/45"
    >
      <button type="button" onClick={onClose} aria-label="Close sign in" className="float-right -mr-2 -mt-2 grid size-9 place-items-center rounded-lg hover:bg-[var(--panel)]">
        ×
      </button>
      <h2 className="text-[22px] font-medium">{mode === "up" ? "Create your account" : "Welcome back"}</h2>
      <p className="mt-1 text-sm text-[var(--mute)]">{mode === "up" ? "Save your chats and course documents." : "Sign in to save your chats and documents."}</p>
      <div className="my-5 flex rounded-xl bg-[var(--panel)] p-1">
        {["in", "up"].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value);
              setError("");
              setShowPassword(false);
            }}
            className={`flex-1 rounded-lg py-2 text-sm ${mode === value ? "bg-[var(--bg)] text-[var(--ink)] shadow-sm" : "text-[var(--mute)]"}`}
          >
            {value === "in" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-3">
        {mode === "up" && (
          <label className="block text-sm text-[var(--mute)]">
            Name
            <input
              required
              autoComplete="name"
              name="name"
              type="text"
              className="mt-1 block w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-base text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
          </label>
        )}
        <label className="block text-sm text-[var(--mute)]">
          Email
          <input
            required
            autoComplete="email"
            name="email"
            type="email"
            className="mt-1 block w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-base text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block text-sm text-[var(--mute)]">
          Password
          <span className="relative mt-1 block">
            <input
              required
              minLength={mode === "up" ? 8 : undefined}
              autoComplete={mode === "up" ? "new-password" : "current-password"}
              name="password"
              type={showPassword ? "text" : "password"}
              className="block w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 pr-12 text-base text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute inset-y-0 right-1 grid w-10 place-items-center rounded-lg text-[var(--mute)] hover:bg-[var(--panel)]"
            >
              <Icon type={showPassword ? "eye-off" : "eye"} size={18} />
            </button>
          </span>
        </label>
        <p role="alert" className="min-h-5 text-sm text-[var(--error)]">
          {error}
        </p>
        <button disabled={busy} className="w-full rounded-xl bg-[var(--accent)] px-3 py-3 font-medium text-white disabled:opacity-60">
          {busy ? "Please wait…" : mode === "up" ? "Create account" : "Sign in"}
        </button>
      </form>
    </dialog>
  );
}

function ChatMessage({ message }) {
  if (message.role === "user")
    return (
      <div className="flex justify-end py-3">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-[20px] rounded-br-md bg-[var(--user)] px-4 py-2.5">{message.text}</div>
      </div>
    );
  return (
    <div className="flex gap-3 py-3">
      <div className="mt-0.5 size-9 shrink-0 overflow-hidden rounded-lg">
        <img src={logo} alt="ez-learningAI assistant" className="size-full object-cover" />
      </div>
      <div className="markdown-content min-w-0 flex-1">
        <ReactMarkdown>{message.text}</ReactMarkdown>
        {message.pending && (
          <div className="mt-2 flex items-center gap-2 text-sm text-[var(--mute)]" role="status" aria-live="polite">
            <span className="thinking-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>la hai ta eakaixin mw bhandi halxu</span>
          </div>
        )}
        {message.sources?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {message.sources.map((source, index) => (
              <span key={source.chunkId || `${source.subject}-${index}`} className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-[13px] text-[var(--mute)]">
                <b className="font-medium text-[var(--ink)]">{source.subject || source.title || "Course material"}</b>
                {source.pageNumber ? ` · p. ${source.pageNumber}` : ""}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [chatsOwner, setChatsOwner] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [theme, setTheme] = useState("system");
  const prefersDark = useSyncExternalStore(subscribeToColorScheme, getSystemDarkMode, () => false);
  const isDark = theme === "dark" || (theme === "system" && prefersDark);
  const [consent, setConsent] = useState(null);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [preferenceCookies, setPreferenceCookies] = useState(false);
  const fileRef = useRef(null);
  const chatRef = useRef(null);
  const composerRef = useRef(null);
  const activeChat = chats.find((chat) => chat.id === activeId);

  useEffect(() => {
    setUser(storage.get("ez:auth", null));
    const savedConsent = storage.get("ez:consent", null);
    setConsent(savedConsent);
    const savedTheme = savedConsent?.preferenceCookies ? storage.get("ez:theme", "system") : "system";
    setTheme(savedTheme);
    setPreferenceCookies(Boolean(savedConsent?.preferenceCookies));
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", isDark ? "#101216" : "#fbfbfc");
  }, [theme, isDark]);
  useEffect(() => {
    const owner = user?.email || "guest";
    setChats(storage.get(`ez:chats:${owner}`, []));
    setChatsOwner(owner);
    setActiveId(null);
    setDocuments([]);
  }, [user?.email]);
  useEffect(() => {
    const owner = user?.email || "guest";
    if (chatsOwner === owner) storage.set(`ez:chats:${owner}`, chats);
  }, [chats, chatsOwner, user?.email]);
  useEffect(() => {
    if (chatRef.current && activeChat?.messages?.length) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [activeChat?.messages]);

  async function uploadFiles(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    for (const file of files) {
      const data = new FormData();
      data.append("pdf", file);
      data.append("title", file.name);
      try {
        const result = await request("/api/pdf/upload", { method: "POST", body: data }, user?.accessToken);
        setDocuments((current) => [...current, { id: result.bookId, name: file.name }]);
        setNotice(`${file.name} is ready to use.`);
      } catch (issue) {
        setNotice(issue.message);
      }
    }
  }

  async function sendMessage(text = input) {
    const question = text.trim();
    if (!question || busy) return;
    const id = activeId || objectId();
    const previous = chats.find((chat) => chat.id === id);
    const messages = [...(previous?.messages || []), { role: "user", text: question }, { role: "assistant", text: "", pending: true }];
    const nextChat = previous ? { ...previous, messages } : { id, title: question.slice(0, 42), messages };
    setChats((current) => (previous ? current.map((chat) => (chat.id === id ? nextChat : chat)) : [nextChat, ...current]));
    setActiveId(id);
    setInput("");
    if (composerRef.current) composerRef.current.style.height = "auto";
    setBusy(true);
    setNotice("");
    try {
      const data = await request("/api/chat/query", { method: "POST", body: JSON.stringify({ sessionId: id, query: question }) }, user?.accessToken);
      setChats((current) =>
        current.map((chat) =>
          chat.id === id
            ? { ...chat, messages: chat.messages.map((message, index) => (index === chat.messages.length - 1 ? { role: "assistant", text: data.answer, sources: data.sources || [] } : message)) }
            : chat,
        ),
      );
    } catch (issue) {
      setChats((current) =>
        current.map((chat) =>
          chat.id === id ? { ...chat, messages: chat.messages.map((message, index) => (index === chat.messages.length - 1 ? { role: "assistant", text: issue.message } : message)) } : chat,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    try {
      await request("/api/auth/logout", { method: "POST" }, user?.accessToken);
    } catch {
      /* Expired sessions are cleared locally too. */
    }
    storage.remove("ez:auth");
    setUser(null);
    setAccountOpen(false);
    setActiveId(null);
    setDocuments([]);
  }

  async function deleteChat(id) {
    if (busy && activeId === id) return;
    setDeletingId(id);
    try {
      await request(`/api/chat/${id}`, { method: "DELETE" }, user?.accessToken);
      setChats((current) => current.filter((chat) => chat.id !== id));
      if (activeId === id) {
        setActiveId(null);
        setDocuments([]);
      }
      setNotice("");
    } catch (issue) {
      setNotice(issue.message);
    } finally {
      setDeletingId(null);
    }
  }

  function startNewChat() {
    setActiveId(null);
    setDocuments([]);
    setInput("");
    setNotice("");
    setSidebarOpen(false);
  }

  function chooseConsent(allowPreferences) {
    const saved = { termsAccepted: true, preferenceCookies: allowPreferences, acceptedAt: new Date().toISOString() };
    storage.set("ez:consent", saved);
    if (allowPreferences) storage.set("ez:theme", theme);
    else storage.remove("ez:theme");
    setConsent(saved);
  }

  function toggleTheme() {
    const nextTheme = isDark ? "light" : "dark";
    setTheme(nextTheme);
    if (consent?.preferenceCookies) storage.set("ez:theme", nextTheme);
  }

  return (
    <div className="flex h-dvh min-h-[420px] overflow-hidden bg-[var(--bg)] text-[var(--ink)]">
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-[284px] shrink-0 flex-col border-r border-[var(--line)] bg-[var(--panel)] px-3.5 py-3.5 transition-transform duration-200 md:static md:w-[272px] md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <Link to="/" className="flex items-center gap-2 px-2 pb-4 text-[17px] font-semibold">
          <img src={logo} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
          <span>
            ez-learning<span className="text-[var(--accent)]">AI</span>
            <small className="block text-[12px] font-normal leading-5 text-[var(--mute)]">by Zynix</small>
          </span>
        </Link>
        <button onClick={startNewChat} className="flex w-full items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-left hover:border-[var(--mute)]">
          <Icon type="plus" size={16} />
          New chat
        </button>
        <nav aria-label="Recent conversations" className="mt-4 flex-1 overflow-y-auto">
          {user ? (
            <>
              <h2 className="mb-1 px-2 text-[13px] font-medium text-[var(--mute)]">Recent</h2>
              {chats.length ? (
                chats.map((chat) => (
                  <div key={chat.id} className={`group flex items-center gap-1 rounded-lg px-1 ${activeId === chat.id ? "bg-[var(--line)]" : "hover:bg-[var(--line)]"}`}>
                    <button
                      onClick={() => {
                        setActiveId(chat.id);
                        setSidebarOpen(false);
                      }}
                      className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap px-1 py-2 text-left"
                    >
                      {chat.title}
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete chat: ${chat.title}`}
                      title="Delete chat"
                      disabled={deletingId === chat.id || (busy && activeId === chat.id)}
                      onClick={() => deleteChat(chat.id)}
                      className="grid size-8 shrink-0 place-items-center rounded-md text-[var(--mute)] opacity-60 hover:bg-[var(--bg)] hover:text-[var(--error)] group-hover:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Icon type="trash" size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="px-2 py-1 text-[13px] text-[var(--mute)]">No conversations yet.</p>
              )}
            </>
          ) : (
            <p className="px-2 py-1 text-[13px] text-[var(--mute)]">Your conversations appear here after you sign in.</p>
          )}
        </nav>
        <div className="border-t border-[var(--line)] px-2 pt-3 text-[13px] text-[var(--mute)]">
          {user ? (
            <>
              <b className="block font-medium text-[var(--ink)]">{user.name}</b>
              <span>{user.email}</span>
            </>
          ) : (
            <>
              <button onClick={() => setAuthOpen(true)} className="underline underline-offset-2">
                Sign in
              </button>{" "}
              to save chats and documents.
            </>
          )}
          <div className="mt-2 flex gap-4">
            <Link to="/privacy" className="text-[var(--ink)] underline underline-offset-2">
              Privacy
            </Link>
            <Link to="/contact" className="text-[var(--ink)] underline underline-offset-2">
              Contact
            </Link>
          </div>
        </div>
      </aside>
      <button
        aria-label="Close conversations"
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 z-20 bg-black/40 transition-opacity md:hidden ${sidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <main className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-1.5 px-3">
          <button aria-label="Toggle sidebar" onClick={() => setSidebarOpen((value) => !value)} className="grid size-[38px] place-items-center rounded-[10px] hover:bg-[var(--panel)]">
            <Icon type="menu" />
          </button>
          <Link to="/" className="font-semibold md:hidden">
            <img src={logo} alt="" className="mr-2 inline-block size-7 rounded object-cover align-middle" />
            ez-learning<span className="text-[var(--accent)]">AI</span>
          </Link>
          <span className="flex-1" />
          <button
            aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
            aria-pressed={isDark}
            title={`Switch to ${isDark ? "light" : "dark"} mode`}
            onClick={toggleTheme}
            className="grid size-[38px] place-items-center rounded-[10px] hover:bg-[var(--panel)]"
          >
            <Icon type={isDark ? "sun" : "moon"} size={19} />
          </button>
          {user ? (
            <div className="relative">
              <button
                aria-label="Account"
                onClick={() => setAccountOpen((value) => !value)}
                className="grid size-[34px] place-items-center rounded-full border border-[var(--line)] bg-[var(--panel)] font-medium"
              >
                {user.name?.trim()?.[0]?.toUpperCase() || "U"}
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-11 z-20 min-w-52 rounded-[14px] border border-[var(--line)] bg-[var(--bg)] p-2 shadow-xl">
                  <p className="px-2 py-1 text-sm text-[var(--mute)]">
                    <b className="block font-medium text-[var(--ink)]">{user.name}</b>
                    {user.email}
                  </p>
                  <button onClick={signOut} className="w-full rounded-lg px-2 py-2 text-left hover:bg-[var(--panel)]">
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setAuthOpen(true)} className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--bg)]">
              Sign in
            </button>
          )}
        </header>
        <section ref={chatRef} aria-live="polite" className="flex-1 overflow-y-auto px-4">
          <div className="mx-auto max-w-[720px]">
            {!activeChat?.messages?.length ? (
              <div className="flex min-h-full flex-col justify-center pb-10 pt-16 sm:pt-0">
                <h1 className="mb-2 text-[clamp(28px,5.5vw,42px)] font-medium leading-[1.15]">what to do today?</h1>
                <p className="max-w-[46ch] text-[var(--mute)]">Why fear when ez-LearningAI is here</p>
              </div>
            ) : (
              activeChat.messages.map((message, index) => <ChatMessage key={`${activeChat.id}-${index}`} message={message} />)
            )}
          </div>
        </section>
        <footer className="shrink-0 px-4 pb-3 pt-2">
          <div className="mx-auto max-w-[720px] rounded-[26px] border border-[var(--line)] bg-[var(--panel)] p-2 pl-4 focus-within:border-[var(--mute)]">
            {documents.length > 0 && (
              <div className="mb-1 flex flex-wrap gap-1.5">
                {documents.map((doc) => (
                  <span key={doc.id} className="flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-1 text-[13px]">
                    {doc.name}
                    <button aria-label={`Remove ${doc.name}`} onClick={() => setDocuments((current) => current.filter((item) => item.id !== doc.id))} className="px-1 text-[var(--mute)]">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            {notice && (
              <p role="status" className="px-1 pb-1 text-xs text-[var(--mute)]">
                {notice}
              </p>
            )}
            <textarea
              ref={composerRef}
              id="message"
              aria-label="Message"
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                event.currentTarget.style.height = "auto";
                event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 180)}px`;
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !window.matchMedia("(pointer:coarse)").matches) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              rows={1}
              placeholder="K xa ta aaja Bichar"
              className="block max-h-[180px] min-h-10 w-full resize-none bg-transparent py-1.5 text-base outline-none placeholder:text-[var(--mute)]"
            />
            <div className="flex items-center gap-1">
              <button
                onClick={() => fileRef.current?.click()}
                aria-label="Attach PDF documents"
                title="Attach PDF documents"
                className="grid size-[38px] place-items-center rounded-[10px] hover:bg-[var(--bg)]"
              >
                <Icon type="clip" />
              </button>
              <input ref={fileRef} type="file" accept="application/pdf,.pdf" multiple hidden onChange={uploadFiles} />
              <span className="flex-1" />
              <button
                disabled={!input.trim() || busy}
                onClick={() => sendMessage()}
                aria-label="Send"
                className="grid size-9 place-items-center rounded-full bg-[var(--ink)] text-[var(--bg)] disabled:cursor-default disabled:opacity-20"
              >
                <Icon type="send" size={18} />
              </button>
            </div>
          </div>
          <p className="mx-auto mt-2 max-w-[720px] text-center text-[12px] text-[var(--mute)]">ez-learningAI can make mistakes. Check answers against your sources.</p>
        </footer>
      </main>
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} onSignedIn={setUser} />
      {!consent && (
        <section aria-labelledby="consent-title" className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--line)] bg-[var(--bg)] px-4 py-4 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] sm:px-6">
          <div className="mx-auto flex max-w-[1100px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-[660px]">
              <h2 id="consent-title" className="text-base font-semibold">
                Cookie &amp; terms choices
              </h2>
              <p className="mt-1 text-sm leading-5 text-[var(--mute)]">
                An HTTP-only sign-in cookie and local chat storage support core features. Optional preference storage remembers your theme. Read our{" "}
                <Link to="/terms" className="text-[var(--ink)] underline underline-offset-2">
                  Terms &amp; Conditions
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-[var(--ink)] underline underline-offset-2">
                  Privacy Policy
                </Link>
                .
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={termsAgreed} onChange={(event) => setTermsAgreed(event.target.checked)} />I agree to the Terms &amp; Conditions
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={preferenceCookies} onChange={(event) => setPreferenceCookies(event.target.checked)} />
                  Allow preference storage
                </label>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                disabled={!termsAgreed}
                onClick={() => chooseConsent(false)}
                className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
              >
                Necessary only
              </button>
              <button
                disabled={!termsAgreed}
                onClick={() => chooseConsent(preferenceCookies)}
                className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Accept choices
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
