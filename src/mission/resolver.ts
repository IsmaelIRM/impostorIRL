import { Resolver, Query, ObjectType, Field } from "@nestjs/graphql";
import { MissionLoader } from "./loader";

@ObjectType()
class MissionMetadata {
  @Field() id: string;
  @Field() name: string;
  @Field() isInteractive: boolean;
  @Field() scope: string;
  @Field() endsGame: boolean;
  @Field() weight: number;
  @Field() version: string;
  @Field() apiVersion: string;
  @Field(() => String, { nullable: true }) description?: string;
  @Field(() => String, { nullable: true }) schema?: string;
}

@Resolver(() => MissionMetadata)
export class MissionResolver {
  constructor(private loader: MissionLoader) {}

  @Query(() => [MissionMetadata])
  missions(): MissionMetadata[] {
    const list = this.loader.list();
    return list.map((m) => ({ ...m, schema: m.schema ? JSON.stringify(m.schema) : null }));
  }
}