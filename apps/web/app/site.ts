export const SITE_NAME = "FourthDahn";
export const SITE_DESCRIPTION =
  "FourthDahn turns your dynasty league's history and data into context for better fantasy decisions. Know your league. Make the call.";

const configuredUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://fourthdahn.com";

export const SITE_URL = configuredUrl.replace(/\/$/, "");
