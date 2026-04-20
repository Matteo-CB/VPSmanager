import "server-only";
import { randomUUID } from "node:crypto";

type Pty = {
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  kill: () => void;
  onData: (cb: (data: string) => void) => void;
  onExit: (cb: () => void) => void;
};

type Session = {
  id: string;
  pty: Pty;
  buffer: string[];
  subscribers: Set<(data: string) => void>;
  createdAt: number;
  userId: string;
};

const sessions = new Map<string, Session>();

async function loadPty() {
  try {

    const mod = await import("node-pty").catch(() => null);
    if (!mod) return null;
    return mod;
  } catch {
    return null;
  }
}

export async function createSession(userId: string, opts: { cols?: number; rows?: number; cwd?: string; shell?: string } = {}): Promise<string | null> {
  const pty = await loadPty();
  if (!pty) return null;

  const id = randomUUID();
  const cols = opts.cols ?? 120;
  const rows = opts.rows ?? 30;
  const shell = opts.shell ?? process.env.SHELL ?? "/bin/bash";

  const term = pty.spawn(shell, [], {
    name: "xterm-256color",
    cols,
    rows,
    cwd: opts.cwd ?? process.env.HOME ?? "/root",
    env: { ...process.env, TERM: "xterm-256color", COLORTERM: "truecolor" } as NodeJS.ProcessEnv,
  });

  const session: Session = {
    id,
    pty: {
      write: (d) => term.write(d),
      resize: (c, r) => { try { term.resize(c, r); } catch {} },
      kill: () => { try { term.kill(); } catch {} },
      onData: (cb) => term.onData(cb),
      onExit: (cb) => term.onExit(() => cb()),
    },
    buffer: [],
    subscribers: new Set(),
    createdAt: Date.now(),
    userId,
  };

  session.pty.onData((data) => {
    if (session.subscribers.size > 0) {
      for (const cb of session.subscribers) cb(data);
    } else {
      session.buffer.push(data);

      let total = session.buffer.reduce((n, s) => n + s.length, 0);
      while (total > 256 * 1024 && session.buffer.length > 1) {
        total -= session.buffer.shift()!.length;
      }
    }
  });

  session.pty.onExit(() => {
    for (const cb of session.subscribers) cb("\r\n\u001b[31m[session ended]\u001b[0m\r\n");
    sessions.delete(id);
  });

  sessions.set(id, session);

  setTimeout(() => {
    const s = sessions.get(id);
    if (s && Date.now() - s.createdAt > 2 * 3600 * 1000) {
      s.pty.kill();
      sessions.delete(id);
    }
  }, 2 * 3600 * 1000).unref();

  return id;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function writeTo(id: string, data: string): boolean {
  const s = sessions.get(id);
  if (!s) return false;
  s.pty.write(data);
  return true;
}

export function resize(id: string, cols: number, rows: number): boolean {
  const s = sessions.get(id);
  if (!s) return false;
  s.pty.resize(cols, rows);
  return true;
}

export function killSession(id: string): boolean {
  const s = sessions.get(id);
  if (!s) return false;
  s.pty.kill();
  sessions.delete(id);
  return true;
}

export function subscribe(id: string, cb: (data: string) => void): (() => void) | null {
  const s = sessions.get(id);
  if (!s) return null;

  const buffered = s.buffer.join("");
  s.buffer = [];
  if (buffered) cb(buffered);
  s.subscribers.add(cb);
  return () => { s.subscribers.delete(cb); };
}

export function hasPtySupport(): Promise<boolean> {
  return loadPty().then((m) => !!m);
}
