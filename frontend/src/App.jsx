import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import ChatPage from "./pages/ChatPage.jsx";
import ContactPage from "./pages/ContactPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import PrivacyPage from "./pages/PrivacyPage.jsx";
import TermsPage from "./pages/TermsPage.jsx";
import { resolvePageMeta } from "./pageMeta.js";

function PageMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const meta = resolvePageMeta(pathname);
    document.title = meta.title;
    let description = document.querySelector('meta[name="description"]');
    if (!description) {
      description = document.createElement("meta");
      description.name = "description";
      document.head.append(description);
    }
    description.content = meta.description;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    const canonicalOrigin = canonical.href ? new URL(canonical.href).origin : window.location.origin;
    canonical.href = new URL(pathname, canonicalOrigin).href;
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <PageMetadata />
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/privacy-policy" element={<Navigate to="/privacy" replace />} />
        <Route path="/contact-us" element={<Navigate to="/contact" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
