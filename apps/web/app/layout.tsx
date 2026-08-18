import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./site";
import "./styles.css";
import "./context.css";
import "./trade.css";
import "./player.css";
import "./lineage.css";
import "./board.css";
import "./round-board.css";
import "./owner.css";
import "./league-view.css";
import "./history.css";
import "./history-details.css";
import "./interactive-history.css";
import "./refinements.css";
import "./champion.css";
import "./live-standings.css";
import "./theme.css";
import "./privacy.css";
import "./scoring.css";
import "./loading.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: `${SITE_NAME} | Fantasy Football Co-Manager`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Fantasy Football Co-Manager`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} | Fantasy Football Co-Manager`,
    description: SITE_DESCRIPTION,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "SportsApplication",
  operatingSystem: "Web",
  creator: {
    "@type": "Organization",
    name: "CodedByJake LLC",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
      </body>
    </html>
  );
}
