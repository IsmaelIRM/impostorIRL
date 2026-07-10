import { Module } from "@nestjs/common";
import { MissionLoader } from "./loader";
import { MissionResolver } from "./resolver";

@Module({
  providers: [MissionLoader, MissionResolver],
  exports: [MissionLoader],
})
export class MissionModule {}