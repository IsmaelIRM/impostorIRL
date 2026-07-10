import React, { useState, useEffect, useRef } from "react";

interface LobbyScreenProps {
  socket: any;
  code: string;
}

export function LobbyScreen({ socket, code }: LobbyScreenProps) {
  const [room, setRoom] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    socket.on("lobby:update", (data: any) => {
      setRoom(data);
      setIsAdmin(data?.isAdmin || false);
    });
    return () => socket.off("lobby:update");
  }, []);

  if (!room) return <div className="loading">Cargando...</div>;

  return (
    <div>
      <h1>Sala {room.code}</h1>
      <div className="code-badge">{room.code}</div>
      <p className="sub">Comparte este código o el enlace</p>

      <div className="card">
        <label>Enlace para unirse</label>
        <input readOnly value={room.joinUrl || ""} style={{ marginBottom: "8px" }} />
        <button className="ghost" onClick={() => navigator.clipboard.writeText(room.joinUrl)}>
          Copiar enlace
        </button>
        {isAdmin && (
          <button className="ghost" style={{ marginTop: "8px" }} onClick={() => navigator.clipboard.writeText(room.adminUrl)}>
            Copiar enlace de anfitrión
          </button>
        )}
      </div>

      <div className="card">
        <h3>Jugadores ({room.players?.length || 0})</h3>
        <ul className="players">
          {room.players?.map((p: any) => (
            <li key={p.id} className={!p.connected ? "off" : ""}>
              <span>{p.name} {p.isAdmin && <span className="tag admin">ANFITRIÓN</span>}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}