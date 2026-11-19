import { useEffect } from "react";

const SITE = "Panini8 Blog";
const DEFAULT_DESCRIPTION =
  "Panini8 Blog is a community blogging platform: write posts in Markdown, discover stories by tag, like, comment and bookmark your favourites.";

// Creates the <meta> tag if the page doesn't have it yet, then sets its content.
const setMeta = (attr, key, content) => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

// Strips Markdown/HTML noise and trims to a snippet suitable for meta tags.
export const toDescription = (text) => {
  if (!text) return DEFAULT_DESCRIPTION;
  const clean = String(text)
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_`>~[\]()!-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return DEFAULT_DESCRIPTION;
  return clean.length > 160 ? `${clean.slice(0, 157)}...` : clean;
};

// Sets document.title plus description / Open Graph / Twitter meta for the
// current page (e.g. "My post | Panini8 Blog").
export default function usePageTitle(title, description) {
  useEffect(() => {
    const full = title ? `${title} | ${SITE}` : SITE;
    const desc = toDescription(description);
    document.title = full;
    setMeta("name", "description", desc);
    setMeta("property", "og:title", full);
    setMeta("property", "og:description", desc);
    setMeta("name", "twitter:title", full);
    setMeta("name", "twitter:description", desc);
  }, [title, description]);
}
