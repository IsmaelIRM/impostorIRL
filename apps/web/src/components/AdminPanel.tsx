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
    if (code && adminToken) {
      fetchMissions();
      fetchTemplates();
    }
  }, [code, adminToken]);

  if (!code || !adminToken) return null;

  const fetchMissions = async () => {
    if (!code || !adminToken) return;
    try {
      const res = await fetch(`/api/missions?code=${code}&adminToken=${adminToken}`);
      if (!res.ok) return;
      const data = await res.json();
      setMissions(data.missions || []);
    } catch (e) {
      console.error("Fetch missions error:", e);
    }
  };

  const fetchTemplates = async () => {
    if (!code || !adminToken) return;
    try {
      const res = await fetch(`/api/templates?code=${code}&adminToken=${adminToken}`);
      if (!res.ok) return;
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (e) {
      console.error("Fetch templates error:", e);
    }
  };

  const uploadModule = async () => {
    if (!moduleFile) return;
    const form = new FormData();
    form.append("file", moduleFile);
    try {
      const res = await fetch(`/api/modules?code=${code}&adminToken=${adminToken}`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (data.success) fetchMissions();
      else alert(data.error);
    } catch (e) {
      alert("Upload failed");
    }
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
            <button className="good" onClick={() => console.log("Load template")}>Load</button>
          </div>
        );
      case "missions":
        return (
          <div>
            <h3>Misiones disponibles</h3>
            <button className="ghost" onClick={fetchMissions}>Refresh</button>
            {missions.length === 0 && <p className="tiny">No missions loaded</p>}
            {missions.map((m) => (
              <div key={m.id} className="mission-item">
                <span>{m.name} ({m.scope})</span>
              </div>
            ))}
            <div style={{ marginTop: "1rem" }}>
              <input type="file" accept=".zip" onChange={(e) => setModuleFile(e.target.files?.[0] || null)} />
              <button className="good" onClick={uploadModule} disabled={!moduleFile}>Upload Module</button>
            </div>
          </div>
        );
      case "sabotages":
        return (
          <div>
            <h3>Sabotajes</h3>
            <p className="tiny">Configure sabotage cooldown and types in timers tab.</p>
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