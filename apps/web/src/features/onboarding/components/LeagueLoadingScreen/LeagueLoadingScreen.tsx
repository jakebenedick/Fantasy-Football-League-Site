import { useEffect, useState } from "react";
import { LEAGUE_SETUP_STEPS } from "../../constants";
import type { LeagueLoadingScreenProps } from "./types";

export function LeagueLoadingScreen({ league }: LeagueLoadingScreenProps) {
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveStep((current) => Math.min(current + 1, LEAGUE_SETUP_STEPS.length - 1));
    }, 1350);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="league-loader" aria-live="polite" aria-busy="true">
      <div className="loader-visual" aria-hidden="true">
        <span className="loader-orbit loader-orbit-one" />
        <span className="loader-orbit loader-orbit-two" />
        <span className="loader-ball">🏈</span>
      </div>
      <div className="loader-copy">
        <span className="kicker">Setting up your league</span>
        <h1>{league.name}</h1>
        <p>
          We&apos;re assembling the latest public league data. A sleeping host may
          need a little extra time to warm up.
        </p>
        <div className="loader-progress" aria-hidden="true">
          <span
            style={{ width: `${((activeStep + 1) / LEAGUE_SETUP_STEPS.length) * 100}%` }}
          />
        </div>
        <ol className="loader-steps">
          {LEAGUE_SETUP_STEPS.map((step, index) => {
            const state = index < activeStep ? "complete" : index === activeStep ? "active" : "waiting";
            return (
              <li className={state} key={step.title}>
                <span className="loader-step-mark">
                  {state === "complete" ? "✓" : String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  <strong>{step.title}</strong>
                  <small>{step.detail}</small>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
