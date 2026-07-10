import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { RoomService } from "./room.service";

@Resolver()
export class RoomResolver {
  constructor(private roomService: RoomService) {}

  @Query(() => String, { nullable: true })
  room(@Args("code") code: string): string | null {
    const room = this.roomService.getRoom(code);
    if (!room) return null;
    return JSON.stringify(Array.from(room.players.values()));
  }

  @Query(() => String)
  templates(): string {
    return JSON.stringify([{ id: "default", name: "Default Game", numImpostors: 1 }]);
  }

  @Mutation(() => String)
  createRoom(@Args("name") name: string): string {
    const room = this.roomService.createRoom(name);
    return JSON.stringify({ code: room.code });
  }
}