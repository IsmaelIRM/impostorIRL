import { Module } from "@nestjs/common";
import { MissionLoader } from "./loader";
import { MissionResolver } from "./resolver";
import { ModuleUploadController } from "./module-upload.controller";

@Module({
  providers: [MissionLoader, MissionResolver],
  controllers: [ModuleUploadController],
  exports: [MissionLoader],
})
export class MissionModule {}