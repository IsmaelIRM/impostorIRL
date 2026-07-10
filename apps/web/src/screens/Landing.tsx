import React, { useState } from "react";

interface LandingScreenProps {
  isJoin: boolean;
  code: string;
  onJoin: (name: string) => void;
  onCreate: (name: string) => void;
  onShowJoin: () => void;
}

export function LandingScreen({ isJoin, code, onJoin, onCreate, onShowJoin }: LandingScreenProps) {
  const [name, setName] = useState("");

  if (isJoin) {
    return (
      <div style={{ padding: "20px" }}>
        <h1>Among Us Real Life</h1>
        <div className="card">
          <h3>Unirse a sala {code}</h3>
          <input
            placeholder="Tu nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button onClick={() => onJoin(name)} disabled={!name.trim()}>
            Unirse
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Among Us Real Life</h1>
      <div className="card">
        <h3>Crear sala</h3>
        <input
          placeholder="Tu nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button onClick={() => onCreate(name)} disabled={!name.trim()}>
          Crear
        </button>
        <button className="ghost" onClick={onShowJoin}>
          Unirse a sala existente
        </button>
      </div>
    </div>
  );
}