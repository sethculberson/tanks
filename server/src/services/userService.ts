import bcrypt from 'bcryptjs';
import { getDb } from './firebase.js';

const USERS = 'users';

export interface UserStats {
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  shotsFired: number;
  shotsHit: number;
  shotsSelf: number;
  shotsExpired: number;
}

export interface PublicUser {
  username: string;
  createdAt: FirebaseFirestore.Timestamp | Date;
  lastPlayed: FirebaseFirestore.Timestamp | Date | null;
  stats: UserStats;
}

export type StatsDelta = Partial<UserStats>;

type ServiceResult<T> =
  | { success: true } & T
  | { error: string };

function normalizeUsername(username: string): string {
  return username.toLowerCase().trim();
}

export async function registerUser(
  username: string,
  password: string,
): Promise<ServiceResult<{ username: string }>> {
  const db = getDb();
  if (!db) return { error: 'Database unavailable' };

  const name = normalizeUsername(username);
  if (!/^[a-z0-9_]{3,20}$/.test(name)) {
    return { error: 'Username must be 3–20 chars: letters, numbers, underscores' };
  }
  if (password.length < 4) {
    return { error: 'Password must be at least 4 characters' };
  }

  const ref = db.collection(USERS).doc(name);
  const existing = await ref.get();
  if (existing.exists) return { error: 'Username already taken' };

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();
  await ref.set({
    username: name,
    passwordHash,
    createdAt: now,
    lastPlayed: null,
    stats: {
      totalGames: 0,
      totalWins: 0,
      totalLosses: 0,
      shotsFired: 0,
      shotsHit: 0,       // shots that hit opponent
      shotsSelf: 0,      // shots that hit own tank (tracked for future use)
      shotsExpired: 0,   // shots that expired without a hit (missed)
    },
  });

  return { success: true, username: name };
}

export async function loginUser(
  username: string,
  password: string,
): Promise<ServiceResult<{ user: PublicUser }>> {
  const db = getDb();
  if (!db) return { error: 'Database unavailable' };

  const name = normalizeUsername(username);
  const doc = await db.collection(USERS).doc(name).get();
  if (!doc.exists) return { error: 'Invalid username or password' };

  const data = doc.data() as { passwordHash: string } & PublicUser;
  const valid = await bcrypt.compare(password, data.passwordHash);
  if (!valid) return { error: 'Invalid username or password' };

  const { passwordHash: _hash, ...publicData } = data;
  return { success: true, user: publicData as PublicUser };
}

export async function getUser(
  username: string,
): Promise<ServiceResult<{ user: PublicUser }>> {
  const db = getDb();
  if (!db) return { error: 'Database unavailable' };

  const name = normalizeUsername(username);
  const doc = await db.collection(USERS).doc(name).get();
  if (!doc.exists) return { error: 'User not found' };

  const data = doc.data() as { passwordHash: string } & PublicUser;
  const { passwordHash: _hash, ...publicData } = data;
  return { success: true, user: publicData as PublicUser };
}

/** Atomically add delta values to a user's stats. */
export async function updateUserStats(username: string, delta: StatsDelta): Promise<void> {
  const db = getDb();
  if (!db) return;

  const name = normalizeUsername(username);
  const ref = db.collection(USERS).doc(name);

  try {
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) return;

      const cur = (doc.data() as { stats: UserStats }).stats;
      tx.update(ref, {
        lastPlayed: new Date(),
        stats: {
          totalGames:   cur.totalGames   + (delta.totalGames   ?? 0),
          totalWins:    cur.totalWins    + (delta.totalWins    ?? 0),
          totalLosses:  cur.totalLosses  + (delta.totalLosses  ?? 0),
          shotsFired:   cur.shotsFired   + (delta.shotsFired   ?? 0),
          shotsHit:     cur.shotsHit     + (delta.shotsHit     ?? 0),
          shotsSelf:    cur.shotsSelf    + (delta.shotsSelf    ?? 0),
          shotsExpired: cur.shotsExpired + (delta.shotsExpired ?? 0),
        },
      });
    });
  } catch (err) {
    console.error(`[userService] Failed to update stats for ${username}:`, (err as Error).message);
  }
}
