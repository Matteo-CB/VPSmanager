import "server-only";
import { prisma } from "./prisma";
import { decrypt } from "./crypto";

export type GithubUser = { login: string; id: number; name: string | null; email: string | null; avatar_url: string };
export type GithubRepo = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  default_branch: string;
  ssh_url: string;
  clone_url: string;
  pushed_at: string;
  language: string | null;
  fork: boolean;
};

const BASE = "https://api.github.com";

async function ghFetch<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export async function getUser(token: string): Promise<GithubUser> {
  return ghFetch<GithubUser>(token, "/user");
}

export async function listRepos(token: string): Promise<GithubRepo[]> {

  const all: GithubRepo[] = [];
  for (let page = 1; page <= 3; page++) {
    const chunk = await ghFetch<GithubRepo[]>(token, `/user/repos?per_page=100&sort=pushed&page=${page}&affiliation=owner,collaborator`);
    all.push(...chunk);
    if (chunk.length < 100) break;
  }
  return all;
}

export async function latestCommit(token: string, fullName: string, branch: string): Promise<{ sha: string; message: string; author: string; url: string; date: string } | null> {
  try {
    const commits = await ghFetch<Array<{ sha: string; commit: { message: string; author: { name: string; date: string } }; html_url: string }>>(
      token,
      `/repos/${fullName}/commits?sha=${encodeURIComponent(branch)}&per_page=1`
    );
    const c = commits[0];
    if (!c) return null;
    return { sha: c.sha, message: c.commit.message.split("\n")[0], author: c.commit.author.name, url: c.html_url, date: c.commit.author.date };
  } catch { return null; }
}

export async function addDeployKey(token: string, fullName: string, title: string, key: string, readOnly = true): Promise<{ id: number }> {
  return ghFetch<{ id: number }>(token, `/repos/${fullName}/keys`, {
    method: "POST",
    body: JSON.stringify({ title, key, read_only: readOnly }),
  });
}

export async function getGithubTokenFor(userId: string): Promise<string | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { githubTokenEnc: true } });
  if (!u?.githubTokenEnc) return null;
  try { return decrypt(u.githubTokenEnc, `github:${userId}`); } catch { return null; }
}
