import { Landing } from "../screens/Landing";

export const routes = [
  { path: "/", test: (p: string) => p === "/" || p === "", component: "Landing" },
  { path: "/lobby", test: (p: string) => p.startsWith("/lobby"), component: "Lobby" },
  { path: "/game", test: (p: string) => p.startsWith("/game"), component: "Player" },
  { path: "/meeting", test: (p: string) => p.startsWith("/meeting"), component: "Meeting" },
  { path: "/results", test: (p: string) => p.startsWith("/results"), component: "Results" },
];

export function Routes() {
  const path = window.location.pathname;
  const route = routes.find((r) => r.test(path)) || routes[0];
  return route.component;
}