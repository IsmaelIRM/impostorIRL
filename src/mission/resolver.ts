import { Resolver, Query } from "@nestjs/graphql";
import { MissionLoader } from "./loader";

@Resolver()
export class MissionResolver {
  constructor(private loader: MissionLoader) {}

  @Query(() => String)
  missions(): string {
    const list = this.loader.list();
    return JSON.stringify(list);
  }
}