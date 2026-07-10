import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { MissionLoader } from "./loader";
import { MissionResolver } from "./resolver";
import { ModuleUploadController } from "./module-upload.controller";

@Module({
  imports: [MulterModule.register({})],
  providers: [MissionLoader, MissionResolver],
  controllers: [ModuleUploadController],
  exports: [MissionLoader],
})
export class MissionModule {}