import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { writeFileSync } from 'fs';
import { join } from 'path';

let db = null;

export function initFirebase() {
  if (getApps().length > 0) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.warn('[Firebase] FIREBASE_PROJECT_ID not set — Firestore disabled');
    return;
  }

  // ── Option C: non-GCP host ──────────────────────────────────────────────
  // If GOOGLE_CREDENTIALS_JSON is set, write it to a temp file so ADC can
  // pick it up.  Set this var in your host's secret env config (never commit).
  //
  // if (process.env.GOOGLE_CREDENTIALS_JSON) {
  //   const tmp = join('/tmp', 'sa-key.json');
  //   writeFileSync(tmp, process.env.GOOGLE_CREDENTIALS_JSON);
  //   process.env.GOOGLE_APPLICATION_CREDENTIALS = tmp;
  // }
  // ────────────────────────────────────────────────────────────────────────

  // Uses ADC — covers Option A (GOOGLE_APPLICATION_CREDENTIALS file path),
  // Option B (GCP-attached service account), and Option C (temp file above).
  const app = initializeApp({ projectId });

  // 'tanks-db' is the named Firestore database
  db = getFirestore(app, 'tanks-db');
  console.log('[Firebase] Connected to Firestore (tanks-db)');
}

export function getDb() {
  return db;
}
