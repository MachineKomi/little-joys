export interface PwaStatus {
  ready: boolean;
  message: string;
  updateAvailable: boolean;
  buildId?: string;
}

type CacheStatus = {
  type: "CACHE_STATUS";
  ready: boolean;
  buildId: string;
  version: string;
};
const callbacks = new Set<(status: PwaStatus) => void>();
let registration: ServiceWorkerRegistration | undefined;
let setup: Promise<void> | undefined;
let status: PwaStatus = {
  ready: false,
  message: "Checking offline availability…",
  updateAvailable: false,
};
let verification = 0;

function publish(next: PwaStatus) {
  status = next;
  callbacks.forEach((callback) => callback(status));
}

export function verifyWorker(
  worker: ServiceWorker,
  timeoutMs = 7000,
): Promise<CacheStatus | null> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    let finished = false;
    const finish = (value: CacheStatus | null) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      channel.port1.close();
      channel.port2.close();
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    channel.port1.onmessage = (event) => {
      const value = event.data;
      finish(
        value?.type === "CACHE_STATUS" &&
          typeof value.ready === "boolean" &&
          typeof value.buildId === "string" &&
          typeof value.version === "string"
          ? value
          : null,
      );
    };
    try {
      worker.postMessage({ type: "VERIFY_CACHE" }, [channel.port2]);
    } catch {
      finish(null);
    }
  });
}

export async function refreshPwaStatus(): Promise<void> {
  const ticket = ++verification;
  const worker = navigator.serviceWorker?.controller || registration?.active;
  if (!worker || worker.state !== "activated") {
    publish({
      ready: false,
      message:
        "Offline saving is not complete. Keep this page online to finish.",
      updateAvailable: Boolean(registration?.waiting),
    });
    return;
  }
  const result = await verifyWorker(worker);
  if (ticket !== verification) return;
  const sameBuild = result?.buildId === __BUILD_ID__;
  const ready = result?.ready === true && sameBuild;
  const updateAvailable = Boolean(registration?.waiting);
  // After a replacement settles, only active + current waiting versions remain.
  // The worker rechecks lifecycle references before deleting any abandoned staging cache.
  if (updateAvailable && !registration?.installing)
    registration?.active?.postMessage({ type: "PRUNE_CACHES" });
  let message = ready
    ? "Offline cache verified for all three toys. Browser storage can still be cleared."
    : "Offline cache is unavailable or incomplete. Online play remains available; reconnect to save it again.";
  if (result && !sameBuild)
    message =
      "A different saved version is active. Close every Little Joys window and reopen online before relying on offline play.";
  if (updateAvailable)
    message +=
      " An update is saved. Close every Little Joys tab and Home Screen window, then reopen to apply it.";
  publish({ ready, message, updateAvailable, buildId: result?.buildId });
}

function observeRegistration(reg: ServiceWorkerRegistration) {
  const watchInstalling = () => {
    const worker = reg.installing;
    if (!worker) return;
    const changed = () => {
      if (
        worker.state === "installed" ||
        worker.state === "activated" ||
        worker.state === "redundant"
      ) {
        void refreshPwaStatus();
      }
      if (worker.state === "activated" || worker.state === "redundant")
        worker.removeEventListener("statechange", changed);
    };
    worker.addEventListener("statechange", changed);
  };
  reg.addEventListener("updatefound", watchInstalling);
  watchInstalling();
}

async function initialize() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    publish({
      ready: false,
      message:
        "Offline saving is unavailable in this browser. Online play still works.",
      updateAvailable: false,
    });
    return;
  }
  if (import.meta.env.DEV) {
    publish({
      ready: false,
      message:
        "Development preview: offline saving is tested in the production build.",
      updateAvailable: false,
    });
    return;
  }
  try {
    registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    observeRegistration(registration);
    void navigator.serviceWorker.ready.then(() => refreshPwaStatus());
    await refreshPwaStatus();
  } catch {
    publish({
      ready: false,
      message:
        "Offline saving could not finish. Online play still works; try again when connected.",
      updateAvailable: false,
    });
  }
}

/** Call only from a deliberate adult action. Existing windows are never reloaded. */
export async function applyUpdate(): Promise<void> {
  if (!registration) {
    setup = undefined;
    setup = initialize();
    await setup;
    return;
  }
  try {
    await registration.update();
    await refreshPwaStatus();
  } catch {
    publish({
      ...status,
      message:
        "Update check could not finish. The current toy remains available. Try again online.",
    });
  }
}

export function registerPwa(callback: (status: PwaStatus) => void): () => void {
  callbacks.add(callback);
  callback(status);
  const refresh = () => {
    if (document.visibilityState !== "hidden") void refreshPwaStatus();
  };
  window.addEventListener("online", refresh);
  window.addEventListener("offline", refresh);
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", refresh);
  navigator.serviceWorker?.addEventListener("controllerchange", refresh);
  setup ??= initialize();
  return () => {
    callbacks.delete(callback);
    window.removeEventListener("online", refresh);
    window.removeEventListener("offline", refresh);
    window.removeEventListener("focus", refresh);
    document.removeEventListener("visibilitychange", refresh);
    navigator.serviceWorker?.removeEventListener("controllerchange", refresh);
  };
}
