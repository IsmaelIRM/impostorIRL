import React, { useState } from "react";

interface MeetingScreenProps {
  state: any;
  socket: any;
  code: string;
  sessionToken: string;
}

export function MeetingScreen({ state, socket, code, sessionToken }: MeetingScreenProps) {
  const [alivePlayers, setAlivePlayers] = useState<string[]>([]);

  React.useEffect(() => {
    if (state?.meetingPlayers) {
      setAlivePlayers(state.meetingPlayers.map((p: any) => p.id));
    }
  }, [state]);

  const vote = (targetId: string | null) => {
    socket.emit("vote", { code, sessionToken, targetId });
  };

  if (!state) return <div className="loading">Cargando...</div>;

  return (
    <div>
      <h1>Votación</h1>
      <div className="card">
        <h3>Jugadores vivos</h3>
        <div className="players">
          {state.meetingPlayers?.map((p: any) => (
            <button key={p.id} onClick={() => vote(p.id)} disabled={!alivePlayers.includes(p.id)}>
              {p.name} {p.isAdmin && <span className="tag admin">ANFITRIÓN</span>}
            </button>
          ))}
          <button onClick={() => vote(null)} style={{ marginLeft: "8px" }}>✕ Salta</button>
        </div>
      </div>
    </div>
  );
}