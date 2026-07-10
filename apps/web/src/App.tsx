import { ApolloProvider } from "@apollo/client";
import { client } from "./graphql/client";
import { routes } from "./routes";

export default function App() {
  const path = window.location.pathname;
  const route = routes.find((r) => r.test(path)) || routes[0];

  return (
    <ApolloProvider client={client}>
      <div style={{ padding: "20px", fontFamily: "system-ui" }}>
        <h1>Among Us Real Life</h1>
        <p>React + NestJS GraphQL - Phase 2: Mission Modules</p>
        <p>Current route: {path}</p>
        <p>Mission: {route.component}</p>
      </div>
    </ApolloProvider>
  );
}