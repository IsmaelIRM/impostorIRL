export interface MissionMetadata {
  id: string;
  name: string;
  isInteractive: boolean;
  scope: "individual" | "global";
  endsGame: boolean;
  weight: number;
  version: string;
  apiVersion: string;
  description?: string;
  schema?: Record<string, any>;
}

export interface AssignedMission {
  playerId: string;
  targetId?: string | null;
  deadline?: number;
  uuid: string;
}

export interface Player {
  id: string;
  name: string;
  sessionToken: string;
  socketId?: string;
  connected: boolean;
  alive: boolean;
  role: "CREW" | "IMPOSTOR";
  isAdmin: boolean;
  cardId?: number;
  killCooldownUntil: number;
  initialKillCooldownUntil?: number;
  missions: Mission[];
}

export interface Mission {
  id: string;
  missionId: string;
  zone?: number;
  description?: string;
  config?: Record<string, any>;
  assigned?: Record<string, any>;
  status: "PENDING" | "DONE";
  isSabotage: boolean;
  endsGame: boolean;
  weight: number;
}

export interface Template {
  id: string;
  name: string;
  numImpostors: number;
  meetingSec: number;
  initialKillCooldownSec: number;
  killCooldownSec: number;
  timeLimitSec: number;
  sabotageCooldownSec: number;
  missionPointsTarget: number;
  mapImageUrl?: string;
  sabotages: string[];
  missions: MissionTemplateInput[];
}

export interface MissionTemplateInput {
  missionId: string;
  zone?: number;
  weight?: number;
  config?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface MissionDefinition extends MissionMetadata {
  assign?(player: Player, mission: Mission): AssignedMission;
  renderPopup?(player: Player, assigned: AssignedMission, room: Room): string;
  validate?(data: any): boolean;
  onProgress?(ctx: SabotageContext, room: Room, player: Player, data: any): SabotageState;
  onActivate?(ctx: SabotageContext, room: Room, mission: Mission): SabotageState;
  onWin?(ctx: MissionContext, room: Room, winner: "CREW" | "IMPOSTOR"): string;
}

export interface Room {
  code: string;
  status: "LOBBY" | "RUNNING" | "MEETING" | "ENDED";
  templateId?: string;
  players: Map<string, Player>;
  missions: Mission[];
  activeSabotages: ActiveSabotage[];
  meeting?: Meeting;
  timeLimitSec?: number;
  timeLimitEndsAt?: number;
}

export interface ActiveSabotage {
  missionId: string;
  missionType: string;
  targetId?: string;
  activatedAt: number;
  endsAt?: number;
  progress?: Record<string, any>;
}

export interface Meeting {
  id: string;
  startedAt: number;
  endsAt?: number;
  votes: Map<string, string | null>;
  phase: "gather" | "voting";
}

export interface SabotageContext {
  cooldowns: Map<string, number>;
  resolutions: Map<string, any>;
}

export interface MissionContext {
  roomCode: string;
  redis: any;
}

export interface SabotageState {
  active: boolean;
  endsAt?: number;
  progress?: Record<string, any>;
}