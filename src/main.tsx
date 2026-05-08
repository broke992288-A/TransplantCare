import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { installAuthLockPatch } from "./lib/authLockPatch";
import App from "./App.tsx";
import "./index.css";

// Install BEFORE any module that constructs a Supabase client touches
// `navigator.locks`. Prevents `AbortError: Lock broken … 'steal'` across tabs.
installAuthLockPatch();

const PREVIEW_SW_CLEANUP_KEY = "__lovable_preview_sw_cleanup__";

function isPreviewContext() {
  const isPreviewHost = window.location.hostname.includes("id-preview--");

  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  return isPreviewHost || isInIframe;
}

async function cleanupPreviewCaching() {
  if (!isPreviewContext() || !("serviceWorker" in navigator)) {
    return true;
  }

  const hadController = Boolean(navigator.serviceWorker.controller);
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ("caches" in window) {
    const cacheNames = await window.caches.keys();
    await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
  }

  if (hadController && !window.sessionStorage.getItem(PREVIEW_SW_CLEANUP_KEY)) {
    window.sessionStorage.setItem(PREVIEW_SW_CLEANUP_KEY, "true");
    window.location.reload();
    return false;
  }

  window.sessionStorage.removeItem(PREVIEW_SW_CLEANUP_KEY);
  return true;
}

async function bootstrap() {
  try {
    const canRender = await cleanupPreviewCaching();
    if (!canRender) return;
  } catch {
    window.sessionStorage.removeItem(PREVIEW_SW_CLEANUP_KEY);
  }

  if ("serviceWorker" in navigator) {
    registerSW({ immediate: true });
  }

  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();
