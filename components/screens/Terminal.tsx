"use client";
import React from "react";
import { PageHeader, Button, EmptyState } from "../ui/primitives";
import { useMe, useSystemOverview, useTerminalExec } from "@/lib/hooks";
import { apiPost, apiDelete } from "@/lib/client-api";

export function TerminalScreen() {
  const me = useMe();
  const isAdmin = me.data?.user?.role === "ADMIN";

  if (me.isLoading) return <div style={{ padding: 40, color: "var(--text-3)", fontSize: 13 }}>Chargement…</div>;
  if (isAdmin) return <AdminPtyTerminal/>;
  return <ReadOnlyTerminal/>;
}

function AdminPtyTerminal() {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const termRef = React.useRef<unknown>(null);
  const sessionIdRef = React.useRef<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let disposed = false;
    let eventSource: EventSource | null = null;
    let resizeObserver: ResizeObserver | null = null;

    (async () => {
      try {
        const [{ Terminal }, { FitAddon }, { WebLinksAddon }] = await Promise.all([
          import("@xterm/xterm"),
          import("@xterm/addon-fit"),
          import("@xterm/addon-web-links"),
        ]);
        await import("@xterm/xterm/css/xterm.css");

        if (disposed) return;

        const term = new Terminal({
          cursorBlink: true,
          fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 13,
          lineHeight: 1.2,
          theme: {
            background: "#0B0B0D",
            foreground: "#ECECEF",
            cursor: "#E66A3A",
            cursorAccent: "#0B0B0D",
            selectionBackground: "rgba(139,180,255,0.3)",
            black: "#0B0B0D",
            red: "#E16E6E",
            green: "#6EC28E",
            yellow: "#E0B36A",
            blue: "#8BB4FF",
            magenta: "#B58BFF",
            cyan: "#8BC4D4",
            white: "#ECECEF",
            brightBlack: "#6A6A72",
            brightRed: "#FF8E8E",
            brightGreen: "#8EE2AE",
            brightYellow: "#FFD38A",
            brightBlue: "#ABC4FF",
            brightMagenta: "#D5ABFF",
            brightCyan: "#AEDDEA",
            brightWhite: "#FFFFFF",
          },
          scrollback: 10000,
          allowProposedApi: true,
        });

        const fit = new FitAddon();
        term.loadAddon(fit);
        term.loadAddon(new WebLinksAddon((_e, uri) => window.open(uri, "_blank", "noopener,noreferrer")));

        if (!containerRef.current) return;
        term.open(containerRef.current);
        termRef.current = term;
        fit.fit();

        const { id } = await apiPost<{ id: string }>("/api/terminal/pty", { cols: term.cols, rows: term.rows });
        if (disposed) return;
        sessionIdRef.current = id;
        setReady(true);

        eventSource = new EventSource(`/api/terminal/pty/${id}/stream`);
        eventSource.addEventListener("data", (e: MessageEvent) => {

          const raw = (e.data as string);
          term.write(raw);
        });
        eventSource.addEventListener("error", () => {

        });

        term.onData((d: string) => {
          const sid = sessionIdRef.current;
          if (!sid) return;
          apiPost(`/api/terminal/pty/${sid}/input`, { data: d }).catch(() => {});
        });

        const applyResize = () => {
          try {
            fit.fit();
            const sid = sessionIdRef.current;
            if (!sid) return;
            apiPost(`/api/terminal/pty/${sid}/resize`, { cols: term.cols, rows: term.rows }).catch(() => {});
          } catch {}
        };
        resizeObserver = new ResizeObserver(applyResize);
        resizeObserver.observe(containerRef.current);
        window.addEventListener("resize", applyResize);

        term.focus();
      } catch (e) {
        setError((e as Error).message);
      }
    })();

    return () => {
      disposed = true;
      eventSource?.close();
      resizeObserver?.disconnect();
      if (sessionIdRef.current) apiDelete(`/api/terminal/pty/${sessionIdRef.current}`).catch(() => {});
      try { (termRef.current as { dispose?: () => void } | null)?.dispose?.(); } catch {}
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        eyebrow="PTY interactif · bash root · audit journalisé"
        title="Terminal"
        actions={<>
          <Button size="sm" variant="ghost" icon="refresh" onClick={() => location.reload()}>Nouvelle session</Button>
        </>}
      />
      <div style={{ padding: "24px 28px 28px", flex: 1, minHeight: 0 }}>
        <div style={{
          background: "#0B0B0D", border: "1px solid var(--line)", borderRadius: 6,
          height: "100%", display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--line)", background: "var(--surface)", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: ready ? "var(--ok)" : "var(--warn)" }}/>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)" }}>
              {ready ? "session active · xterm-256color · tout est auditée" : error ? `erreur : ${error}` : "connexion…"}
            </span>
          </div>
          <div ref={containerRef} style={{ flex: 1, padding: 8 }}/>
        </div>
      </div>
    </div>
  );
}

