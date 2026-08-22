import type { Theme } from "@/hooks";

export type AppHeaderProps = {
  theme: Theme;
  activeUsername: string;
  selectedLeagueName?: string;
  showAccountContext: boolean;
  canSwitchLeague: boolean;
  onThemeChange: (theme: Theme) => void;
  onReset: () => void;
  onSwitchLeague: () => void;
};
