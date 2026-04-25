export type ScreenId =
  | "dashboard" | "sites" | "site" | "deployments" | "deployment"
  | "logs" | "terminal" | "databases" | "files" | "services"
  | "dns" | "settings" | "stripe";

export type Route = { screen: ScreenId; arg?: string };
export type Go = (screen: ScreenId, arg?: string) => void;
