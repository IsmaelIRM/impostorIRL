import { ApolloProvider } from "@apollo/client";
import { client } from "./graphql/client";
import { routes } from "./routes";
import { AdminPanel } from "./components/AdminPanel";

export default function App() {
  const path = window.location.pathname;
  const route = routes.find((r) => r.test(path)) || routes[0];
  const isAdmin = path.startsWith("/lobby") && true;
  const code = path.split("/")[2] || "TEST";

  return (
    <ApolloProvider client={client}>
      <div style={{ padding: "20px", fontFamily: "system-ui" }}>
        <h1>Among Us Real Life</h1>
        <p>React + NestJS GraphQL - Phase 5: Admin UI</p>
        <p>Current route: {path}</p>
        {isAdmin && <AdminPanel code={code} adminToken="test-token" />}
      </div>
    </ApolloProvider>
  );
}