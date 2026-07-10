import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { LandingScreen } from "./screens/Landing";
import { LobbyScreen } from "./screens/Lobby";
import { PlayerScreen } from "./screens/Player";
import { MeetingScreen } from "./screens/Meeting";
import { ResultsScreen } from "./screens/Results";

const socket = io("http://localhost:3002");

interface Context {
  code: string | null;
  sessionToken: string | null;
  playerId: string | null;
  isAdmin: boolean;
  adminToken: string | null;
  joinUrl: string;
  adminUrl: string;
  room: any;
  me: any;
  progress: Record<string, any>;
  meetingPlayers: any;
  meetingEndsAt: number | null;
  meetingPhase: string | null;
  meetingVote: string | null;
  winner: any;
  lastName: string;
}

const initialCtx: Context = {
  code: null,
  sessionToken: null,
  playerId: null,
  isAdmin: false,
  adminToken: null,
  joinUrl: "",
  adminUrl: "",
  room: null,
  me: null,
  progress: {},
  meetingPlayers: null,
  meetingEndsAt: null,
  meetingPhase: null,
  meetingVote: null,
  winner: null,
  lastName: "",
};

export default function App() {
  const [ctx, setCtx] = useState<Context>(initialCtx);
  const [toasts, setToasts] = useState<string[]>([]);

  const toast = (msg: string) => {
    setToasts((prev) => [...prev.slice(-2), msg]);
    setTimeout(() => setToasts((prev) => prev.slice(1)), 2500);
  };

  useEffect(() => {
    // Restore token from localStorage
    if (ctx.code) {
      try {
        const t = localStorage.getItem("au_token_" + ctx.code);
        if (t && !ctx.sessionToken) {
          setCtx((c) => ({ ...c, sessionToken: t }));
        }
      } catch (e) {}
    }

    socket.on("connect", () => {
      if (ctx.code && ctx.sessionToken) {
        socket.emit("room:join", { code: ctx.code, sessionToken: ctx.sessionToken }, (ack: any) => {
          if (ack?.error) toast(ack.error);
          else if (ack) applyJoinAck(ack);
          render();
        });
      }
    });

    socket.on("lobby:update", (data: any) => {
      setCtx((c) => ({ ...c, room: data }));
    });

    socket.on("game:started", (data: any) => {
      setCtx((c) => ({ ...c, me: data }));
    });

    socket.on("room:state", (data: any) => {
      setCtx((c) => {
        const newCtx = { ...c, me: data };
        if (data.status && c.room) {
          c.room.status = data.status;
        }
        if (data.winner) {
          newCtx.winner = { team: data.winner, reason: data.winnerReason };
        }
        if (data.meeting && data.meeting.alivePlayers) {
          newCtx.meetingPlayers = data.meeting.alivePlayers;
          newCtx.meetingEndsAt = data.meeting.endsAt;
          newCtx.meetingPhase = data.meeting.phase;
          newCtx.meetingVote = data.meeting.voteCast;
        }
        return newCtx;
      });
    });

    socket.on("game:won", (data: any) => {
      setCtx((c) => ({ ...c, winner: { team: data.team, reason: data.reason } }));
    });

    socket.on("room:reset", () => {
      toast("La sala se reinició. Vuelve a unirte con el código.");
      setCtx((c) => ({ ...c, sessionToken: null, me: null, room: null }));
    });

    socket.on("player:kicked", (data: any) => {
      if (ctx.playerId === data.playerId) {
        toast("Has sido expulsado de la sala.");
        setCtx((c) => ({ ...c, sessionToken: null, me: null, room: null }));
      }
    });

    // Check URL for room code
    const m = window.location.pathname.match(/^\/r\/([A-Za-z0-9]{3,8})$/);
    if (m) {
      const url = new URL(window.location.href);
      const code = m[1].toUpperCase();
      const adminToken = url.searchParams.get("admin") || null;
      setCtx((c) => ({ 
        ...c, 
        code, 
        adminToken: adminToken || c.adminToken,
        isAdmin: !!adminToken 
      }));
    }
  }, []);

  const applyJoinAck = (ack: any) => {
    setCtx((c) => ({
      ...c,
      code: ack.code,
      sessionToken: ack.sessionToken || c.sessionToken,
      playerId: ack.playerId,
      joinUrl: ack.joinUrl,
      adminUrl: ack.adminUrl,
      isAdmin: ack.isAdmin || c.isAdmin,
      adminToken: ack.adminToken || c.adminToken,
    }));
    try {
      localStorage.setItem("au_token_" + ack.code, ack.sessionToken || ctx.sessionToken);
    } catch (e) {}
    
    // Update URL
    const url = new URL(window.location.href);
    url.pathname = "/r/" + ack.code;
    if (ack.isAdmin) url.searchParams.set("admin", ack.adminToken);
    else url.searchParams.delete("admin");
    window.history.replaceState({}, "", url.toString());
  };

  const createRoom = (hostName: string) => {
    socket.emit("room:create", { hostName }, (ack: any) => {
      if (ack?.error) return toast(ack.error);
      applyJoinAck(ack);
      render();
    });
  };

  const joinRoom = (code: string, name: string) => {
    socket.emit("room:join", { code: code.toUpperCase(), name }, (ack: any) => {
      if (ack?.error) return toast(ack.error);
      applyJoinAck(ack);
      render();
    });
  };

  const render = () => {
    // Forces re-render by updating a dummy state
  };

  // Determine route
  const getRoute = () => {
    if (!ctx.code) return "landing";
    if (ctx.room?.status === "ENDED") return "results";
    if (!ctx.sessionToken) return "landing";
    if (ctx.room?.status === "MEETING") return "meeting";
    if (ctx.room?.status === "LOBBY") return "lobby";
    return "player";
  };

  const route = getRoute();

  return (
    <div>
      {toasts.map((t, i) => (
        <div key={i} className="toast" style={{ display: "block" }}>{t}</div>
      ))}
      
      {route === "landing" && (
        <LandingScreen
          isJoin={!!ctx.code}
          code={ctx.code || ""}
          onJoin={(name) => ctx.code && joinRoom(ctx.code, name)}
          onCreate={createRoom}
          onShowJoin={() => setCtx((c) => ({ ...c, code: null }))}
        />
      )}
      
      {route === "lobby" && (
        <LobbyScreen socket={socket} code={ctx.code!} room={ctx.room} isAdmin={ctx.isAdmin} adminToken={ctx.adminToken!} />
      )}
      
      {route === "player" && (
        <PlayerScreen state={ctx.me} socket={socket} code={ctx.code!} sessionToken={ctx.sessionToken!} />
      )}
      
      {route === "meeting" && (
        <MeetingScreen state={ctx.me} socket={socket} code={ctx.code!} sessionToken={ctx.sessionToken!} />
      )}
      
      {route === "results" && (
        <ResultsScreen winner={ctx.winner} room={ctx.room} socket={socket} code={ctx.code!} adminToken={ctx.adminToken!} />
      )}
    </div>
  );
}