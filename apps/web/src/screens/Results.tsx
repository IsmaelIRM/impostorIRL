import React from "react";

interface ResultsScreenProps {
  winner: any;
  room: any;
  socket: any;
  code: string;
  adminToken: string | null;
}

export function ResultsScreen({ winner, room, socket, code, adminToken }: ResultsScreenProps) {
  const teamName = winner?.team === "CREW" ? "TRIPULACIÓN" : "IMPOSTORES";
  const cls = winner?.team === "CREW" ? "crew" : "impostor";
  
  const handleNewGame = () => {
    if (adminToken && confirm("¿Empezar una nueva partida con los mismos jugadores?")) {
      socket.emit("admin:newgame", { code, adminToken });
    }
  };

  return (
    <div>
      <h1>Fin de la partida</h1>
      <div className={"banner " + cls}>🏆 Gana: {teamName}</div>
      <div className="card">
        <h3>Resultado</h3>
        <ul className="players">
          {room?.players?.map((p: any) => (
            <li key={p.id} className={!p.alive ? "dead" : ""}>
              <span>{p.name} {p.role === "IMPOSTOR" && <span className="tag admin">IMPOSTOR</span>}</span>
              <span className="tag">–</span>
            </li>
          ))}
        </ul>
      </div>
      {adminToken && (
        <div className="card admin-panel">
          <h3>⚙️ Anfitrión</h3>
          <p className="tiny">Verifica las tareas completadas en persona si hace falta.</p>
          <button className="warn" onClick={handleNewGame}>↻ Nueva partida (mismos jugadores)</button>
        </div>
      )}
      <button className="ghost" onClick={() => {
        localStorage.removeItem("au_session");
        window.location.href = "/";
      }}>Salir</button>
    </div>
  );
}