import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Fourth Down AI",
  description: "How the Fourth Down AI prototype handles Sleeper data.",
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
            <strong>No selling or advertising use</strong>
            <span>Your data is not sold or used for targeted ads.</span>
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
          </ul>
          <p>
            The application does not request or receive your Sleeper password,
            private messages, payment information, or permission to make
            changes to your Sleeper account.
          </p>
        </section>

        <section>
          <h2>3. How information is used</h2>
          <p>
            Public Sleeper information is used only to generate the views and
            analysis you request—for example, roster pages, live standings,
            league history, trade comparisons, and draft-pick lineage. The
            integration is read-only and cannot add, drop, trade, draft, or
            move players on your behalf.
          </p>
        </section>

        <section>
          <h2>4. Storage and retention</h2>
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
          <h2>5. Cookies, analytics, and advertising</h2>
          <p>
            The prototype does not use advertising cookies, behavioral
            tracking, or targeted advertising, and it does not sell personal
            information. The application currently does not create user
            accounts or authentication cookies.
          </p>
        </section>

        <section>
          <h2>6. Infrastructure and operational logs</h2>
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
          <h2>7. Third-party services</h2>
          <p>
            Sleeper supplies the public fantasy-football data displayed by the
            application. Player and team images may also be delivered from
            Sleeper-controlled content services. Sleeper&apos;s collection and use
            of information is governed by Sleeper&apos;s own policies. Fourth Down
            AI is an independent prototype and is not operated by or endorsed
            by Sleeper.
          </p>
        </section>

        <section>
          <h2>8. Data sharing</h2>
          <p>
            Fourth Down AI does not sell, rent, or license Sleeper data. Public
            data is sent only where necessary to operate the requested feature,
            such as between the browser, this application&apos;s API, Sleeper&apos;s
            public API, and infrastructure providers that deliver the service.
          </p>
        </section>

        <section>
          <h2>9. Security and limitations</h2>
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
          <h2>10. Your choices</h2>
          <p>
            You can stop using the application at any time. Because the
            prototype does not maintain persistent Sleeper profiles, there is
            no stored league account to delete from Fourth Down AI. You can
            clear the local appearance preference through your browser&apos;s site
            data controls.
          </p>
        </section>

        <section>
          <h2>11. Policy changes and questions</h2>
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
