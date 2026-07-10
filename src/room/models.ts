import { ObjectType, Field, ID, registerEnumType } from "@nestjs/graphql";

export enum Role {
  CREW = "CREW",
  IMPOSTOR = "IMPOSTOR",
}

export enum MissionStatus {
  PENDING = "PENDING",
  DONE = "DONE",
}

export enum RoomStatus {
  LOBBY = "LOBBY",
  RUNNING = "RUNNING",
  MEETING = "MEETING",
  ENDED = "ENDED",
}

registerEnumType(Role, { name: "Role" });
registerEnumType(MissionStatus, { name: "MissionStatus" });
registerEnumType(RoomStatus, { name: "RoomStatus" });

@ObjectType()
export class Mission {
  @Field(() => ID) id: string;
  @Field() missionId: string;
  @Field({ nullable: true }) zone?: number;
  @Field({ nullable: true }) description?: string;
  @Field(() => String, { nullable: true }) config?: string;
  @Field(() => String, { nullable: true }) assigned?: string;
  @Field(() => MissionStatus) status: MissionStatus;
  @Field() isSabotage: boolean;
  @Field() endsGame: boolean;
  @Field() weight: number;
}

@ObjectType()
export class Player {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field() isAdmin: boolean;
  @Field() sessionToken: string;
  @Field(() => String, { nullable: true }) socketId?: string;
  @Field() connected: boolean;
  @Field() alive: boolean;
  @Field(() => Role, { nullable: true }) role?: Role;
  @Field({ nullable: true }) cardId?: number;
  @Field(() => [Mission]) missions: Mission[];
}

@ObjectType()
export class Room {
  @Field() code: string;
  @Field(() => RoomStatus) status: RoomStatus;
  @Field(() => String, { nullable: true }) templateId?: string;
  @Field(() => [Mission]) missions: Mission[];
  @Field(() => [Player]) players: Player[];
}

@ObjectType()
export class Template {
  @Field() id: string;
  @Field() name: string;
  @Field() numImpostors: number;
  @Field() meetingSec: number;
  @Field() initialKillCooldownSec: number;
  @Field() killCooldownSec: number;
  @Field() timeLimitSec: number;
  @Field() sabotageCooldownSec: number;
  @Field() missionPointsTarget: number;
  @Field(() => String, { nullable: true }) mapImageUrl?: string;
  @Field(() => [String]) sabotages: string[];
  @Field(() => [MissionTemplateInput]) missions: MissionTemplateInput[];
}

@ObjectType()
export class MissionTemplateInput {
  @Field() missionId: string;
  @Field({ nullable: true }) zone?: number;
  @Field({ nullable: true }) weight?: number;
  @Field(() => String, { nullable: true }) config?: string;
  @Field(() => String, { nullable: true }) metadata?: string;
}