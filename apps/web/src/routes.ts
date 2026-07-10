export const routes = [
  { path: "/", test: (p) => p === "/" || p === "", component: "Landing" },
  { path: "/lobby", test: (p) => p.startsWith("/lobby"), component: "Lobby" },
  { path: "/game", test: (p) => p.startsWith("/game"), component: "Player" },
  { path: "/meeting", test: (p) => p.startsWith("/meeting"), component: "Meeting" },
  { path: "/results", test: (p) => p.startsWith("/results"), component: "Results" },
];

export function Routes() {
  const path = window.location.pathname;
  const route = routes.find((r) => r.test(path)) || routes[0];
  return route.component;
}