import { useEffect } from "react";

const SITE_URL = "https://www.gurukundali.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

// index.html ships static defaults (title/description/canonical/OG/Twitter)
// as a fallback for crawlers that don't execute JS — Facebook/Twitter/WhatsApp
// link unfurlers, for instance. For everyone else, this mutates those SAME
// tags in place per route rather than inserting new ones: a second
// rel=canonical (even pointing elsewhere) makes Google disregard canonical
// hints on the page entirely, so there must only ever be one of each tag.
function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

interface SeoProps {
  title: string;
  description: string;
  /** Path only, e.g. "/pricing" — used to build the canonical and og:url. */
  path: string;
  image?: string;
  noindex?: boolean;
}

export default function Seo({ title, description, path, image = DEFAULT_OG_IMAGE, noindex = false }: SeoProps) {
  useEffect(() => {
    const url = `${SITE_URL}${path}`;
    const robots = noindex ? "noindex, follow" : "index, follow, max-image-preview:large, max-snippet:-1";

    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", robots);
    upsertLink("canonical", url);

    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:image", image);

    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", image);
  }, [title, description, path, image, noindex]);

  return null;
}
