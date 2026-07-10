import { Resolver, Query, Mutation, Args, Subscription } from "@nestjs/graphql";
import { RoomService } from "./room.service";
import { Room, Template, Player } from "./models";
import { PubSub } from "graphql-subscriptions";

const pubSub = new PubSub();

@Resolver()
export class RoomResolver {
  constructor(private roomService: RoomService) {}

  @Query(() => String, { nullable: true })
  room(@Args("code") code: string): string | null {
    const room = this.roomService.getRoom(code);
    if (!room) return null;
    return JSON.stringify(this.toRoomDto(room));
  }

  @Query(() => String)
  templates(): string {
    const templates = [
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
    return JSON.stringify(templates);
  }

  @Mutation(() => String)
  createRoom(@Args("name") name: string): string {
    const room = this.roomService.createRoom(name);
    return JSON.stringify(this.toRoomDto(room));
  }

  private toRoomDto(room: any): any {
    return {
      code: room.code,
      status: room.status,
      missions: room.missions || [],
      players: Array.from(room.players?.values() || []),
    };
  }
}