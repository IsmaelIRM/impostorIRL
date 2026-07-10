import { Routes } from "./routes";
import { routes } from "./routes";

export default function App() {
  const path = window.location.pathname;
  const route = routes.find((r) => r.test(path)) || routes[0];
  
  return (
    <div style={{ padding: "20px", fontFamily: "system-ui" }}>
      <h1>Among Us Real Life</h1>
      <p>React + NestJS GraphQL - Phase 0 setup complete</p>
      <p>Current route: {path}</p>
    </div>
  );
}