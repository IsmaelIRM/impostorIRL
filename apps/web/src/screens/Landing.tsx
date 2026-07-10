import React, { useState, useRef, useEffect } from "react";

interface LandingScreenProps {
  isJoin: boolean;
  code: string;
  onJoin: (name: string) => void;
  onCreate: (name: string) => void;
  onShowJoin: () => void;
}

export function LandingScreen({ isJoin, code, onJoin, onCreate, onShowJoin }: LandingScreenProps) {
  const [name, setName] = useState("");
  const [inputCode, setInputCode] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  if (isJoin) {
    return (
      <div>
        <h1>Among Us 🚀</h1>
        <div className="code-badge">{code}</div>
        <p className="sub">Escribe tu nombre para entrar</p>
        <div className="card">
          <label htmlFor="join-name">Tu nombre</label>
          <input
            id="join-name"
            maxLength={24}
            placeholder="Tu nombre"
            value={name}
            ref={nameRef}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && onJoin(name)}
          />
          <button id="btn-join" className="crew" onClick={() => onJoin(name)} disabled={!name.trim()}>
            Entrar a la partida
          </button>
        </div>
        <button className="ghost" onClick={() => onShowJoin()}>
          ← Otra sala
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>Among Us 🚀</h1>
      <p className="sub">En la vida real</p>
      <div className="card">
        <label htmlFor="join-name">Tu nombre</label>
        <input
          id="join-name"
          maxLength={24}
          placeholder="Tu nombre"
          value={name}
          ref={nameRef}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && onCreate(name)}
        />
        <button id="btn-create" className="warn" onClick={() => onCreate(name)} disabled={!name.trim()}>
          Crear partida (serás el anfitrión y también jugarás)
        </button>
      </div>
      <div className="card">
        <label htmlFor="join-code">Código de la sala</label>
        <input
          id="join-code"
          maxLength={6}
          placeholder="Ej. 7F3KQ"
          style={{ textTransform: "uppercase" }}
          value={inputCode}
          onChange={(e) => setInputCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && inputCode && name.trim() && onJoin(name)}
        />
        <button id="btn-join" className="crew" onClick={() => onJoin(name)} disabled={!inputCode || !name.trim()}>
          Unirse
        </button>
      </div>
    </div>
  );
}