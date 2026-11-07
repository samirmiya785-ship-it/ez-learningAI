import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";

const app = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
const root = document.getElementById("root");

if (import.meta.env.MODE === "vercel") {
  createRoot(root).render(app);
} else {
  hydrateRoot(root, app);
}
