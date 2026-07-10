import { Resolver, Query, Mutation, Args, Subscription } from "@nestjs/graphql";
import { RoomService } from "./room.service";
import { Room, Template, Player, RoomStatus } from "./models";
import { PubSub } from "graphql-subscriptions";

const pubSub = new PubSub();

@Resolver(() => Room)
export class RoomResolver {
  constructor(private roomService: RoomService) {}

  @Query(() => Room, { nullable: true })
  room(@Args("code") code: string): Room | undefined {
    const room = this.roomService.getRoom(code);
    if (!room) return undefined;
    return this.toRoomDto(room);
  }

  @Query(() => [Template])
  templates(): Template[] {
    return [
      {
        id: "default",
        name: "Default Game",
        numImpostors: 1,
        meetingSec: 60,
        initialKillCooldownSec: 30,
        killCooldownSec: 45,
        timeLimitSec: 600,
        sabotageCooldownSec: 120,
        missionPointsTarget: 10,
        sabotages: ["NFC"],
        missions: [{ missionId: "draw", weight: 1 }],
      },
    ];
  }

  @Mutation(() => Room)
  createRoom(@Args("name") name: string): Room {
    const room = this.roomService.createRoom(name);
    return this.toRoomDto(room);
  }

  @Mutation(() => Room)
  joinRoom(@Args("code") code: string, @Args("name") name: string): Room {
    const room = this.roomService.getRoom(code);
    if (!room) throw new Error("Room not found");
    this.roomService.addPlayer(room, name, false);
    return this.toRoomDto(room);
  }

  @Mutation(() => Room)
  adminStart(@Args("code") code: string, @Args("adminToken") adminToken: string): Room {
    const room = this.roomService.getRoom(code);
    if (!room || room.adminToken !== adminToken) throw new Error("Unauthorized");
    if (room.status !== "LOBBY") throw new Error("Game already started");
    this.roomService.assignRoles(room);
    room.status = "RUNNING";
    room.startedAt = Date.now();
    pubSub.publish(`roomUpdated_${code}`, { roomUpdated: this.toRoomDto(room) });
    return this.toRoomDto(room);
  }

  @Subscription(() => Room, { name: "roomUpdated" })
  roomUpdated(@Args("code") code: string) {
    return pubSub.asyncIterator(`roomUpdated_${code}`);
  }

  private toRoomDto(room: any): Room {
    return {
      code: room.code,
      status: room.status,
      missions: room.missions || [],
      players: Array.from(room.players?.values() || []).map((p: any) => this.toPlayerDto(p)),
    } as Room;
  }

  private toPlayerDto(player: any): Player {
    return {
      id: player.id,
      name: player.name,
      isAdmin: player.isAdmin,
      sessionToken: player.sessionToken,
      connected: player.connected,
      alive: player.alive,
      role: player.role,
      cardId: player.cardId,
      missions: player.missions || [],
    } as Player;
  }
}