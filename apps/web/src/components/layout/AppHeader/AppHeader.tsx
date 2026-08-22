import { Icon } from "@/components/ui/Icon";
import type { AppHeaderProps } from "./types";

export function AppHeader({
  theme,
  activeUsername,
  selectedLeagueName,
  showAccountContext,
  canSwitchLeague,
  onThemeChange,
  onReset,
  onSwitchLeague,
}: AppHeaderProps) {
  return (
    <header className="topbar">
      <button className="brand" onClick={onReset}>
        <span className="brand-mark"><span className="brand-football" aria-hidden="true">🏈</span></span>
        <span>Fourth Down<span className="brand-dot">AI</span></span>
      </button>
      <div className="top-actions">
        <span className="prototype">Prototype</span>
        <details className="settings-menu">
          <summary aria-label="Open settings"><Icon name="settings" /><span>Settings</span></summary>
          <div className="settings-popover">
            <div className="settings-heading"><span>Preferences</span><strong>Settings</strong></div>
            {showAccountContext && (
              <div className="settings-context">
                <div><span>Sleeper username</span><strong>{activeUsername}</strong></div>
                {selectedLeagueName && <div><span>Selected league</span><strong>{selectedLeagueName}</strong></div>}
                <div className="settings-context-actions">
                  {canSwitchLeague && <button type="button" onClick={onSwitchLeague}>Switch league</button>}
                  <button type="button" onClick={onReset}>Switch account</button>
                </div>
              </div>
            )}
            <div className="setting-row">
              <div><strong>Appearance</strong><small>Choose how Fourth Down looks.</small></div>
              <div className="theme-options" aria-label="Color theme">
                <button className={theme === "light" ? "active" : ""} onClick={() => onThemeChange("light")} aria-pressed={theme === "light"}><span aria-hidden="true">☀</span> Light</button>
                <button className={theme === "dark" ? "active" : ""} onClick={() => onThemeChange("dark")} aria-pressed={theme === "dark"}><span aria-hidden="true">☾</span> Dark</button>
              </div>
            </div>
            <small className="settings-note">More preferences will appear here as the app expands.</small>
          </div>
        </details>
      </div>
    </header>
  );
}
