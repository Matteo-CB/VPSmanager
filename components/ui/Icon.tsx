"use client";
import type { CSSProperties, SVGProps } from "react";

export type IconName =
  | "dashboard" | "sites" | "deployments" | "logs" | "terminal" | "files" | "db" | "dns" | "services"
  | "agent" | "settings" | "analytics" | "alerts" | "firewall" | "backup" | "cron" | "queues"
  | "search" | "plus" | "arrow-right" | "chevron-right" | "chevron-down" | "external" | "copy"
  | "eye" | "eye-off" | "check" | "x" | "refresh" | "play" | "pause" | "stop"
  | "git" | "branch" | "commit" | "rollback" | "globe" | "shield" | "key" | "link" | "dot" | "drag"
  | "filter" | "more" | "upload" | "download" | "star" | "send" | "bell" | "sun" | "moon"
  | "command" | "slash" | "logout" | "edit" | "trash" | "folder" | "file" | "lock" | "mail"
  | "framework-next" | "framework-astro" | "framework-remix" | "framework-svelte" | "framework-nuxt"
  | "framework-vite" | "framework-docker" | "framework-python";

type Props = {
  name: IconName | string;
  size?: number;
  className?: string;
  style?: CSSProperties;
};

export function Icon({ name, size = 16, className = "", style }: Props) {
  const p: SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    style,
  };
  switch (name) {
    case "dashboard":
      return (<svg {...p}><rect x="3.5" y="3.5" width="7" height="7"/><rect x="13.5" y="3.5" width="7" height="7"/><rect x="3.5" y="13.5" width="7" height="7"/><rect x="13.5" y="13.5" width="7" height="7"/></svg>);
    case "sites":
      return (<svg {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="1"/><path d="M3.5 9h17"/><circle cx="6" cy="6.75" r=".5" fill="currentColor" stroke="none"/><circle cx="8" cy="6.75" r=".5" fill="currentColor" stroke="none"/><circle cx="10" cy="6.75" r=".5" fill="currentColor" stroke="none"/></svg>);
    case "deployments":
      return (<svg {...p}><path d="M12 3.5v10.5"/><path d="M8 10l4 4 4-4"/><path d="M4.5 17.5h15"/><path d="M4.5 20.5h15"/></svg>);
    case "logs":
      return (<svg {...p}><path d="M5 4.5h14v15H5z"/><path d="M8 8.5h8"/><path d="M8 12h8"/><path d="M8 15.5h5"/></svg>);
    case "terminal":
      return (<svg {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="1"/><path d="M7 10l3 2-3 2"/><path d="M12 14.5h5"/></svg>);
    case "files":
      return (<svg {...p}><path d="M3.5 7a1 1 0 0 1 1-1h4l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-14a1 1 0 0 1-1-1V7z"/></svg>);
    case "db":
      return (<svg {...p}><ellipse cx="12" cy="5.5" rx="7.5" ry="2.5"/><path d="M4.5 5.5v13c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5v-13"/><path d="M4.5 12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5"/></svg>);
    case "dns":
      return (<svg {...p}><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><ellipse cx="12" cy="12" rx="4" ry="8.5"/></svg>);
    case "services":
      return (<svg {...p}><circle cx="12" cy="12" r="2.5"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.64 5.64l2.12 2.12M16.24 16.24l2.12 2.12M5.64 18.36l2.12-2.12M16.24 7.76l2.12-2.12"/></svg>);
    case "settings":
      return (<svg {...p}><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M21 12h-2M5 12H3M18.4 5.6l-1.4 1.4M7 17l-1.4 1.4M18.4 18.4L17 17M7 7L5.6 5.6"/></svg>);
    case "analytics":
      return (<svg {...p}><path d="M4 19.5h16"/><path d="M6 16v-4M10 16V8M14 16v-6M18 16V5"/></svg>);
    case "alerts":
      return (<svg {...p}><path d="M6 17c0-5 1-9 6-9s6 4 6 9"/><path d="M4 17.5h16"/><path d="M10 20.5h4"/></svg>);
    case "firewall":
      return (<svg {...p}><path d="M12 3.5l7.5 3v6c0 4.5-3.3 7.7-7.5 8.5-4.2-.8-7.5-4-7.5-8.5v-6z"/></svg>);
    case "backup":
      return (<svg {...p}><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v4h-4"/></svg>);
    case "cron":
      return (<svg {...p}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>);
    case "queues":
      return (<svg {...p}><rect x="3.5" y="5" width="17" height="4" rx=".5"/><rect x="3.5" y="10.5" width="17" height="4" rx=".5"/><rect x="3.5" y="16" width="17" height="3" rx=".5"/></svg>);

    case "search":
      return (<svg {...p}><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l4.5 4.5"/></svg>);
    case "plus":
      return (<svg {...p}><path d="M12 5v14M5 12h14"/></svg>);
    case "arrow-right":
      return (<svg {...p}><path d="M5 12h14M13 6l6 6-6 6"/></svg>);
    case "chevron-right":
      return (<svg {...p}><path d="M9 6l6 6-6 6"/></svg>);
    case "chevron-down":
      return (<svg {...p}><path d="M6 9l6 6 6-6"/></svg>);
    case "external":
      return (<svg {...p}><path d="M14 5h5v5"/><path d="M19 5l-9 9"/><path d="M19 14v5h-14V5h5"/></svg>);
    case "copy":
      return (<svg {...p}><rect x="8.5" y="8.5" width="11" height="11" rx="1"/><path d="M6 15.5H5a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 .5.5v1"/></svg>);
    case "eye":
      return (<svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/></svg>);
    case "eye-off":
      return (<svg {...p}><path d="M4 4l16 16"/><path d="M10 5.2A11.7 11.7 0 0 1 12 5c6.5 0 10 7 10 7a17.1 17.1 0 0 1-3.2 4"/><path d="M6.4 6.8A17.6 17.6 0 0 0 2 12s3.5 7 10 7a11 11 0 0 0 5.3-1.4"/><path d="M9.9 9.9a2.5 2.5 0 0 0 3.5 3.5"/></svg>);
    case "check":
      return (<svg {...p}><path d="M5 12l4.5 4.5L19 7"/></svg>);
    case "x":
      return (<svg {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>);
    case "refresh":
      return (<svg {...p}><path d="M4 12a8 8 0 0 1 13.5-5.8L20 8"/><path d="M20 4v4h-4"/><path d="M20 12a8 8 0 0 1-13.5 5.8L4 16"/><path d="M4 20v-4h4"/></svg>);
    case "play":
      return (<svg {...p}><path d="M7 5l12 7-12 7z"/></svg>);
    case "pause":
      return (<svg {...p}><path d="M8 5v14M16 5v14"/></svg>);
    case "stop":
      return (<svg {...p}><rect x="6" y="6" width="12" height="12" rx=".5"/></svg>);
    case "git":
      return (<svg {...p}><circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 8v8"/><path d="M6 12h8a2 2 0 0 0 2-2V8"/></svg>);
    case "branch":
      return (<svg {...p}><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="9" r="2"/><path d="M6 7v10"/><path d="M18 11c0 5-5 4-12 7"/></svg>);
    case "commit":
      return (<svg {...p}><circle cx="12" cy="12" r="3"/><path d="M3 12h6M15 12h6"/></svg>);
    case "rollback":
      return (<svg {...p}><path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v5h5"/></svg>);
    case "globe":
      return (<svg {...p}><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5a12 12 0 0 1 0 17"/><path d="M12 3.5a12 12 0 0 0 0 17"/></svg>);
    case "shield":
      return (<svg {...p}><path d="M12 3.5l7.5 3v6c0 4.5-3.3 7.7-7.5 8.5-4.2-.8-7.5-4-7.5-8.5v-6z"/><path d="M9 12l2.2 2.2L15.5 10"/></svg>);
    case "key":
      return (<svg {...p}><circle cx="8" cy="15" r="3.5"/><path d="M10.5 13l7-7"/><path d="M15 8.5l2 2"/></svg>);
    case "link":
      return (<svg {...p}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>);
    case "dot":
      return (<svg {...p}><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></svg>);
    case "drag":
      return (<svg {...p}><circle cx="9" cy="6" r=".9" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r=".9" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r=".9" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r=".9" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r=".9" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r=".9" fill="currentColor" stroke="none"/></svg>);
    case "filter":
      return (<svg {...p}><path d="M4 5h16l-6 8v5l-4 2v-7z"/></svg>);
    case "more":
      return (<svg {...p}><circle cx="5" cy="12" r=".9" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r=".9" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r=".9" fill="currentColor" stroke="none"/></svg>);
    case "upload":
      return (<svg {...p}><path d="M5 15v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3"/><path d="M12 4v11"/><path d="M8 8l4-4 4 4"/></svg>);
    case "download":
      return (<svg {...p}><path d="M5 15v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3"/><path d="M12 15V4"/><path d="M16 11l-4 4-4-4"/></svg>);
    case "star":
      return (<svg {...p}><path d="M12 4.5l2.2 4.5 5 .7-3.6 3.5.9 4.9L12 15.8 7.5 18l.9-4.9L4.8 9.7l5-.7z"/></svg>);
    case "send":
      return (<svg {...p}><path d="M21 12L4 5l3 7-3 7z"/><path d="M7 12h14"/></svg>);
    case "bell":
      return (<svg {...p}><path d="M6 17c0-5 1-9 6-9s6 4 6 9"/><path d="M4 17.5h16"/><path d="M10 20.5h4"/></svg>);
    case "sun":
      return (<svg {...p}><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M21 12h-2M5 12H3M18.4 5.6l-1.4 1.4M7 17l-1.4 1.4M18.4 18.4L17 17M7 7L5.6 5.6"/></svg>);
    case "moon":
      return (<svg {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>);
    case "command":
      return (<svg {...p}><path d="M8 6a2 2 0 1 0 0 4h8a2 2 0 1 0 0-4v12a2 2 0 1 0 0-4H8a2 2 0 1 0 0 4z"/></svg>);
    case "slash":
      return (<svg {...p}><path d="M8 20L16 4"/></svg>);
    case "logout":
      return (<svg {...p}><path d="M10 5H5v14h5"/><path d="M14 8l4 4-4 4"/><path d="M18 12H9"/></svg>);
    case "edit":
      return (<svg {...p}><path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="M13 6l4 4"/></svg>);
    case "trash":
      return (<svg {...p}><path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7l1 13h10l1-13"/></svg>);
    case "folder":
      return (<svg {...p}><path d="M3.5 7a1 1 0 0 1 1-1h4l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-14a1 1 0 0 1-1-1V7z"/></svg>);
    case "file":
      return (<svg {...p}><path d="M6.5 3.5h8l4.5 4.5v12a1 1 0 0 1-1 1h-11.5a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z"/><path d="M14.5 3.5v5h5"/></svg>);
    case "lock":
      return (<svg {...p}><rect x="5" y="10.5" width="14" height="9.5" rx="1"/><path d="M8 10.5V7a4 4 0 1 1 8 0v3.5"/></svg>);
    case "mail":
      return (<svg {...p}><rect x="3.5" y="5.5" width="17" height="13" rx="1"/><path d="M3.5 7l8.5 6 8.5-6"/></svg>);
    case "framework-next":
      return (<svg {...p}><circle cx="12" cy="12" r="8.5"/><path d="M8 7v10"/><path d="M8 7l8 10"/></svg>);
    case "framework-astro":
      return (<svg {...p}><path d="M12 3l5 15H7z"/><circle cx="12" cy="15" r="3"/></svg>);
    case "framework-remix":
      return (<svg {...p}><path d="M5 5h9a4 4 0 1 1 0 8H5z"/><path d="M5 13h9a4 4 0 0 1 4 4v2"/></svg>);
    case "framework-svelte":
      return (<svg {...p}><path d="M18 8c-2-3-6-4-9-2l-4 3c-3 2-3 6-1 9 1 2 3 3 5 3"/><path d="M6 16c2 3 6 4 9 2l4-3c3-2 3-6 1-9"/></svg>);
    case "framework-nuxt":
      return (<svg {...p}><path d="M3 18h18l-4-7-3 5-5-9z"/></svg>);
    case "framework-vite":
      return (<svg {...p}><path d="M3 5h18l-9 15z"/><path d="M8 9l4 7 4-7"/></svg>);
    case "framework-docker":
      return (<svg {...p}><rect x="4" y="11" width="3" height="3"/><rect x="8" y="11" width="3" height="3"/><rect x="12" y="11" width="3" height="3"/><rect x="8" y="7" width="3" height="3"/><rect x="12" y="7" width="3" height="3"/><path d="M3 14.5h16c2 0 3-3 0-3-.5-2-3-2-4-.5-1-3-5-3-6-.5-.5-1-2-1-3-.5"/></svg>);
    case "framework-python":
      return (<svg {...p}><path d="M8 4h6a3 3 0 0 1 3 3v4h-8a3 3 0 0 0-3 3v3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z"/><circle cx="9" cy="7" r=".5" fill="currentColor" stroke="none"/><path d="M16 20h-6a3 3 0 0 1-3-3v-4h8a3 3 0 0 0 3-3V7h2a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3z"/><circle cx="15" cy="17" r=".5" fill="currentColor" stroke="none"/></svg>);
    default:
      return (<svg {...p}><circle cx="12" cy="12" r="8"/></svg>);
  }
}
