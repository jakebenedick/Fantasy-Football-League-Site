"use client";
/* eslint-disable @next/next/no-img-element -- Sleeper avatar thumbnails are already CDN-sized. */

import { FormEvent, useState } from "react";
import { AppFooter } from "@/components/layout/AppFooter";
import { AppHeader } from "@/components/layout/AppHeader";
import {
  LeagueDashboard,
  type LeagueContext as Context,
} from "@/features/league-shell";
import {
  LeagueLoadingScreen,
  LeaguePicker,
  WelcomeScreen,
  type League,
} from "@/features/onboarding";
import type { ScoringAudit } from "@/features/statistics";
import { useTheme } from "@/hooks";
import { getJson } from "@/services";

type Stage = "welcome" | "leagues" | "loading" | "dashboard";


export default function Home() {
  const [stage, setStage] = useState<Stage>("welcome");
  const [username, setUsername] = useState("");
  const [activeUsername, setActiveUsername] = useState("");
  const [season, setSeason] = useState(new Date().getFullYear());
  const [leagues, setLeagues] = useState<League[]>([]);
  const [context, setContext] = useState<Context | null>(null);
  const [preloadedStatistics, setPreloadedStatistics] =
    useState<ScoringAudit | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { theme, chooseTheme } = useTheme();

  async function findLeagues(event: FormEvent) {
    event.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setError("");
    try {
      const name = username.trim();
      const result = await getJson<League[]>(
        `/api/v1/sleeper/users/${encodeURIComponent(
          name
        )}/leagues?season=${season}`
      );
      setActiveUsername(name);
      setLeagues(result);
      setStage("leagues");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load leagues.");
    } finally {
      setLoading(false);
    }
  }

  async function openLeague(league: League) {
    setSelectedLeague(league);
    setPreloadedStatistics(null);
    setStage("loading");
    setLoading(true);
    setError("");
    try {
      const nextContext = await getJson<Context>(
        `/api/v1/sleeper/users/${encodeURIComponent(activeUsername)}/leagues/${
          league.league_id
        }`
      );
      setContext(nextContext);

      // Statistics are part of league setup, not a deferred enhancement. Keep
      // the setup screen active until the default view is ready so users never
      // have to wait through a second loading cycle after opening the dashboard.
      const defaultStatsSeason = Math.max(1999, Number(league.season) - 1);
      const nextStatistics = await getJson<ScoringAudit>(
        `/api/v1/sleeper/leagues/${league.league_id}/statistics?season=${defaultStatsSeason}`
      );
      setPreloadedStatistics(nextStatistics);
      setStage("dashboard");
    } catch (e) {
      setStage("leagues");
      setError(
        e instanceof Error ? e.message : "Unable to import this league."
      );
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    if (context) await openLeague(context.league);
  }
  function reset() {
    setStage("welcome");
    setContext(null);
    setPreloadedStatistics(null);
    setSelectedLeague(null);
    setLeagues([]);
    setError("");
  }

  return (
    <div className="app-shell">
      <AppHeader
        theme={theme}
        activeUsername={activeUsername}
        selectedLeagueName={(context?.league ?? selectedLeague)?.name}
        showAccountContext={stage !== "welcome"}
        canSwitchLeague={leagues.length > 0}
        onThemeChange={chooseTheme}
        onReset={reset}
        onSwitchLeague={() => setStage("leagues")}
      />
      <main className={`main ${stage === "welcome" ? "centered" : ""}`}>
        {stage === "welcome" && (
          <WelcomeScreen
            username={username}
            season={season}
            loading={loading}
            error={error}
            onUsernameChange={setUsername}
            onSeasonChange={setSeason}
            onSubmit={findLeagues}
          />
        )}
        {stage === "leagues" && (
          <LeaguePicker
            username={activeUsername}
            season={season}
            leagues={leagues}
            loading={loading}
            error={error}
            onSelect={openLeague}
            onBack={reset}
          />
        )}
        {stage === "loading" && selectedLeague && (
          <LeagueLoadingScreen league={selectedLeague} />
        )}
        {stage === "dashboard" && context && (
          <LeagueDashboard
            context={context}
            loading={loading}
            error={error}
            preloadedStatistics={preloadedStatistics}
            refresh={refresh}
            changeLeague={() => setStage("leagues")}
          />
        )}
      </main>
      <AppFooter />
    </div>
  );
}
