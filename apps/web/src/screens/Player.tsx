import React, { useState, useEffect } from "react";

interface PlayerScreenProps {
  state: any;
  socket: any;
  code: string;
  sessionToken: string;
}

export function PlayerScreen({ state, socket, code, sessionToken }: PlayerScreenProps) {
  const [myState, setMyState] = useState(state);

  useEffect(() => {
    socket.on("room:state", setMyState);
    socket.on("lobby:update", (data: any) => {
      setMyState((prev: any) => ({ ...prev, room: data }));
    });
    return () => {
      socket.off("room:state", setMyState);
      socket.off("lobby:update");
    };
  }, []);

  useEffect(() => {
    setMyState(state);
  }, [state]);

  if (!myState) return <div className="loading">Cargando...</div>;

  // Role reveal
  if (myState.role && !localStorage.getItem("au_role_shown")) {
    localStorage.setItem("au_role_shown", "1");
  }

  const toggleTask = (missionId: string) => {
    socket.emit("task:toggle", { code, sessionToken, missionId });
  };

  const killPlayer = (targetId: string) => {
    socket.emit("impostor:kill", { code, sessionToken, targetPlayerId: targetId });
  };

  const sabotagePlayer = (missionId: string, targetId: string) => {
    socket.emit("impostor:sabotage", { code, sessionToken, missionId, targetId });
  };

  // Impostor view - show kill/sabotage buttons
  const impostorView = () => (
    <div className="card">
      <h3>Impostor Options</h3>
      {myState.room?.players?.filter((p: any) => p.alive && p.role !== "IMPOSTOR").map((p: any) => (
        <div key={p.id}>
          <span>{p.name}</span>
          <button className="impostor" onClick={() => killPlayer(p.id)}>Kill</button>
          <button className="impostor" onClick={() => sabotagePlayer("sabotage-nfc", p.id)}>Sabotage</button>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <h1>Misión activa</h1>
      <div className="banner" style={{ background: myState.role === "IMPOSTOR" ? "var(--impostor)" : "var(--crew)" }}>
        {myState.role === "IMPOSTOR" ? "IMPOSTOR" : "TRIPULANTE"}
      </div>

      {myState.activeSabotage && (
        <div className="card" style={{ borderColor: "var(--impostor)" }}>
          <h3>⚠️ SABOTAGE ACTIVO</h3>
          <p>{myState.activeSabotage.missionName || myState.activeSabotage.missionId}</p>
        </div>
      )}

      <div className="card">
        <h3>Tus misiones</h3>
        {myState.missions?.map((m: any) => (
          <div key={m.id} className={"mission " + m.status?.toLowerCase()}>
            <div className="title">{m.name}</div>
            <div className="desc">{m.desc}</div>
            <button onClick={() => toggleTask(m.missionId)} disabled={!myState.alive || myState.meeting}>
              {m.status === "DONE" ? "Desmarcar" : "Completar"}
            </button>
          </div>
        ))}
      </div>

      {myState.role === "IMPOSTOR" && myState.alive && impostorView()}

      {myState.meeting && (
        <div className="card">
          <h3>Votación en curso</h3>
          <div className="countdown">{Math.floor(myState.meetingTimeLeft / 1000)}s</div>
          <p>Elige a un jugador o salta</p>
        </div>
      )}
    </div>
  );
}