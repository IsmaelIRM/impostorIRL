import { Module } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/graphql";
import { MissionModule } from "../../../src/mission/mission.module";
import { RoomModule } from "../../../src/room/room.module";
import { GatewayModule } from "../../../src/gateway/gateway.module";
import { TimerModule } from "../../../src/timer/timer.module";

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      cors: { origin: "*", credentials: true },
      autoSchemaFile: true,
      installSubscriptionHandlers: true,
    }),
    MissionModule,
    RoomModule,
    GatewayModule,
    TimerModule,
  ],
})
export class AppModule {}