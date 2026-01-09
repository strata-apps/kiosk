// router.js
import { renderEventsScreen } from "./screens/events.js";
import { renderOfficeVisitsScreen } from "./screens/office_visits.js";

export function startRouter(root, renderLanding) {
  const routes = {
    "": () => renderLanding(root),
    "#/": () => renderLanding(root),
    "#/events": () => renderEventsScreen(root),
    "#/office": () => renderOfficeVisitsScreen(root),
  };

  const onRoute = () => {
    const h = window.location.hash || "#/";
    const handler = routes[h] || routes["#/"];
    handler();
  };

  window.addEventListener("hashchange", onRoute);
  onRoute();
}
