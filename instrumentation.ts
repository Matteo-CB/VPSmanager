

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.VPS_DISABLE_BG !== "1") {
    await import("./instrumentation.node");
  }
}
