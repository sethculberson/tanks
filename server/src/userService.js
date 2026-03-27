import bcrypt from 'bcryptjs';
import { getDb } from './firebase.js';

const USERS = 'users';

function normalizeUsername(username) {
  return username.toLowerCase().trim();
}

export async function registerUser(username, password) {
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

export async function loginUser(username, password) {
  const db = getDb();
  if (!db) return { error: 'Database unavailable' };

  const name = normalizeUsername(username);
  const doc = await db.collection(USERS).doc(name).get();
  if (!doc.exists) return { error: 'Invalid username or password' };

  const data = doc.data();
  const valid = await bcrypt.compare(password, data.passwordHash);
  if (!valid) return { error: 'Invalid username or password' };

  const { passwordHash, ...publicData } = data;
  return { success: true, user: publicData };
}

export async function getUser(username) {
  const db = getDb();
  if (!db) return { error: 'Database unavailable' };

  const name = normalizeUsername(username);
  const doc = await db.collection(USERS).doc(name).get();
  if (!doc.exists) return { error: 'User not found' };

  const { passwordHash, ...publicData } = doc.data();
  return { success: true, user: publicData };
}

/** Atomically add delta values to a user's stats. */
export async function updateUserStats(username, delta) {
  const db = getDb();
  if (!db) return;

  const name = normalizeUsername(username);
  const ref = db.collection(USERS).doc(name);

  try {
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) return;

      const cur = doc.data().stats;
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
    console.error(`[userService] Failed to update stats for ${username}:`, err.message);
  }
}
