import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Fourth Down AI handles public Sleeper and NFL data, including AI-assisted analysis.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    type: "article",
    url: "/privacy",
    title: "Privacy Policy | Fourth Down AI",
    description:
      "How Fourth Down AI handles public Sleeper and NFL data, including AI-assisted analysis.",
  },
};

export default function PrivacyPolicy() {
  return (
    <main className="privacy-shell">
      <a className="privacy-back" href="/">
        ← Back to Fourth Down AI
      </a>

      <header className="privacy-hero">
        <span>Privacy &amp; data use</span>
        <h1>Your league data stays public, read-only, and temporary.</h1>
        <p>
          Fourth Down AI is a prototype that organizes information already
          available through Sleeper&apos;s public API. It does not ask for your
          Sleeper password, modify your league, or maintain a persistent
          database of Sleeper users, leagues, rosters, or transactions.
        </p>
        <small>Effective August 16, 2026</small>
      </header>

      <div className="privacy-summary">
        <article>
          <b aria-hidden="true">✓</b>
          <div>
            <strong>No Sleeper credentials</strong>
            <span>Only a public username is needed.</span>
          </div>
        </article>
        <article>
          <b aria-hidden="true">✓</b>
          <div>
            <strong>No persistent league database</strong>
            <span>Public league data is processed on demand.</span>
          </div>
        </article>
        <article>
          <b aria-hidden="true">✓</b>
          <div>
            <strong>Transparent AI-assisted analysis</strong>
            <span>
              Public league and NFL data may be processed by AI models to
              generate requested insights.
            </span>
          </div>
        </article>
      </div>

      <article className="privacy-policy">
        <section>
          <h2>1. Scope</h2>
          <p>
            This policy explains how the Fourth Down AI prototype handles
            information when you use the application. It applies to the
            prototype interface, its API, and the features that display public
            Sleeper fantasy-football information.
          </p>
        </section>

        <section>
          <h2>2. Information the application accesses</h2>
          <p>
            When you enter a Sleeper username, the application requests public
            information made available by Sleeper. Depending on the selected
            league, this can include:
          </p>
          <ul>
            <li>Public usernames, display names, avatars, and team images</li>
            <li>League names, settings, seasons, and roster configurations</li>
            <li>Rosters, players, taxi squads, and injured-reserve lists</li>
            <li>Standings, scores, records, and playoff brackets</li>
            <li>Drafts, draft picks, pick ownership, and draft history</li>
            <li>Public transaction and trade history</li>
            <li>
              NFL player, team, game, scoring, projection, ranking, and other
              fantasy-relevant statistical data from identified data sources
            </li>
          </ul>
          <p>
            The application does not request or receive your Sleeper password,
            private messages, payment information, or permission to make
            changes to your Sleeper account.
          </p>
        </section>

        <section>
          <h2>3. How information and AI are used</h2>
          <p>
            Public Sleeper information is used only to generate the views and
            analysis you request—for example, roster pages, live standings,
            league history, trade comparisons, and draft-pick lineage. The
            integration is read-only and cannot add, drop, trade, draft, or
            move players on your behalf.
          </p>
          <p>
            Fourth Down AI also uses, and plans to expand its use of, artificial
            intelligence and machine-learning models to process public league
            information together with NFL statistical data. These systems may
            identify patterns and produce roster-decision support, player and
            team comparisons, trade insights or grades, draft analysis,
            projections, explanations, and other fantasy-football guidance.
          </p>
          <p>
            When an AI-assisted feature is used, the information needed for the
            requested analysis may be supplied as input to a model operated by
            Fourth Down AI or a model-service provider. Fourth Down AI does not
            use Sleeper passwords or private messages for these features. Public
            league data is not used to train a Fourth Down AI model unless this
            policy is updated and users are given notice before that practice
            begins.
          </p>
          <p>
            AI and machine-learning outputs are probabilistic and may be
            incomplete, outdated, or incorrect. They are provided as
            informational decision support; users remain responsible for roster,
            lineup, waiver, draft, and trade decisions.
          </p>
        </section>

        <section>
          <h2>4. Data collection summary</h2>
          <p>
            This plain-language summary describes the current web prototype. It
            is designed to support, but does not replace, the separate App Store
            Connect and Google Play Console disclosures required if a native
            mobile application is released. Those store disclosures will be
            reviewed against the exact mobile build and its third-party SDKs
            before submission.
          </p>
          <div className="privacy-data-label" role="table" aria-label="Data collection summary">
            <div className="privacy-data-row privacy-data-head" role="row">
              <strong role="columnheader">Data type</strong>
              <strong role="columnheader">Use and handling</strong>
            </div>
            <div className="privacy-data-row" role="row">
              <strong role="cell">Public account identifiers</strong>
              <span role="cell">
                A Sleeper username, user ID, display name, avatar, and public
                team identity are used for app functionality and requested
                analysis. They are not used for advertising or cross-app
                tracking.
              </span>
            </div>
            <div className="privacy-data-row" role="row">
              <strong role="cell">Public league and gameplay content</strong>
              <span role="cell">
                Rosters, transactions, drafts, scores, standings, and league
                settings are processed to display league features and generate
                requested statistical or AI-assisted insights. Fourth Down AI
                does not maintain a persistent league database.
              </span>
            </div>
            <div className="privacy-data-row" role="row">
              <strong role="cell">NFL statistical data</strong>
              <span role="cell">
                Player, team, game, scoring, projection, and ranking data may be
                combined with public league data for app functionality,
                analytics requested by the user, and AI-assisted decision
                support.
              </span>
            </div>
            <div className="privacy-data-row" role="row">
              <strong role="cell">Operational and diagnostic data</strong>
              <span role="cell">
                Hosting providers may temporarily process IP addresses, request
                timestamps, URLs, response codes, browser details, performance
                data, and crash information for security, reliability, and
                troubleshooting.
              </span>
            </div>
            <div className="privacy-data-row" role="row">
              <strong role="cell">Tracking, advertising, and sale</strong>
              <span role="cell">
                The current prototype does not use data for cross-app tracking,
                targeted advertising, or sale to data brokers.
              </span>
            </div>
          </div>
        </section>

        <section>
          <h2>5. Storage and retention</h2>
          <p>
            Fourth Down AI does not maintain a persistent application database
            containing Sleeper usernames, league data, roster data, or
            transaction history. Public API responses may be held temporarily
            in server memory to improve performance and reduce repeated calls
            to Sleeper. These temporary caches expire and are cleared when the
            application process restarts.
          </p>
          <p>
            Your light or dark appearance preference is stored locally in your
            own browser using local storage. It does not contain Sleeper data
            and is not transmitted as an account profile. You can remove it by
            clearing this site&apos;s browser data.
          </p>
        </section>

        <section>
          <h2>6. Cookies, analytics, and advertising</h2>
          <p>
            The prototype does not use advertising cookies, behavioral
            tracking, or targeted advertising, and it does not sell personal
            information. The application currently does not create user
            accounts or authentication cookies.
          </p>
        </section>

        <section>
          <h2>7. Infrastructure and operational logs</h2>
          <p>
            Like most internet services, the hosting or networking provider may
            create limited operational logs such as request timestamps, IP
            addresses, requested URLs, response codes, and browser information
            for security, reliability, and troubleshooting. Fourth Down AI does
            not combine these logs with Sleeper league data to build user
            profiles. Provider handling of infrastructure logs is governed by
            the applicable provider&apos;s own privacy terms.
          </p>
        </section>

        <section>
          <h2>8. Third-party services</h2>
          <p>
            Sleeper supplies the public fantasy-football data displayed by the
            application. Player and team images may also be delivered from
            Sleeper-controlled content services. Sleeper&apos;s collection and use
            of information is governed by Sleeper&apos;s own policies. Fourth Down
            AI is an independent prototype and is not operated by or endorsed
            by Sleeper.
          </p>
          <p>
            NFL statistics, projections, rankings, or related context may come
            from public or licensed third-party datasets identified in the
            applicable feature. AI-assisted features may also rely on external
            model-service providers. Those providers process the limited data
            sent to them under their applicable terms, privacy policies, and
            the service configuration selected by Fourth Down AI.
          </p>
        </section>

        <section>
          <h2>9. Data sharing</h2>
          <p>
            Fourth Down AI does not sell, rent, or license Sleeper data. Public
            data is sent only where necessary to operate the requested feature,
            such as between the browser, this application&apos;s API, Sleeper&apos;s
            public API, NFL statistical-data sources, infrastructure providers,
            and AI model providers used to generate an analysis that the user
            requests.
          </p>
        </section>

        <section>
          <h2>10. Security and limitations</h2>
          <p>
            Reasonable technical measures are used to keep the prototype
            read-only and limit unnecessary data handling. No internet service
            can guarantee absolute security. Because Sleeper league information
            accessed here is publicly available, users should avoid putting
            sensitive personal information in public team names, avatars, or
            other Sleeper profile fields.
          </p>
        </section>

        <section>
          <h2>11. Your choices</h2>
          <p>
            You can stop using the application at any time. Because the
            prototype does not maintain persistent Sleeper profiles, there is
            no stored league account to delete from Fourth Down AI. You can
            clear the local appearance preference through your browser&apos;s site
            data controls.
          </p>
        </section>

        <section>
          <h2>12. Policy changes and questions</h2>
          <p>
            This policy may be updated as the prototype gains features such as
            accounts, saved preferences, analytics, or assistant functionality.
            Material changes to data handling should be reflected here before
            those features are made available. For questions, contact the
            league administrator or prototype owner who provided access to this
            application.
          </p>
        </section>
      </article>
    </main>
  );
}
