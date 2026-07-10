import { Injectable } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { Room, Player, Mission, Template } from "./types";

@Injectable()
export class RoomService {
  private rooms = new Map<string, Room>();

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
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  addPlayer(room: Room, name: string, isAdmin: boolean): Player {
    const player: Player = {
      id: uuidv4(),
      name: name.slice(0, 24),
      sessionToken: uuidv4(),
      connected: true,
      alive: true,
      role: null,
      isAdmin,
      killCooldownUntil: 0,
      missions: [],
    };
    room.players.set(player.id, player);
    return player;
  }

  private generateCode(): string {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
  }
}