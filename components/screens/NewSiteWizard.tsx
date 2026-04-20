"use client";
import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button, StatusDot } from "../ui/primitives";
import { Icon } from "../ui/Icon";
import { apiGet, apiPost } from "@/lib/client-api";

type Status = { connected: boolean; login: string | null };
type Repo = { id: number; fullName: string; name: string; private: boolean; description: string | null; defaultBranch: string };
type Zone = { id: string; domain: string; provider: string; records: number };

export function NewSiteWizard({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (slug: string, deploymentId: string) => void }) {
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [selectedRepo, setSelectedRepo] = React.useState<Repo | null>(null);
  const [branch, setBranch] = React.useState("main");
  const [framework, setFramework] = React.useState<"NEXTJS" | "STATIC" | "ASTRO" | "CUSTOM">("NEXTJS");
  const [mode, setMode] = React.useState<"subdomain" | "apex">("subdomain");
  const [subLabel, setSubLabel] = React.useState("");
  const [subZone, setSubZone] = React.useState("");
  const [apexDomain, setApexDomain] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const statusQ = useQuery({ enabled: open, queryKey: ["github", "status"], queryFn: () => apiGet<Status>("/api/github/connect") });
  const reposQ = useQuery({
    enabled: open && !!statusQ.data?.connected,
    queryKey: ["github", "repos"],
    queryFn: () => apiGet<{ data: Repo[] }>("/api/github/repos").then((r) => r.data),
  });
  const zonesQ = useQuery({
    enabled: open,
    queryKey: ["dns", "zones"],
    queryFn: () => apiGet<{ data: Zone[] }>("/api/dns/zones").then((r) => r.data),
  });

  React.useEffect(() => {
    if (zonesQ.data && !subZone && zonesQ.data.length > 0) {
      setSubZone(zonesQ.data.find((z) => z.domain === "hiddenlab.fr")?.domain ?? zonesQ.data[0].domain);
    }
  }, [zonesQ.data, subZone]);

  const [q, setQ] = React.useState("");
  const repos = (reposQ.data ?? []).filter((r) => !q || r.fullName.toLowerCase().includes(q.toLowerCase()));

  const create = useMutation({
    mutationFn: (payload: object) => apiPost<{ siteId: string; slug: string; deploymentId: string }>("/api/sites/create-from-github", payload),
    onSuccess: (r) => { onCreated(r.slug, r.deploymentId); onClose(); },
    onError: (e: Error) => setError(e.message),
  });

  if (!open) return null;

  const finalDomain = mode === "subdomain" ? `${subLabel}.${subZone}` : apexDomain;
  const canSubmit = selectedRepo && branch && (mode === "subdomain" ? subLabel && subZone : apexDomain) && !create.isPending;

  const submit = () => {
    setError(null);
    if (!selectedRepo) return;
    create.mutate({
      repoFullName: selectedRepo.fullName,
      branch,
      framework,
      mode,
      domain: mode === "subdomain" ? `${subLabel}.${subZone}` : apexDomain,
      name: selectedRepo.name,
    });
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 720, maxHeight: "90vh", overflow: "hidden", background: "var(--surface)", border: "1px solid var(--line-strong)", borderRadius: 6, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 22 }}>Nouveau site depuis GitHub</div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>Étape {step} / 3</div>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-3)" }}><Icon name="x" size={14}/></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {!statusQ.data?.connected && (
            <div style={{ padding: 20, background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 4, fontSize: 13 }}>
              Tu dois d&apos;abord connecter ton GitHub dans <b>Paramètres → GitHub</b>.
            </div>
          )}

          {statusQ.data?.connected && step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>Repo ({statusQ.data.login}) · sélectionne celui à déployer</div>
              <input
                value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer..."
                style={{ background: "var(--surface-2)", border: "1px solid var(--line)", padding: "8px 10px", fontSize: 13, color: "var(--text)", borderRadius: 4, outline: "none" }}
              />
              <div style={{ maxHeight: 360, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 4 }}>
                {reposQ.isLoading && <div style={{ padding: 20, color: "var(--text-3)", fontSize: 12 }}>Chargement des repos…</div>}
                {repos.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => { setSelectedRepo(r); setBranch(r.defaultBranch); }}
                    style={{
                      padding: "10px 14px", borderBottom: "1px solid var(--line)", cursor: "pointer",
                      background: selectedRepo?.id === r.id ? "var(--surface-2)" : "transparent",
                      display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center",
                    }}
                  >
                    <Icon name={r.private ? "lock" : "globe"} size={14} style={{ color: r.private ? "var(--warn)" : "var(--text-3)" }}/>
                    <div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 13 }}>{r.fullName}</div>
                      <div style={{ fontSize: 11, color: "var(--text-3)" }}>{r.description ?? "—"}</div>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-4)", fontFamily: "var(--mono)" }}>{r.defaultBranch}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {statusQ.data?.connected && step === 2 && selectedRepo && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 13, padding: 10, background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 4 }}>{selectedRepo.fullName}</div>

              <Label text="Branche">
                <input value={branch} onChange={(e) => setBranch(e.target.value)} style={inputStyle}/>
              </Label>

              <Label text="Framework">
                <select value={framework} onChange={(e) => setFramework(e.target.value as typeof framework)} style={inputStyle}>
                  <option value="NEXTJS">Next.js (systemd + proxy)</option>
                  <option value="ASTRO">Astro</option>
                  <option value="STATIC">Static (HTML)</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </Label>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setMode("subdomain")} style={{ flex: 1, padding: 12, border: `1px solid ${mode === "subdomain" ? "var(--signal)" : "var(--line)"}`, borderRadius: 4, textAlign: "left", background: mode === "subdomain" ? "var(--surface-2)" : "transparent" }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Sous-domaine libre</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>sur une zone déjà gérée (hiddenlab.fr, daikicorp.fr…)</div>
                </button>
                <button onClick={() => setMode("apex")} style={{ flex: 1, padding: 12, border: `1px solid ${mode === "apex" ? "var(--signal)" : "var(--line)"}`, borderRadius: 4, textAlign: "left", background: mode === "apex" ? "var(--surface-2)" : "transparent" }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Domaine libre</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>un domaine que tu possèdes déjà avec DNS pointé vers le VPS</div>
                </button>
              </div>

              {mode === "subdomain" && (
                <Label text="Hostname">
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input value={subLabel} onChange={(e) => setSubLabel(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="mon-app" style={{ ...inputStyle, flex: 1 }}/>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--text-3)" }}>.</span>
                    <select value={subZone} onChange={(e) => setSubZone(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                      {(zonesQ.data ?? []).map((z) => <option key={z.id} value={z.domain}>{z.domain}</option>)}
                    </select>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 6 }}>Cible : <span style={{ fontFamily: "var(--mono)" }}>{subLabel || "…"}.{subZone}</span> · un record A/AAAA wildcard ou dédié doit pointer vers le VPS</div>
                </Label>
              )}

              {mode === "apex" && (
                <Label text="Domaine (A record déjà configuré)">
                  <input value={apexDomain} onChange={(e) => setApexDomain(e.target.value.toLowerCase())} placeholder="monsite.com" style={inputStyle}/>
                  <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 6 }}>On déploiera aussi sur <span style={{ fontFamily: "var(--mono)" }}>www.{apexDomain || "…"}</span></div>
                </Label>
              )}
            </div>
          )}

          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 18 }}>Récapitulatif</div>
              <Row k="Repo" v={selectedRepo?.fullName ?? ""}/>
              <Row k="Branche" v={branch}/>
              <Row k="Framework" v={framework}/>
              <Row k="Hostname" v={finalDomain}/>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 10, padding: 12, background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 4 }}>
                Le déploiement va : cloner le repo, détecter le framework, installer les deps, builder,
                créer un service systemd sur le port alloué, configurer nginx et émettre un certificat Let&apos;s Encrypt.
                Tu peux suivre les logs live sur l&apos;écran Déploiements.
              </div>
              {error && <div style={{ color: "var(--err)", fontSize: 12 }}>{error}</div>}
            </div>
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between" }}>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <div style={{ display: "flex", gap: 8 }}>
            {step > 1 && <Button variant="secondary" onClick={() => setStep((step - 1) as 1 | 2 | 3)}>Retour</Button>}
            {step === 1 && <Button variant="primary" onClick={() => selectedRepo && setStep(2)} disabled={!selectedRepo}>Suivant</Button>}
            {step === 2 && <Button variant="primary" onClick={() => setStep(3)} disabled={!canSubmit}>Suivant</Button>}
            {step === 3 && <Button variant="primary" icon="deployments" onClick={submit} disabled={!canSubmit}>{create.isPending ? "Déploiement…" : "Déployer"}</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--surface-2)", border: "1px solid var(--line)", padding: "8px 10px",
  fontSize: 13, color: "var(--text)", borderRadius: 4, outline: "none", width: "100%",
};

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 6 }}>{text}</div>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
      <span style={{ color: "var(--text-3)" }}>{k}</span>
      <span style={{ fontFamily: "var(--mono)" }}>{v}</span>
    </div>
  );
}

void StatusDot;
