import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";

interface LobbyProps {
  socket: any;
  code: string;
}

export function LobbyScreen({ socket, code }: LobbyProps) {
  const [room, setRoom] = useState<any>(null);
  const [newPlayerName, setNewPlayerName] = useState("");

  useEffect(() => {
    socket.on("lobby:update", setRoom);
    return () => socket.off("lobby:update", setRoom);
  }, []);

  const addMission = () => {
    const id = crypto.randomUUID().slice(0, 8);
    socket.emit("admin:configure", {
      code,
      adminToken: room?.adminToken,
      missions: room?.missions?.map(m => ({ id: m.id, name: m.name, zone: m.zone })) 
    });
  };

  if (!room) return <div className="loading">Cargando...</div>;

  return (
    <div>
      <h1>Among Us Real Life</h1>
      <p className="sub">Sala: <strong>{room.code}</strong></p>
      
      <div className="card">
        <h3>Jugadores ({room.players?.length || 0})</h3>
        <ul className="players">
          {room.players?.map((p: any) => (
            <li key={p.id} className={!p.connected ? "off" : ""}>
              <span>{p.name}</span>
              <span className="tag">{p.isAdmin ? "HOST" : "Jugador"}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3>Misiones ({room.missions?.length || 0})</h3>
        <ul className="players">
          {room.missions?.map((m: any) => (
            <li key={m.id}>
              <span>{m.name} (Zona: {m.zone || "?"})</span>
              <span className="tag">{m.missionId}</span>
            </li>
          ))}
        </ul>
      </div>

      {room.players?.some((p: any) => p.isAdmin) && (
        <div className="card admin-panel">
          <h3>⚙️ Anfitrión</h3>
          <p className="tiny">Configura la partida antes de iniciar</p>
          <div className="row">
            <button onClick={() => socket.emit("admin:start", { code, adminToken: room.adminToken })}>
              Iniciar partida
            </button>
          </div>
        </div>
      )}
    </div>
  );
}