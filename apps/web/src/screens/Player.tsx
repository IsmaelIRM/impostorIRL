import React, { useState, useEffect } from "react";

interface PlayerScreenProps {
  state: any;
  socket: any;
  code: string;
  sessionToken: string;
}

export function PlayerScreen({ state, socket, code, sessionToken }: PlayerScreenProps) {
  const [myState, setMyState] = useState(state);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    socket.on("room:state", setMyState);
    return () => socket.off("room:state", setMyState);
  }, []);

  useEffect(() => {
    if (myState?.meeting?.endsAt) {
      const timer = setInterval(() => {
        setTimeLeft(Math.max(0, myState.meeting.endsAt - Date.now()));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [myState?.meeting?.endsAt]);

  const toggleTask = (missionId: string) => {
    socket.emit("task:toggle", { code, sessionToken, missionId });
  };

  if (!myState) return <div className="loading">Cargando...</div>;

  // Role reveal
  if (myState.role && !localStorage.getItem("au_role_shown")) {
    localStorage.setItem("au_role_shown", "1");
  }

  return (
    <div>
      <h1>Misión activa</h1>
      <div className="banner" style={{ background: myState.role === "IMPOSTOR" ? "var(--impostor)" : "var(--crew)" }}>
        {myState.role === "IMPOSTOR" ? "IMPOSTOR" : "TRIPULANTE"}
      </div>

      <div className="card">
        <h3>Tus misiones</h3>
        {myState.missions?.map((m: any) => (
          <div key={m.id} className={"mission " + m.status.toLowerCase()}>
            <div className="title">{m.name}</div>
            <div className="desc">{m.desc}</div>
            <button onClick={() => toggleTask(m.missionId)} disabled={!myState.alive}>
              {m.status === "DONE" ? "Desmarcar" : "Completar"}
            </button>
          </div>
        ))}
      </div>

      {myState.meeting && (
        <div className="card">
          <h3>Votación en curso</h3>
          <div className="countdown">{Math.floor(timeLeft / 1000)}s</div>
          <p>Elige a un jugador o salta</p>
        </div>
      )}
    </div>
  );
}