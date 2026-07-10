import React, { useState } from "react";
import { useQuery, gql } from "@apollo/client";

const MISSIONS_QUERY = gql`
  query GetMissions {
    missions {
      id
      name
      isInteractive
      scope
      endsGame
      weight
    }
  }
`;

interface AdminPanelProps {
  code: string;
  adminToken: string;
}

export function AdminPanel({ code, adminToken }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"templates" | "missions" | "sabotages" | "timers">("templates");
  const { data, loading } = useQuery(MISSIONS_QUERY);

  const renderTabContent = () => {
    switch (activeTab) {
      case "templates":
        return <div>Templates tab - configure game presets</div>;
      case "missions":
        return (
          <div>
            <h3>Misiones</h3>
            {loading ? "Loading..." : data?.missions?.map((m: any) => (
              <div key={m.id} className="mission-item">
                <span>{m.name} ({m.scope})</span>
                <input type="number" placeholder="Weight" defaultValue={m.weight} />
              </div>
            ))}
          </div>
        );
      case "sabotages":
        return <div>Sabotages tab - configure sabotage types</div>;
      case "timers":
        return (
          <div>
            <h3>Timers</h3>
            <label>Meeting Sec: <input type="number" defaultValue={60} /></label>
            <label>Kill Cooldown: <input type="number" defaultValue={45} /></label>
            <label>Time Limit: <input type="number" defaultValue={600} /></label>
          </div>
        );
    }
  };

  return (
    <div className="admin-panel">
      <div className="tabs">
        <button className={activeTab === "templates" ? "active" : ""} onClick={() => setActiveTab("templates")}>Plantillas</button>
        <button className={activeTab === "missions" ? "active" : ""} onClick={() => setActiveTab("missions")}>Misiones</button>
        <button className={activeTab === "sabotages" ? "active" : ""} onClick={() => setActiveTab("sabotages")}>Sabotajes</button>
        <button className={activeTab === "timers" ? "active" : ""} onClick={() => setActiveTab("timers")}>Tiempos</button>
      </div>
      <div className="tab-content">{renderTabContent()}</div>
      <div className="admin-actions">
        <button onClick={() => console.log("Start game")}>Iniciar Partida</button>
        <button onClick={() => console.log("Reset game")}>Reiniciar</button>
      </div>
    </div>
  );
}