import { SITE_URL } from "../site";

export const dynamic = "force-static";

export function GET() {
  const content = `# Fourth Down AI

> Fourth Down AI is a read-only fantasy football co-manager for public Sleeper dynasty leagues. It combines league history, rosters, transactions, draft capital, and NFL statistics to help users understand their league and make informed fantasy-football decisions.

## Key pages

- [Application](${SITE_URL}/): Connect a public Sleeper username, select a league, and explore league dashboards, rosters, statistics, history, and draft assets.
- [Privacy and data use](${SITE_URL}/privacy): How public Sleeper and NFL data is processed, including disclosures for AI-assisted analysis.
- [Sitemap](${SITE_URL}/sitemap.xml): Index of public pages.

## Data and limitations

- Sleeper integration is public and read-only; Fourth Down AI cannot modify a user's Sleeper account or league.
- League data is processed on demand and is not maintained in a persistent Fourth Down AI league database.
- AI-assisted insights are informational, probabilistic, and may be incomplete or incorrect. Users remain responsible for roster, lineup, waiver, draft, and trade decisions.
- Fourth Down AI is an independent product of CodedByJake LLC and is not operated by or endorsed by Sleeper or the NFL.
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
