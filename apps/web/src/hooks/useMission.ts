import { useQuery, gql } from "@apollo/client";
import { MissionMetadata } from "../../../src/mission/types";

const MISSIONS_QUERY = gql`
  query GetMissions {
    missions {
      id
      name
      isInteractive
      scope
      endsGame
      weight
      version
      apiVersion
      description
      schema
    }
  }
`;

export function useMissions() {
  const { data, loading, error, refetch } = useQuery(MISSIONS_QUERY);
  return {
    missions: data?.missions || [],
    loading,
    error,
    refetch,
  };
}

export function useMission(missionId: string) {
  const { missions } = useMissions();
  return missions.find((m: MissionMetadata) => m.id === missionId);
}