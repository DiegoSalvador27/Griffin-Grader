import { db } from '../db';
import { newId } from '../../lib/ids';
import type { ID, Team, TeamMode, TeamSet } from '../types';

export async function latestTeamSet(sessionId: ID): Promise<TeamSet | undefined> {
  const rows = await db.teamSets.where('sessionId').equals(sessionId).toArray();
  return rows.sort((a, b) => b.createdAt - a.createdAt)[0];
}

export async function saveTeamSet(input: {
  sessionId: ID;
  classId: ID;
  mode: TeamMode;
  n: number;
  presentOnly: boolean;
  teams: Team[];
}): Promise<TeamSet> {
  const row: TeamSet = { id: newId(), ...input, createdAt: Date.now() };
  await db.teamSets.add(row);
  return row;
}

/** Moves one student into a team, removing them from whichever team held them
    so nobody can appear twice. */
export async function moveStudent(
  teamSetId: ID,
  studentId: ID,
  toTeamIndex: number,
): Promise<void> {
  await db.transaction('rw', db.teamSets, async () => {
    const set = await db.teamSets.get(teamSetId);
    if (!set) return;
    if (toTeamIndex < 0 || toTeamIndex >= set.teams.length) return;

    const teams = set.teams.map((t) => ({
      ...t,
      studentIds: t.studentIds.filter((id) => id !== studentId),
    }));

    const target = teams[toTeamIndex];
    if (!target) return;
    target.studentIds = [...target.studentIds, studentId];

    await db.teamSets.update(teamSetId, { teams });
  });
}
