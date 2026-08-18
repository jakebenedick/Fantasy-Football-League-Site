export const SITE_NAME = "Fourth Down AI";
export const SITE_DESCRIPTION =
  "A read-only fantasy football co-manager for Sleeper dynasty leagues, combining league history, roster context, draft capital, and NFL statistics.";

const configuredUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.RENDER_EXTERNAL_URL ??
  "https://fourth-down-jzs0.onrender.com";

export const SITE_URL = configuredUrl.replace(/\/$/, "");
