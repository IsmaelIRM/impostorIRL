import { Module } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/graphql";
import { MissionModule } from "../../src/mission/mission.module";
import { MissionResolver } from "../../src/mission/resolver";

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      cors: { origin: "*", credentials: true },
      autoSchemaFile: true,
    }),
    MissionModule,
  ],
  providers: [MissionResolver],
})
export class AppModule {}