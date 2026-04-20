

import { hasStripe } from "./env";

let started = false;

export function startBackgroundJobs() {
  if (started) return;
  started = true;

  if (hasStripe) {
    scheduleStripe();
  }

  scheduleDiscovery();
}

function scheduleStripe() {
  const run = async () => {
    try {
      const { syncStripe } = await import("./stripe");
      const stats = await syncStripe();
      console.log("[bg:stripe] synced", stats);
    } catch (e) {
      console.warn("[bg:stripe] failed:", (e as Error).message);
    }
  };

  setTimeout(run, 30_000);
  setInterval(run, 10 * 60 * 1000).unref();
}

function scheduleDiscovery() {
  const run = async () => {
    try {
      const { discoverSystem } = await import("./discovery");
      await discoverSystem();
    } catch (e) {
      console.warn("[bg:discovery] failed:", (e as Error).message);
    }
  };
  setTimeout(run, 10_000);
  setInterval(run, 2 * 60 * 1000).unref();
}
