import { Injectable, Logger } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { Room, Player, Mission, Template } from "../mission/types";
import { Room as RoomModel, Mission as MissionModel } from "./models";
import { loadTemplate } from "../templates/loader";

@Injectable()
export class RoomService {
  private rooms = new Map<string, Room>();
  private readonly logger = new Logger(RoomService.name);

  createRoom(name: string, templateId?: string): Room {
    const code = this.generateCode();
    const adminToken = uuidv4();
    const room: Room = {
      code,
      status: "LOBBY",
      templateId: templateId || "default",
      players: new Map(),
      missions: [],
      activeSabotages: [],
    };
    room.adminToken = adminToken;
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  addPlayer(room: Room, name: string, isAdmin: boolean): Player {
    const player: Player = {
      id: uuidv4(),
      name: String(name || "").slice(0, 24),
      sessionToken: uuidv4(),
      connected: true,
      alive: true,
      role: null as any,
      isAdmin,
      killCooldownUntil: 0,
      missions: [],
    };
    room.players.set(player.id, player);
    return player;
  }

  assignRoles(room: Room): void {
    const alivePlayers = Array.from(room.players.values()).filter((p) => p.alive);
    const shuffled = [...alivePlayers].sort(() => Math.random() - 0.5);
    const template = loadTemplate(room.templateId);
    const impostorCount = template?.numImpostors || 1;
    
    shuffled.slice(0, impostorCount).forEach((p) => {
      p.role = "IMPOSTOR";
      if (template?.initialKillCooldownSec) {
        p.initialKillCooldownUntil = Date.now() + template.initialKillCooldownSec * 1000;
      }
    });
    shuffled.slice(impostorCount).forEach((p) => {
      p.role = "CREW";
    });
  }

  toggleTask(room: Room, missionId: string, playerId: string): Mission | null {
    const player = room.players.get(playerId);
    if (!player || !player.alive) return null;
    const mission = player.missions.find((m) => m.id === missionId);
    if (!mission) return null;
    mission.status = mission.status === "DONE" ? "PENDING" : "DONE";
    return mission;
  }

  checkWin(room: Room): { team: "CREW" | "IMPOSTOR"; reason: string } | null {
    const alivePlayers = Array.from(room.players.values()).filter((p) => p.alive);
    const aliveCrew = alivePlayers.filter((p) => p.role === "CREW");
    const aliveImpostors = alivePlayers.filter((p) => p.role === "IMPOSTOR");
    
    // All impostors eliminated
    if (aliveImpostors.length === 0 && aliveCrew.length > 0) {
      return { team: "CREW", reason: "allImpostorsEjected" };
    }
    
    // Impostors equal/greater than crew
    if (aliveImpostors.length >= aliveCrew.length) {
      return { team: "IMPOSTOR", reason: "equality" };
    }
    
    // All crew dead
    if (aliveCrew.length === 0) {
      return { team: "IMPOSTOR", reason: "allCrewDead" };
    }
    
    return null;
  }

  private generateCode(): string {
    let code = Math.random().toString(36).substring(2, 7).toUpperCase();
    while (this.rooms.has(code)) {
      code = Math.random().toString(36).substring(2, 7).toUpperCase();
    }
    return code;
  }
}