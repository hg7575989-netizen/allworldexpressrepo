const PROD_API_BASE_URL = "https://allworldexpress-backend.onrender.com";
const envBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim();
const defaultBaseUrl =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : PROD_API_BASE_URL;
const API_BASE_URL = (envBaseUrl || defaultBaseUrl).replace(/\/+$/, "");

export function apiUrl(path) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}
