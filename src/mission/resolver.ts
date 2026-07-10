import { Resolver, Query } from "@nestjs/graphql";
import { MissionLoader } from "./loader";
import { MissionMetadata } from "./types";

@Resolver(() => MissionMetadata)
export class MissionResolver {
  constructor(private loader: MissionLoader) {}

  @Query(() => [MissionMetadata])
  missions(): MissionMetadata[] {
    return this.loader.list();
  }
}