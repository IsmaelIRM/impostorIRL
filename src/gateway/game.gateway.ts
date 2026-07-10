import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { RoomService } from "../room/room.service";
import { Room } from "../room/models";

@WebSocketGateway({ cors: { origin: "*" } })
export class GameGateway {
  @WebSocketServer()
  server: Server;

  constructor(private roomService: RoomService) {}

  @SubscribeMessage("task:toggle")
  handleTaskToggle(
    @MessageBody() data: { code: string; missionId: string; sessionToken: string },
    @ConnectedSocket() client: Socket
  ) {
    const room = this.roomService.getRoom(data.code);
    if (!room) return;
    const mission = this.roomService.toggleTask(room, data.missionId, this.findPlayerId(room, data.sessionToken));
    if (mission) {
      const win = this.roomService.checkWin(room);
      if (win) {
        this.server.to(data.code).emit("game:won", win);
      }
    }
    this.server.to(data.code).emit("room:state", this.toRoomView(room));
  }

  @SubscribeMessage("impostor:kill")
  handleKill(
    @MessageBody() data: { code: string; targetPlayerId: string; sessionToken: string },
    @ConnectedSocket() client: Socket
  ) {
    const room = this.roomService.getRoom(data.code);
    if (!room) return;
    const killer = this.findPlayer(room, data.sessionToken);
    if (!killer || killer.role !== "IMPOSTOR" || !killer.alive) return;
    const victim = room.players.get(data.targetPlayerId);
    if (!victim || !victim.alive || victim.role === "IMPOSTOR") return;
    victim.alive = false;
    killer.killCooldownUntil = Date.now() + 45000;
    this.server.to(data.code).emit("player:killed", { victimId: victim.id, victimName: victim.name });
  }

  private findPlayer(room: Room, sessionToken: string) {
    return Array.from(room.players.values()).find((p) => p.sessionToken === sessionToken);
  }

  private findPlayerId(room: Room, sessionToken: string) {
    return Array.from(room.players.values()).find((p) => p.sessionToken === sessionToken)?.id;
  }

  private toRoomView(room: Room) {
    return {
      code: room.code,
      status: room.status,
      players: Array.from(room.players.values()),
      missions: room.missions,
    };
  }
}