type HistoryItem =
  | { kind: "banner"; text: string[] }
  | { kind: "cmd"; who: string; cwd: string; input: string }
  | { kind: "out"; text: string; err?: boolean };

function ReadOnlyTerminal() {
  const me = useMe();
  const sys = useSystemOverview();
  const exec = useTerminalExec();

  const hostname = sys.data?.hostname ?? "vps";
  const userName = me.data?.user?.email?.split("@")[0] ?? "user";
  const prompt = `${userName}@${hostname}`;

  const [history, setHistory] = React.useState<HistoryItem[]>([]);
  const [input, setInput] = React.useState("");
  const [cwd] = React.useState("~");
  const endRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (history.length === 0 && sys.data && me.data) {
      setHistory([{
        kind: "banner",
        text: [
          `${sys.data.kernel}`,
          "Shell en lecture seule · tape 'help' pour les commandes disponibles",
          `Connecté en tant que ${me.data.user.email} · rôle ${me.data.user.role}`,
        ],
      }]);
    }
  }, [sys.data, me.data, history.length]);

  React.useEffect(() => { endRef.current?.scrollIntoView?.({ block: "end" }); }, [history]);
  React.useEffect(() => { inputRef.current?.focus(); }, []);

  const run = async (cmd: string) => {
    const c = cmd.trim();
    if (!c) return;
    setHistory((h) => [...h, { kind: "cmd", who: prompt, cwd, input: cmd }]);
    setInput("");
    if (c === "clear") { setHistory([]); return; }
    if (c === "help") {
      setHistory((h) => [...h, { kind: "out", text: "Commandes disponibles : uptime, whoami, pwd, date, hostname, free -h, df -h, ls, ps, ip a, ss, systemctl status/is-active, docker ps/images, journalctl -u, clear" }]);
      return;
    }
    try {
      const res = await exec.mutateAsync(c);
      const text = (res.stdout || "") + (res.stderr ? `\n${res.stderr}` : "");
      setHistory((h) => [...h, { kind: "out", text: text || "(aucune sortie)", err: !!res.error }]);
    } catch (e) {
      const err = e as { message?: string; details?: { message?: string } };
      setHistory((h) => [...h, { kind: "out", text: err.details?.message ?? err.message ?? String(e), err: true }]);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader eyebrow="Shell read-only · audit journalisé" title="Terminal"/>
      <div style={{ padding: "24px 28px 28px", flex: 1, minHeight: 0 }}>
        <div
          onClick={() => inputRef.current?.focus()}
          style={{
            background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 6, height: "100%",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}
        >
          <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--line)", background: "var(--surface)", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--ok)" }}/>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)" }}>{hostname}</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", fontFamily: "var(--mono)", fontSize: 12.5, lineHeight: 1.7, color: "var(--text-2)" }}>
            {history.map((h, i) => {
              if (h.kind === "banner") return (<div key={i} style={{ color: "var(--text-3)", marginBottom: 14 }}>{h.text.map((l, j) => <div key={j}>{l}</div>)}</div>);
              if (h.kind === "cmd") return (
                <div key={i} style={{ display: "flex", gap: 10 }}>
                  <span style={{ color: "var(--ok)" }}>{h.who}</span>
                  <span style={{ color: "var(--text-3)" }}>:</span>
                  <span style={{ color: "var(--accent)" }}>{h.cwd}</span>
                  <span style={{ color: "var(--text-3)" }}>$</span>
                  <span style={{ color: "var(--text)" }}>{h.input}</span>
                </div>
              );
              return <div key={i} style={{ whiteSpace: "pre-wrap", color: h.err ? "var(--err)" : "var(--text-2)", marginBottom: 4 }}>{h.text}</div>;
            })}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ color: "var(--ok)" }}>{prompt}</span>
              <span style={{ color: "var(--text-3)" }}>:</span>
              <span style={{ color: "var(--accent)" }}>{cwd}</span>
              <span style={{ color: "var(--text-3)" }}>$</span>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") run(input); }}
                disabled={exec.isPending}
                style={{ flex: 1, background: "transparent", border: 0, outline: "none", color: "var(--text)", fontFamily: "var(--mono)", fontSize: 12.5 }}
                spellCheck={false}
              />
              <span style={{ width: 8, height: 14, background: "var(--signal)", display: "inline-block", animation: "pulse-dot 1.2s ease-in-out infinite" }}/>
            </div>
            <div ref={endRef}/>
          </div>
        </div>
      </div>
    </div>
  );
}

void EmptyState;
