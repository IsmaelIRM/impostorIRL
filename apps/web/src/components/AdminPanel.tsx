import React, { useState, useEffect } from "react";

interface AdminPanelProps {
  code: string;
  adminToken: string;
  socket?: any;
}

export function AdminPanel({ code, adminToken, socket }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"templates" | "missions" | "sabotages" | "timers">("templates");
  const [missions, setMissions] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [moduleFile, setModuleFile] = useState<File | null>(null);

  useEffect(() => {
    fetchMissions();
    fetchTemplates();
  }, []);

  const fetchMissions = async () => {
    const res = await fetch(`/api/missions?code=${code}&adminToken=${adminToken}`);
    const data = await res.json();
    setMissions(data.missions || []);
  };

  const fetchTemplates = async () => {
    const res = await fetch(`/api/templates?code=${code}&adminToken=${adminToken}`);
    const data = await res.json();
    setTemplates(data.templates || []);
  };

  const uploadModule = async () => {
    if (!moduleFile) return;
    const form = new FormData();
    form.append("file", moduleFile);
    const res = await fetch(`/api/modules?code=${code}&adminToken=${adminToken}`, {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    if (data.success) fetchMissions();
    else alert(data.error);
  };

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
            <button onClick={() => console.log("Load template")}>Load</button>
          </div>
        );
      case "missions":
        return (
          <div>
            <h3>Misiones</h3>
            <button onClick={fetchMissions}>Refresh</button>
            {missions.map((m) => (
              <div key={m.id} className="mission-item">
                <span>{m.name} ({m.scope})</span>
              </div>
            ))}
            <div style={{ marginTop: "1rem" }}>
              <input type="file" accept=".zip" onChange={(e) => setModuleFile(e.target.files?.[0] || null)} />
              <button onClick={uploadModule}>Upload Module</button>
            </div>
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
    <div className="admin-panel" style={{ marginTop: "1rem" }}>
      <div className="tabs">
        <button className={activeTab === "templates" ? "active" : ""} onClick={() => setActiveTab("templates")}>Plantillas</button>
        <button className={activeTab === "missions" ? "active" : ""} onClick={() => setActiveTab("missions")}>Misiones</button>
        <button className={activeTab === "sabotages" ? "active" : ""} onClick={() => setActiveTab("sabotages")}>Sabotajes</button>
        <button className={activeTab === "timers" ? "active" : ""} onClick={() => setActiveTab("timers")}>Tiempos</button>
      </div>
      <div className="tab-content">{renderTabContent()}</div>
      <div className="admin-actions">
        <button onClick={startGame}>Iniciar Partida</button>
        <button onClick={resetGame}>Reiniciar</button>
      </div>
    </div>
  );
}