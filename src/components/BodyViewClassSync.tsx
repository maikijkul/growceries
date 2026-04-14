import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { getPreferredHomeView } from "../lib/homeViewPreference";

/**
 * Keeps `body.home-list-view` in sync with session preference on every navigation so the meadow
 * tile hides in list mode on category tabs and other routes, not only while Home is mounted.
 */
export function BodyViewClassSync() {
  const { pathname, search } = useLocation();

  useLayoutEffect(() => {
    if (getPreferredHomeView() === "list") {
      document.body.classList.add("home-list-view");
    } else {
      document.body.classList.remove("home-list-view");
    }
  }, [pathname, search]);

  return null;
}
