import { Module } from "@nestjs/common";
import { TimerService } from "./timer.service";
import { RoomModule } from "../room/room.module";

@Module({
  imports: [RoomModule],
  providers: [TimerService],
})
export class TimerModule {}