import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "./site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Fourth Down",
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#f4f5f0",
    theme_color: "#0a6544",
  };
}
