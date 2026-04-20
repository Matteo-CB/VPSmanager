"use client";
import React from "react";
import { PageHeader, Card, Button, Table, StatusDot, Toggle, EmptyState } from "../ui/primitives";
import { Icon } from "../ui/Icon";
import { SettingField, Field } from "./SiteDetail";
import { GithubTab } from "./settings/GithubTab";
import {
  useFirewall, useFail2ban, useBackupPolicy, useSettingsUsers, useApiTokens, useMachineInfo, useMe,
  SettingsUser, FirewallRule,
} from "@/lib/hooks";

type KeyRow = { id: string; name: string; keyPreview: string; lastUsedAt: string | null };

export function SettingsScreen() {
  const [tab, setTab] = React.useState("machine");
  const usersQ = useSettingsUsers();
  const me = useMe();
  const tabs = [
    { id: "machine", label: "Machine" },
    { id: "users", label: "Utilisateurs", count: usersQ.data?.length ?? 0 },
    { id: "firewall", label: "Firewall" },
    { id: "backups", label: "Backups" },
    { id: "keys", label: "Clés & tokens" },
    { id: "github", label: "GitHub" },
  ];

  return (
    <div>
      <PageHeader title="Paramètres" sub={me.data ? `Connecté en tant que ${me.data.user.email} · ${me.data.user.role}` : ""} tabs={tabs} activeTab={tab} onTab={setTab}/>
      <div style={{ padding: "24px 28px 96px", display: "flex", flexDirection: "column", gap: 14, maxWidth: 960 }}>
        {tab === "machine" && <MachineTab/>}
        {tab === "users" && <UsersTab users={usersQ.data ?? []}/>}
        {tab === "firewall" && <FirewallTab/>}
        {tab === "backups" && <BackupsTab/>}
        {tab === "keys" && <KeysTab/>}
        {tab === "github" && <GithubTab/>}
      </div>
    </div>
  );
}

function MachineTab() {
  const info = useMachineInfo();
  return <>
    <Card title="Informations machine" pad={false}>
      <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
        <SettingField label="Hostname" value={info.data?.hostname ?? "…"} mono/>
        <SettingField label="Kernel" value={info.data?.kernel ?? "…"} mono/>
        <SettingField label="OS" value={info.data?.os ?? "…"} mono/>
        <SettingField label="Timezone" value={info.data?.timezone ?? "…"} mono/>
        <SettingField label="CPU" value={info.data?.cpu ?? "…"}/>
        <SettingField label="RAM" value={info.data ? `${info.data.ramGb} GB` : "…"}/>
        <SettingField label="Public IP" value={info.data?.publicIp ?? "…"} mono/>
        <SettingField label="Node" value={info.data?.nodeVersion ?? "…"} mono/>
      </div>
    </Card>
  </>;
}

function UsersTab({ users }: { users: SettingsUser[] }) {
  return (
    <Card title="Comptes" subtitle={`${users.length} compte${users.length > 1 ? "s" : ""}`} pad={false} actions={<Button size="sm" variant="secondary" icon="plus">Inviter</Button>}>
      <Table<SettingsUser> columns={[
        { label: "Nom", render: r => (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 99, background: "var(--surface-2)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontFamily: "var(--mono)" }}>{r.initials}</div>
            <div>
              <div style={{ fontWeight: 500 }}>{r.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--mono)" }}>{r.email}</div>
            </div>
          </div>
        )},
        { label: "Rôle", width: 120, render: r => <span style={{ fontSize: 12, color: "var(--text-2)" }}>{r.role}</span> },
        { label: "2FA", width: 100, render: r => r.twofa ? <StatusDot status="READY" label="Activé"/> : <StatusDot status="warning" label="Désactivé"/> },
        { label: "Dernière connexion", width: 180, render: r => <span style={{ fontSize: 12, color: "var(--text-3)" }}>{r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleString("fr-FR") : "jamais"}</span> },
      ]} rows={users}/>
    </Card>
  );
}

function FirewallTab() {
  const fwQ = useFirewall();
  const f2bQ = useFail2ban();
  return <>
    <Card title="Règles entrantes" subtitle={`ufw · ${fwQ.data?.length ?? 0} règles`} pad={false} actions={<Button size="sm" variant="secondary" icon="plus">Ajouter une règle</Button>}>
      <Table<FirewallRule> columns={[
        { label: "Action", width: 90, render: r => <span style={{ fontSize: 11, letterSpacing: "0.06em", color: r.action === "ALLOW" ? "var(--ok)" : "var(--err)", textTransform: "uppercase" }}>{r.action}</span> },
        { label: "Port", width: 100, render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{r.port}</span> },
        { label: "Protocole", width: 100, render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-2)" }}>{r.proto}</span> },
        { label: "Source", render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-2)" }}>{r.src}</span> },
        { label: "Commentaire", render: r => <span style={{ fontSize: 12, color: "var(--text-3)" }}>{r.c}</span> },
      ]} rows={fwQ.data ?? []}/>
    </Card>
    <Card title="fail2ban" pad={false}>
      <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        <Field label="Installé">{f2bQ.data?.installed ? "Oui" : "Non"}</Field>
        <Field label="Jails actives">{String(f2bQ.data?.jails ?? 0)}</Field>
        <Field label="IPs bannies">{String(f2bQ.data?.banned ?? 0)}</Field>
      </div>
    </Card>
  </>;
}

function BackupsTab() {
  const p = useBackupPolicy();
  if (!p.data || (!p.data.schedule && !p.data.destination)) {
    return <Card pad><EmptyState title="Aucune politique configurée" hint="Crée une politique de sauvegarde pour tes bases et fichiers."/></Card>;
  }
  return (
    <Card title="Politique de sauvegarde" pad={false}>
      <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
        <SettingField label="Fréquence" value={p.data.schedule ?? "·"}/>
        <SettingField label="Rétention" value={p.data.retention ?? "·"}/>
        <SettingField label="Destination" value={p.data.destination ?? "·"} mono/>
        <SettingField label="Chiffrement" value={p.data.encryption ?? "·"}/>
      </div>
    </Card>
  );
}

function KeysTab() {
  const tokens = useApiTokens();
  return (
    <Card title="Clés API & tokens" subtitle="Utilisés par la CLI et les webhooks" pad={false} actions={<Button size="sm" variant="secondary" icon="plus">Générer</Button>}>
      {(tokens.data ?? []).length === 0
        ? <div style={{ padding: 20, color: "var(--text-4)", fontSize: 12 }}>Aucune clé.</div>
        : <Table<KeyRow> columns={[
            { label: "Nom", render: r => <span style={{ fontSize: 13 }}>{r.name}</span> },
            { label: "Clé", render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-2)" }}>{r.keyPreview}</span> },
            { label: "Dernière utilisation", width: 180, render: r => <span style={{ fontSize: 12, color: "var(--text-3)" }}>{r.lastUsedAt ? new Date(r.lastUsedAt).toLocaleString("fr-FR") : "jamais"}</span> },
          ]} rows={tokens.data ?? []}/>
      }
    </Card>
  );
}

