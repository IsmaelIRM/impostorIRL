import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { RoomService } from "../room/room.service";

@Injectable()
export class TimerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TimerService.name);
  private interval: any;

  constructor(private roomService: RoomService) {}

  onModuleInit() {
    this.interval = setInterval(() => {
      this.checkTimeLimits();
    }, 30000);
  }

  onModuleDestroy() {
    if (this.interval) clearInterval(this.interval);
  }

  private checkTimeLimits() {
    // Implementation for checking room time limits
    // Would iterate rooms and check timeLimitEndsAt
  }
}