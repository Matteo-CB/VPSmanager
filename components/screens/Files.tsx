"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, Card, Button, EmptyState } from "../ui/primitives";
import { Icon } from "../ui/Icon";
import { apiGet } from "@/lib/client-api";

type FileEntry = { name: string; kind: "dir" | "file"; size: string; mod: string; sensitive?: boolean };
type ListResp = { path: string; data: FileEntry[] };
type FileResp = { path: string; size: number; content: string };

export function FilesScreen() {
  const [path, setPath] = React.useState("/opt/sites");
  const [selected, setSelected] = React.useState<string | null>(null);

  const list = useQuery({
    queryKey: ["files", path],
    queryFn: () => apiGet<ListResp>(`/api/files?path=${encodeURIComponent(path)}`),
    retry: false,
  });

  const file = useQuery({
    enabled: !!selected,
    queryKey: ["file", selected],
    queryFn: () => apiGet<FileResp>(`/api/files/content?path=${encodeURIComponent(selected!)}`),
    retry: false,
  });

  const enter = (entry: FileEntry) => {
    if (entry.kind === "dir") {
      setPath(path.endsWith("/") ? path + entry.name : path + "/" + entry.name);
      setSelected(null);
    } else {
      setSelected(path.endsWith("/") ? path + entry.name : path + "/" + entry.name);
    }
  };
  const goUp = () => {
    const idx = path.lastIndexOf("/");
    if (idx > 0) setPath(path.slice(0, idx));
    setSelected(null);
  };

  return (
    <div>
      <PageHeader
        eyebrow={<span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{path}</span>}
        title="Fichiers"
        sub="Navigation lecture seule · racines /opt/sites /var/www /var/log /etc/nginx /srv"
        actions={<>
          <Button size="sm" variant="ghost" icon="refresh" onClick={() => list.refetch()}>Rafraîchir</Button>
        </>}
      />
      <div style={{ padding: "24px 28px 28px", display: "grid", gridTemplateColumns: "360px 1fr", gap: 14, height: "calc(100% - 160px)" }}>
        <Card pad={false}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={goUp} style={{ color: "var(--text-3)" }} title="Remonter"><Icon name="chevron-right" size={13} style={{ transform: "rotate(180deg)" }}/></button>
            <Icon name="folder" size={14} style={{ color: "var(--text-3)" }}/>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis" }}>{path}</span>
          </div>
          <div style={{ padding: "6px 0", maxHeight: 560, overflowY: "auto" }}>
            {list.isError && <div style={{ padding: 20, color: "var(--err)", fontSize: 12 }}>Accès refusé ou dossier introuvable.</div>}
            {list.isLoading && <div style={{ padding: 20, color: "var(--text-3)", fontSize: 12 }}>Chargement…</div>}
            {list.data?.data.map((f, i) => (
              <div
                key={i}
                onClick={() => enter(f)}
                style={{
                  padding: "7px 14px", display: "grid", gridTemplateColumns: "18px 1fr auto", gap: 10, alignItems: "center", cursor: "pointer",
                  background: selected && selected.endsWith("/" + f.name) && f.kind === "file" ? "var(--surface-2)" : "transparent",
                  borderLeft: selected && selected.endsWith("/" + f.name) && f.kind === "file" ? "2px solid var(--signal)" : "2px solid transparent",
                }}
              >
                <Icon name={f.kind === "dir" ? "folder" : f.sensitive ? "lock" : "file"} size={13}
                      style={{ color: f.sensitive ? "var(--warn)" : "var(--text-3)" }}/>
                <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--text-4)" }}>{f.size}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card pad={false} style={{ display: "flex", flexDirection: "column" }}>
          {!selected ? (
            <EmptyState title="Sélectionne un fichier" hint="Clique un fichier à gauche pour l'ouvrir ici (lecture seule, secrets masqués)."/>
          ) : (
            <>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Icon name="file" size={14} style={{ color: "var(--text-3)" }}/>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{selected}</span>
                  <span style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase", border: "1px solid var(--line)", padding: "1px 5px", borderRadius: 3 }}>Read only</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {file.data && <span style={{ fontSize: 11, color: "var(--text-3)" }}>{(file.data.size / 1024).toFixed(1)} KB</span>}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "44px 1fr", background: "var(--bg)", flex: 1, overflow: "auto", fontFamily: "var(--mono)", fontSize: 12.5, lineHeight: 1.65 }}>
                <div style={{ textAlign: "right", color: "var(--text-4)", padding: "14px 8px 14px 0", userSelect: "none", background: "var(--surface)", borderRight: "1px solid var(--line)" }}>
                  {(file.data?.content ?? "").split("\n").map((_, i) => <div key={i}>{i + 1}</div>)}
                </div>
                <pre style={{ margin: 0, padding: "14px 18px", color: "var(--text-2)", whiteSpace: "pre-wrap" }}>
                  {file.isLoading ? "Chargement…" : file.isError ? "Erreur de lecture" : (file.data?.content ?? "")}
                </pre>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
