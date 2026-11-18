import { useEffect } from "react";

const SITE = "Panini8 Blog";

// Sets document.title for the current page (e.g. "My post | Panini8 Blog").
export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE}` : SITE;
  }, [title]);
}
