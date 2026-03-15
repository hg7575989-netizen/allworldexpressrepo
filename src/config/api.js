const PROD_API_BASE_URL = "https://allworldexpress-backend.onrender.com";
const envBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim();
const hostname = String(window.location.hostname || "").trim().toLowerCase();

function isPrivateLanHost(value) {
  if (!value) return false;
  if (value === "localhost" || value === "127.0.0.1" || value === "::1") return true;
  if (value.endsWith(".local")) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(value)) return true;

  const private172Match = value.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (private172Match) {
    const secondOctet = Number(private172Match[1]);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }

  return false;
}

const defaultBaseUrl = isPrivateLanHost(hostname)
  ? `http://${hostname === "::1" ? "localhost" : hostname}:5000`
  : PROD_API_BASE_URL;
const API_BASE_URL = (envBaseUrl || defaultBaseUrl).replace(/\/+$/, "");

export function apiUrl(path) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}
