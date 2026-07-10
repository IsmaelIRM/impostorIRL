import React from "react";

interface MeetingScreenProps {
  state: any;
  socket: any;
  code: string;
  sessionToken: string;
}

export function MeetingScreen({ state, socket, code, sessionToken }: MeetingScreenProps) {
  return (
    <div>
      <h1>Votación</h1>
      <div className="card">
        <h3>Elige a un jugador</h3>
        <p className="sub">Para expulsar o salta (✕)</p>
      </div>
    </div>
  );
}