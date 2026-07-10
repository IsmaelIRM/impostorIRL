import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

interface Room {
  code: string;
  status: string;
  players: Player[];
  missions: Mission[];
}

interface Player {
  id: string;
  name: string;
  isAdmin: boolean;
  alive: boolean;
  role: string | null;
  sessionToken: string;
}

interface Mission {
  id: string;
  missionId: string;
  status: string;
  zone?: number;
}

export default function App() {
  const [room, setRoom] = useState<Room | null>(null);
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [name, setName] = useState("");
  const [showRole, setShowRole] = useState(false);

  const socket = io();

  useEffect(() => {
    socket.on("connect", () => {
      const stored = localStorage.getItem("au_session");
      if (stored) {
        const session = JSON.parse(stored);
        socket.emit("room:join", session, (res: any) => {
          if (!res.error) {
            setMyPlayer({
              id: res.playerId,
              name: "",
              isAdmin: res.isAdmin,
              alive: true,
              role: null,
              sessionToken: res.sessionToken,
            });
            setRoom(res.room);
          }
        });
      }
    });

    socket.on("room:state", (data: any) => {
      setRoom(data);
    });
  }, []);

  const createRoom = () => {
    socket.emit("room:create", { hostName: name }, (res: any) => {
      localStorage.setItem("au_session", JSON.stringify({
        code: res.code,
        sessionToken: res.sessionToken
      }));
      setMyPlayer({
        id: res.playerId,
        name,
        isAdmin: true,
        alive: true,
        role: null,
        sessionToken: res.sessionToken,
      });
      setRoom({
        code: res.code,
        status: "LOBBY",
        players: [],
        missions: [],
      });
    });
  };

  if (!room) {
    return (
      <div style={{ padding: "20px" }}>
        <h1>Among Us Real Life</h1>
        <div className="card">
          <input
            placeholder="Tu nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button onClick={createRoom} disabled={!name.trim()}>
            Crear sala
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px" }}>
      <h1>Sala: {room.code}</h1>
      <div className="card">
        <h3>Jugadores</h3>
        <ul className="players">
          {room.players?.map((p) => (
            <li key={p.id} className={!p.alive ? "dead" : ""} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "var(--card2)", borderRadius: "10px", marginBottom: "8px" }}>
              <span>{p.name} {p.isAdmin && <span className="tag admin" style={{ background: "var(--warn)", color: "#4a3500", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "999px" }}>HOST</span>}</span>
              <span className="tag" style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "999px", background: "var(--line)", color: "var(--muted)"}}>{p.role || "?"}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}