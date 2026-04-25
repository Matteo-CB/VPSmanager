export type ScreenId =
  | "dashboard" | "sites" | "site" | "deployments" | "deployment"
  | "logs" | "terminal" | "databases" | "files" | "services"
  | "dns" | "settings" | "stripe" | "analytics";

export type Route = { screen: ScreenId; arg?: string };
export type Go = (screen: ScreenId, arg?: string) => void;
