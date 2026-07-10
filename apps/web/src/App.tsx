import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { LobbyScreen } from "./screens/Lobby";
import { PlayerScreen } from "./screens/Player";
import { LandingScreen } from "./screens/Landing";

const socket = io("http://localhost:3002");

export default function App() {
  const [view, setView] = useState<"landing" | "lobby" | "player" | "meeting" | "results">("landing");
  const [code, setCode] = useState<string>("");
  const [sessionToken, setSessionToken] = useState<string>("");
  const [playerState, setPlayerState] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("au_session");
    
    if (stored) {
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
    return <LandingScreen 
      isJoin={!!code} 
      code={code}
      onJoin={(name) => joinRoom(name, code)}
      onCreate={createRoom}
      onShowJoin={() => setCode("")}
    />;
  }

  if (view === "lobby") {
    return <LobbyScreen socket={socket} code={code} />;
  }

  if (view === "player") {
    return <PlayerScreen state={playerState} socket={socket} code={code} sessionToken={sessionToken} />;
  }

  return <div>Screen not implemented</div>;
}