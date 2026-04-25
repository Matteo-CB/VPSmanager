"use client";
import React from "react";
import { useSession } from "next-auth/react";
import { Sidebar } from "./shell/Sidebar";
import { TopBar, LogoBadge } from "./shell/TopBar";
import { CommandPalette } from "./shell/CommandPalette";
import { TweaksPanel, TweaksState } from "./shell/TweaksPanel";

import { LoginScreen } from "./screens/Login";
import { DashboardScreen } from "./screens/Dashboard";
import { SitesScreen } from "./screens/Sites";
import { SiteDetailScreen } from "./screens/SiteDetail";
import { DeploymentScreen, DeploymentsScreen } from "./screens/Deployment";
import { LogsScreen } from "./screens/Logs";
import { TerminalScreen } from "./screens/Terminal";
import { FilesScreen } from "./screens/Files";
import { DatabasesScreen } from "./screens/Databases";
import { DnsScreen } from "./screens/DNS";
import { ServicesScreen } from "./screens/Services";
import { SettingsScreen } from "./screens/Settings";
import { StripeScreen } from "./screens/Stripe";
import { AnalyticsScreen } from "./screens/Analytics";

import type { Route, ScreenId } from "@/lib/route";

export function App() {
  const { data: session, status, update } = useSession();
  const loggedIn = status === "authenticated";
  const [route, setRoute] = React.useState<Route>({ screen: "dashboard" });
  const [cmdOpen, setCmdOpen] = React.useState(false);
  const [tweakOpen, setTweakOpen] = React.useState(false);
  const [tweaks, setTweaks] = React.useState<TweaksState>({
    theme: "dark", density: "standard", accent: "#E66A3A",
  });

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("vpsm_route");
      if (saved) setRoute(JSON.parse(saved));
    } catch {}
  }, []);

  const go = (screen: ScreenId, arg?: string) => {
    const r: Route = { screen, arg };
    setRoute(r);
    try { localStorage.setItem("vpsm_route", JSON.stringify(r)); } catch {}
  };

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(v => !v);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();
        setTweakOpen(v => !v);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  if (status === "loading") return null;
  if (!loggedIn) return <LoginScreen onLogin={() => update()}/>;
  const role = (session?.user as { role?: string } | undefined)?.role ?? "USER";

  const adminOnly: ReadonlySet<string> = new Set(["files"]);
  if (adminOnly.has(route.screen) && role !== "ADMIN") {
    return (
      <div id="__next-root">
        <LogoBadge/>
        <TopBar onCmdK={() => setCmdOpen(true)}/>
        <Sidebar route={route} go={go}/>
        <main style={{ gridArea: "main", overflow: "auto", minWidth: 0, background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 32, marginBottom: 12 }}>Accès réservé</div>
            <div style={{ color: "var(--text-3)", fontSize: 13 }}>Cette section est réservée aux administrateurs.</div>
          </div>
        </main>
      </div>
    );
  }

  let content: React.ReactNode;
  switch (route.screen) {
    case "dashboard":   content = <DashboardScreen go={go}/>; break;
    case "sites":       content = <SitesScreen go={go}/>; break;
    case "site":        content = <SiteDetailScreen slug={route.arg} go={go}/>; break;
    case "deployments": content = <DeploymentsScreen go={go}/>; break;
    case "deployment":  content = <DeploymentScreen id={route.arg} go={go}/>; break;
    case "logs":        content = <LogsScreen/>; break;
    case "terminal":    content = <TerminalScreen/>; break;
    case "databases":   content = <DatabasesScreen/>; break;
    case "files":       content = <FilesScreen/>; break;
    case "services":    content = <ServicesScreen/>; break;
    case "dns":         content = <DnsScreen/>; break;
    case "settings":    content = <SettingsScreen/>; break;
    case "stripe":      content = <StripeScreen/>; break;
    case "analytics":   content = <AnalyticsScreen go={go}/>; break;
    default:            content = <DashboardScreen go={go}/>;
  }

  return (
    <div id="__next-root">
      <LogoBadge/>
      <TopBar onCmdK={() => setCmdOpen(true)}/>
      <Sidebar route={route} go={go}/>
      <main
        data-screen-label={route.screen}
        style={{ gridArea: "main", overflow: "auto", minWidth: 0, background: "var(--bg)" }}
      >
        {content}
      </main>
      <CommandPalette open={cmdOpen} close={() => setCmdOpen(false)} go={go}/>
      {tweakOpen && <TweaksPanel state={tweaks} setState={setTweaks} close={() => setTweakOpen(false)}/>}
    </div>
  );
}
