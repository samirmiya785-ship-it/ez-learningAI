import axios from "axios";

const baseURL =
  import.meta.env.MODE === "vercel"
    ? ""
    : import.meta.env.VITE_BACKEND_URL ||
      (import.meta.env.DEV ? "http://localhost:5000" : "");

const api = axios.create({
  baseURL,
  withCredentials: true,
});

export default api;
