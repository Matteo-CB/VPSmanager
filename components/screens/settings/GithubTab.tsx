"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Button, StatusDot } from "../../ui/primitives";
import { Icon } from "../../ui/Icon";
import { apiGet, apiPost, apiDelete } from "@/lib/client-api";

type Status = { connected: boolean; login: string | null };
type Repo = { id: number; fullName: string; name: string; private: boolean; description: string | null; defaultBranch: string; pushedAt: string; language: string | null };

export function GithubTab() {
  const qc = useQueryClient();
  const statusQ = useQuery({ queryKey: ["github", "status"], queryFn: () => apiGet<Status>("/api/github/connect") });
  const reposQ = useQuery({
    enabled: !!statusQ.data?.connected,
    queryKey: ["github", "repos"],
    queryFn: () => apiGet<{ data: Repo[] }>("/api/github/repos").then((r) => r.data),
  });

  const connect = useMutation({
    mutationFn: (token: string) => apiPost("/api/github/connect", { token }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["github"] }); },
  });
  const disconnect = useMutation({
    mutationFn: () => apiDelete("/api/github/connect"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["github"] }); },
  });

  const [token, setToken] = React.useState("");

  return (
    <>
      <Card title="GitHub" subtitle={statusQ.data?.connected ? `Connecté en tant que ${statusQ.data.login}` : "Pas connecté"} pad={false}>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {statusQ.data?.connected ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <StatusDot status="READY" label={statusQ.data.login ?? "linked"}/>
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>{reposQ.data?.length ?? "…"} repos accessibles</span>
              </div>
              <Button size="sm" variant="destructive" onClick={() => disconnect.mutate()}>Déconnecter</Button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>
                Colle un <b>Personal Access Token</b> GitHub avec le scope <code style={{ fontFamily: "var(--mono)" }}>repo</code>.
                <br/>
                <a href="https://github.com/settings/tokens/new?scopes=repo&description=vps-manager" target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>Créer un token →</a>
              </div>
              <input
                type="password"
                placeholder="ghp_... ou github_pat_..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 4, padding: "10px 12px", fontSize: 13, fontFamily: "var(--mono)", color: "var(--text)", outline: "none" }}
              />
              {connect.isError && <div style={{ color: "var(--err)", fontSize: 12 }}>{(connect.error as Error).message}</div>}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button size="sm" variant="primary" onClick={() => { connect.mutate(token); setToken(""); }} disabled={!token || connect.isPending}>
                  {connect.isPending ? "Validation…" : "Connecter"}
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      {statusQ.data?.connected && (
        <Card title="Repos accessibles" subtitle={reposQ.data ? `${reposQ.data.length} repos (privés + publics)` : "chargement"} pad={false}>
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {(reposQ.data ?? []).slice(0, 30).map((r) => (
              <div key={r.id} style={{ padding: "12px 20px", borderBottom: "1px solid var(--line)", display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 12, alignItems: "center" }}>
                <Icon name={r.private ? "lock" : "globe"} size={14} style={{ color: r.private ? "var(--warn)" : "var(--text-3)" }}/>
                <div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 13 }}>{r.fullName}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>{r.description ?? "—"}</div>
                </div>
                <span style={{ fontSize: 11, color: "var(--text-4)", fontFamily: "var(--mono)" }}>{r.defaultBranch}</span>
                <span style={{ fontSize: 11, color: "var(--text-4)" }}>{r.language ?? ""}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
