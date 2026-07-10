import React, { useState, useEffect } from "react";
import { AdminPanel } from "../components/AdminPanel";

interface LobbyScreenProps {
  socket: any;
  code: string;
  room: any;
  isAdmin: boolean;
  adminToken: string | null;
}

export function LobbyScreen({ socket, code, room, isAdmin, adminToken }: LobbyScreenProps) {
  const [localRoom, setLocalRoom] = useState(room);
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    socket.on("lobby:update", setLocalRoom);
    return () => socket.off("lobby:update", setLocalRoom);
  }, [socket]);

  useEffect(() => {
    setLocalRoom(room);
  }, [room]);

  useEffect(() => {
    fetch("/api/templates")
      .then(r => r.json())
      .then(d => setTemplates(d.templates || []))
      .catch(() => {});
  }, []);

  if (!localRoom) return <div className="loading">Cargando...</div>;

  return (
    <div>
      <h1>Sala {localRoom.code}</h1>
      <div className="code-badge">{localRoom.code}</div>
      <p className="sub">Comparte este código o el enlace</p>

      <div className="card">
        <label>Enlace para unirse</label>
        <input readOnly value={localRoom.joinUrl || ""} style={{ marginBottom: "8px" }} />
        <button className="ghost" onClick={() => navigator.clipboard.writeText(localRoom.joinUrl)}>
          Copiar enlace
        </button>
        {isAdmin && localRoom.adminUrl && (
          <button className="ghost" style={{ marginTop: "8px" }} onClick={() => navigator.clipboard.writeText(localRoom.adminUrl)}>
            Copiar enlace de anfitrión
          </button>
        )}
      </div>

      <div className="card">
        <h3>Jugadores ({localRoom.players?.length || 0})</h3>
        <ul className="players">
          {localRoom.players?.map((p: any) => (
            <li key={p.id} className={!p.connected ? "off" : ""}>
              <span>{p.name} {p.isAdmin && <span className="tag admin">ANFITRIÓN</span>}</span>
            </li>
          ))}
        </ul>
      </div>

      {isAdmin && localRoom.code && adminToken && (
        <AdminPanel code={localRoom.code} adminToken={adminToken} socket={socket} missions={localRoom.missions || []} templates={templates} />
      )}
    </div>
  );
}