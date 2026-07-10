import { Module } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/graphql";
import { MissionModule } from "../../src/mission/mission.module";
import { RoomModule } from "../../src/room/room.module";

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      cors: { origin: "*", credentials: true },
      autoSchemaFile: true,
    }),
    MissionModule,
    RoomModule,
  ],
})
export class AppModule {}