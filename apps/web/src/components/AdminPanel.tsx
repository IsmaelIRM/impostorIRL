import React, { useState, useEffect } from "react";

interface AdminPanelProps {
  code: string;
  adminToken: string;
  socket?: any;
  missions?: any[];
  templates?: any[];
}

export function AdminPanel({ code, adminToken, socket, missions: initialMissions = [], templates: initialTemplates = [] }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"templates" | "missions" | "sabotages" | "timers">("templates");
  const [missions, setMissions] = useState<any[]>(initialMissions);
  const [templates, setTemplates] = useState<any[]>(initialTemplates);

  useEffect(() => {
    setMissions(initialMissions);
  }, [initialMissions]);

  useEffect(() => {
    setTemplates(initialTemplates);
    // Also fetch available templates (no auth needed)
    fetch("/api/templates")
      .then(r => r.json())
      .then(d => setTemplates(d.templates || []))
      .catch(() => {});
  }, [initialTemplates]);

  const startGame = () => {
    socket?.emit("admin:start", { code, adminToken });
  };

  const resetGame = () => {
    socket?.emit("admin:reset", { code, adminToken });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "templates":
        return (
          <div>
            <h3>Plantillas</h3>
            <select>
              <option value="">Selecciona plantilla...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <button className="good" onClick={() => console.log("Load template")}>Load</button>
          </div>
        );
      case "missions":
        return (
          <div>
            <h3>Misiones disponibles</h3>
            {missions.length === 0 && <p className="tiny">No hay misiones configuradas</p>}
            {missions.map((m) => (
              <div key={m.id} className="mission-item">
                <span>{m.name} ({m.zone})</span>
              </div>
            ))}
          </div>
        );
      case "sabotages":
        return (
          <div>
            <h3>Sabotajes</h3>
            <p className="tiny">Configure sabotage cooldown and types in times tab.</p>
          </div>
        );
      case "timers":
        return (
          <div>
            <h3>Tiempos</h3>
            <label>Meeting Sec: <input type="number" defaultValue={60} min={10} max={600} /></label>
            <label>Kill Cooldown: <input type="number" defaultValue={45} min={0} max={600} /></label>
            <label>Time Limit: <input type="number" defaultValue={600} min={60} max={7200} /></label>
            <button className="good">Guardar tiempos</button>
          </div>
        );
    }
  };

  return (
    <div className="card admin-panel">
      <h3>⚙️ Panel de anfitrión</h3>
      <p className="tiny">Configura la partida antes de iniciar</p>
      <div className="tabs">
        <button className={activeTab === "templates" ? "active" : ""} onClick={() => setActiveTab("templates")}>Plantillas</button>
        <button className={activeTab === "missions" ? "active" : ""} onClick={() => setActiveTab("missions")}>Misiones</button>
        <button className={activeTab === "sabotages" ? "active" : ""} onClick={() => setActiveTab("sabotages")}>Sabotajes</button>
        <button className={activeTab === "timers" ? "active" : ""} onClick={() => setActiveTab("timers")}>Tiempos</button>
      </div>
      <div className="tab-content">{renderTabContent()}</div>
      <div className="admin-actions">
        <button className="good" onClick={startGame}>Iniciar Partida</button>
        <button className="ghost" onClick={resetGame}>Reiniciar</button>
      </div>
    </div>
  );
}