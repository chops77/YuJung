import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithEmailAndPassword,
         onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, getDoc, getDocs,
         updateDoc, deleteDoc, query, where, orderBy, limit,
         onSnapshot, serverTimestamp, runTransaction, type DocumentData } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from 'firebase/app-check';

// Public by design — security lives in firestore.rules / storage.rules + App Check.
// Values come from .env locally and GitHub repo Variables in CI.
const firebaseConfig = {
  apiKey:      import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain:  import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:   import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId:       import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

let appCheck: AppCheck | null = null;
export function ensureAppCheck() {
  if (appCheck) return appCheck;
  const key = import.meta.env.PUBLIC_RECAPTCHA_SITE_KEY as string | undefined;
  if (!key) return null; // dev without a key → register later; rules still protect data
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(key),
    isAutoRefreshEnabled: true,
  });
  return appCheck;
}

export const auth = getAuth(app);
export const db = getFirestore(app);

/* ───────────────────────── Guest side ───────────────────────── */

export async function ensureGuest(): Promise<User> {
  ensureAppCheck();
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
}

export interface MemoryInput {
  authorName: string; relation?: string; message: string;
  media?: { type: 'image' | 'video'; url: string }[];
}

export async function addMemory(input: MemoryInput) {
  await ensureGuest();
  return addDoc(collection(db, 'memories'), {
    ...input,
    media: input.media ?? [],
    relation: input.relation ?? '',
    hidden: false,
    createdAt: serverTimestamp(),
  });
}

export async function addComment(cardId: string, input: { authorName: string; text: string }) {
  await ensureGuest();
  return addDoc(collection(db, 'memories', cardId, 'comments'), {
    ...input, hidden: false, createdAt: serverTimestamp(),
  });
}

export interface CardView extends DocumentData {
  id: string; authorName: string; relation?: string; message: string;
  media?: { type: 'image' | 'video'; url: string }[];
  createdAt?: any;
}

export function subscribeMemories(cb: (cards: CardView[]) => void, onError?: (e: Error) => void) {
  ensureGuest().then(() => {
    const q = query(collection(db, 'memories'),
      where('hidden', '==', false), orderBy('createdAt', 'desc'), limit(200));
    return onSnapshot(q,
      snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as CardView))),
      err => onError?.(err));
  }).catch(onError);
}

export async function fetchComments(cardId: string) {
  const q = query(collection(db, 'memories', cardId, 'comments'),
    where('hidden', '==', false), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Guest photos are linked by URL — Firebase Storage needs a paid plan. */
export function parseYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

/* Candle */
export function subscribeCandle(cb: (count: number) => void) {
  ensureGuest().then(() =>
    onSnapshot(doc(db, 'candles', 'counter'), s => cb(s.exists() ? s.data().count : 0)));
}
export async function lightCandleOnce(): Promise<boolean> {
  const KEY = 'candle-lit';
  if (localStorage.getItem(KEY)) return false;          // one per visitor
  await ensureGuest();
  await runTransaction(db, async tx => {
    const ref = doc(db, 'candles', 'counter');
    const snap = await tx.get(ref);
    tx.set(ref, { count: (snap.exists() ? snap.data().count : 0) + 1 }, { merge: true });
  });
  localStorage.setItem(KEY, '1');
  return true;
}

/* ───────────────────────── Admin side ───────────────────────── */

export function onAdmin(cb: (u: User | null) => void) { return onAuthStateChanged(auth, cb); }
export const adminSignIn = (email: string, pw: string) => { ensureAppCheck(); return signInWithEmailAndPassword(auth, email, pw); };
export const adminSignOut = () => signOut(auth);

export async function listAllMemories(max = 300) {
  const snap = await getDocs(query(collection(db, 'memories'), orderBy('createdAt', 'desc'), limit(max)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CardView));
}
export async function listAllCommentsRaw(cardId: string) {
  const snap = await getDocs(collection(db, 'memories', cardId, 'comments'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export const setHidden = (cardId: string, v: boolean) =>
  updateDoc(doc(db, 'memories', cardId), { hidden: v });
export const editMemoryMessage = (cardId: string, message: string) =>
  updateDoc(doc(db, 'memories', cardId), { message });
export const setCommentHidden = (cardId: string, cId: string, v: boolean) =>
  updateDoc(doc(db, 'memories', cardId, 'comments', cId), { hidden: v });

export async function deleteCardCascade(cardId: string) {
  const comments = await listAllCommentsRaw(cardId);   // Firestore has no cascade
  await Promise.all(comments.map(c => deleteDoc(doc(db, 'memories', cardId, 'comments', c.id))));
  await deleteDoc(doc(db, 'memories', cardId));
}
export const deleteCommentDoc = (cardId: string, cId: string) =>
  deleteDoc(doc(db, 'memories', cardId, 'comments', cId));