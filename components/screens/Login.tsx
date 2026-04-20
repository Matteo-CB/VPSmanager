"use client";
import React from "react";
import { signIn } from "next-auth/react";
import { Button } from "../ui/primitives";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/client-api";

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const info = useQuery({
    queryKey: ["public-host"],
    queryFn: async () => {
      try { return await apiGet<{ hostname: string }>("/api/system/overview"); }
      catch { return { hostname: "" }; }
    },
    retry: false,
  });

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", { email, password: pw, redirect: false });
      if (res?.error) setError("Identifiants invalides");
      else onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: "100vh", background: "var(--bg)", display: "grid", gridTemplateColumns: "1.1fr 1fr", color: "var(--text)" }}>
      <div style={{ padding: "40px 56px", display: "flex", flexDirection: "column", justifyContent: "space-between", borderRight: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <svg width="18" height="18" viewBox="0 0 18 18"><rect x="1" y="1" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.2"/><circle cx="9" cy="9" r="1.6" fill="currentColor"/></svg>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)" }}>Console</span>
        </div>

        <div style={{ maxWidth: 520 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 18 }}>
            Private administration
          </div>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 72, lineHeight: 0.95, margin: 0, letterSpacing: "-0.02em", fontWeight: 400 }}>
            A single <em style={{ fontStyle: "italic", color: "var(--text-2)" }}>machine</em>,<br/>
            in <em style={{ fontStyle: "italic", color: "var(--text-2)" }}>plain</em> sight.
          </h1>
          <p style={{ marginTop: 32, color: "var(--text-2)", maxWidth: 420, lineHeight: 1.6, fontSize: 14 }}>
            Sites, déploiements, logs, terminal et bases de données d&apos;un seul VPS. Sans plateforme, sans tiers, sans limite arbitraire. Accès strictement privé.
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-3)", fontFamily: "var(--mono)", letterSpacing: "0.04em" }}>
          <span>noindex · nofollow</span>
          <span>{info.data?.hostname ?? ""}</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <form onSubmit={submit} style={{ width: 360, display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 10 }}>Sign in</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 32, letterSpacing: "-0.01em", lineHeight: 1 }}>Welcome back.</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>Email</span>
              <input
                value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email"
                style={{ background: "transparent", border: 0, borderBottom: "1px solid var(--line)", padding: "8px 0", color: "var(--text)", fontSize: 14, outline: "none", fontFamily: "var(--mono)" }}
                onFocus={(e) => e.target.style.borderBottomColor = "var(--signal)"}
                onBlur={(e) => e.target.style.borderBottomColor = "var(--line)"}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>Password</span>
              <input
                value={pw} onChange={(e) => setPw(e.target.value)} type="password" autoComplete="current-password" placeholder="••••••••••"
                style={{ background: "transparent", border: 0, borderBottom: "1px solid var(--line)", padding: "8px 0", color: "var(--text)", fontSize: 14, outline: "none", fontFamily: "var(--mono)" }}
                onFocus={(e) => e.target.style.borderBottomColor = "var(--signal)"}
                onBlur={(e) => e.target.style.borderBottomColor = "var(--line)"}
              />
            </label>
          </div>

          {error && <div style={{ fontSize: 12, color: "var(--err)" }}>{error}</div>}

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Button type="submit" variant="primary" size="lg" iconRight="arrow-right" disabled={loading} style={{ flex: 1, justifyContent: "space-between" }}>
              {loading ? "Verifying…" : "Continue"}
            </Button>
          </div>
          <div style={{ height: 2, position: "relative", overflow: "hidden", borderRadius: 2, background: "transparent", visibility: loading ? "visible" : "hidden" }}>
            <div className="progress-bar" style={{ position: "relative", height: "100%" }}/>
          </div>
        </form>
      </div>
    </div>
  );
}
