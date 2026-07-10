// Win-condition checks. All counts use `alive` only.
// Ghosts (voted-out crew / killed crew) and voted-out impostors are alive=false
// and therefore do NOT count toward the alive totals.

function crewmatePlayers(room) {
  return Array.from(room.players.values()).filter((p) => p.role === "CREW");
}

function impostorPlayers(room) {
  return Array.from(room.players.values()).filter((p) => p.role === "IMPOSTOR");
}

function aliveCrew(room) {
  return crewmatePlayers(room).filter((p) => p.alive);
}

function aliveImpostors(room) {
  return impostorPlayers(room).filter((p) => p.alive);
}

// Crew wins if every non-impostor (including ghosts) has every mission DONE.
function allCrewTasksDone(room) {
  const crew = crewmatePlayers(room);
  if (crew.length === 0) return false;
  return crew.every((p) =>
    p.missions.every((m) => m.status === "DONE")
  );
}

// Crew wins if every impostor has been voted out (alive=false).
function allImpostorsVotedOut(room) {
  const imps = impostorPlayers(room);
  if (imps.length === 0) return false;
  return imps.every((p) => !p.alive);
}

// Impostor wins if sabotage times out
function sabotageTimeout(room) {
  if (room.activeSabotage && room.activeSabotage.endsAt && Date.now() >= room.activeSabotage.endsAt) {
    return { team: "IMPOSTOR", reason: "sabotage" };
  }
  return null;
}

// Returns { team, reason } or null if the game continues.
function checkWin(room) {
  if (room.status === "ENDED") return null;

  if (allCrewTasksDone(room)) {
    return { team: "CREW", reason: "tasks" };
  }
  if (allImpostorsVotedOut(room)) {
    return { team: "CREW", reason: "voted_out" };
  }
  if (aliveImpostors(room).length >= aliveCrew(room).length) {
    return { team: "IMPOSTOR", reason: "equality" };
  }
  if (room.timeLimitSec && room.timeLimitEndsAt && Date.now() >= room.timeLimitEndsAt) {
    return { team: "IMPOSTOR", reason: "timeout" };
  }
  if (room.activeSabotage) {
    return sabotageTimeout(room);
  }
  return null;
}

module.exports = {
  crewmatePlayers,
  impostorPlayers,
  aliveCrew,
  aliveImpostors,
  allCrewTasksDone,
  allImpostorsVotedOut,
  checkWin,
};
