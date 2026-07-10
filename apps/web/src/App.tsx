import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { LobbyScreen } from "./screens/Lobby";
import { PlayerScreen } from "./screens/Player";

const socket = io({ path: "/socket.io" });

export default function App() {
  const [view, setView] = useState<"landing" | "lobby" | "player" | "meeting" | "results">("landing");
  const [code, setCode] = useState<string>("");
  const [sessionToken, setSessionToken] = useState<string>("");
  const [playerState, setPlayerState] = useState<any>(null);

  useEffect(() => {
    const path = window.location.pathname;
    const stored = localStorage.getItem("au_session");
    
    if (path.startsWith("/r/")) {
      const urlCode = path.split("/")[2];
      if (urlCode) setCode(urlCode.toUpperCase());
      setView("landing");
    } else if (stored) {
      const session = JSON.parse(stored);
      setCode(session.code);
      setSessionToken(session.sessionToken);
      socket.emit("room:join", session, (res: any) => {
        if (!res.error) {
          setView(res.room?.status === "LOBBY" ? "lobby" : "player");
        }
      });
    }
  }, []);

  useEffect(() => {
    socket.on("room:state", setPlayerState);
    socket.on("game:started", setPlayerState);
    socket.on("room:reset", () => {
      localStorage.removeItem("au_session");
      setView("landing");
    });
    return () => {
      socket.off("room:state");
      socket.off("game:started");
    };
  }, []);

  const createRoom = (name: string) => {
    socket.emit("room:create", { hostName: name }, (res: any) => {
      localStorage.setItem("au_session", JSON.stringify({
        code: res.code,
        sessionToken: res.sessionToken
      }));
      setCode(res.code);
      setSessionToken(res.sessionToken);
      setView("lobby");
    });
  };

  const joinRoom = (name: string, roomCode: string) => {
    socket.emit("room:join", { code: roomCode.toUpperCase(), name }, (res: any) => {
      if (!res.error) {
        localStorage.setItem("au_session", JSON.stringify({
          code: roomCode.toUpperCase(),
          sessionToken: res.sessionToken
        }));
        setCode(roomCode.toUpperCase());
        setSessionToken(res.sessionToken);
        setView("lobby");
      }
    });
  };

  if (view === "landing") {
    const isJoin = code && sessionToken !== "";
    const [name, setName] = useState("");

    return (
      <div style={{ padding: "20px" }}>
        <h1>Among Us Real Life</h1>
        {isJoin ? (
          <div className="card">
            <h3>Unirse a sala {code}</h3>
            <input
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button onClick={() => joinRoom(name, code)} disabled={!name.trim()}>
              Unirse
            </button>
          </div>
        ) : (
          <div className="card">
            <h3>Crear sala</h3>
            <input
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button onClick={() => createRoom(name)} disabled={!name.trim()}>
              Crear
            </button>
            <button className="ghost" onClick={() => document.getElementById("join-modal")?.classList.remove("hidden")}>
              Unirse a sala existente
            </button>
          </div>
        )}
        <div id="join-modal" className="overlay hidden">
          <div className="card">
            <h3>Código de sala</h3>
            <input placeholder="ABC123" id="join-code-input" onChange={(e) => setCode(e.target.value.toUpperCase())} />
            <button onClick={() => {}} id="join-confirm-btn">Listo</button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "lobby") {
    return <LobbyScreen socket={socket} code={code} />;
  }

  if (view === "player") {
    return <PlayerScreen state={playerState} socket={socket} code={code} sessionToken={sessionToken} />;
  }

  return <div>Screen not implemented</div>;
}