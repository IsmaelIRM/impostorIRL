import { Resolver, Query, Mutation, Args, Subscription } from "@nestjs/graphql";
import { RoomService } from "./room.service";
import { Room, Template, Player } from "./models";

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
    // Load from src/templates/*.json
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