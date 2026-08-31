import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Firestore
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  Auth
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  BusinessFormData,
  AssessmentReport,
  EscalatedQuestion,
  AppUser
} from '../types';

let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let isFirebaseReady = false;

try {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  // Using custom firestore database if configured
  if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') {
    dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } else {
    dbInstance = getFirestore(app);
  }
  authInstance = getAuth(app);
  isFirebaseReady = true;
  console.log('Firebase Firestore & Auth initialized successfully.');
} catch (err) {
  console.warn('Firebase initialization error, using local fallback mode:', err);
}

export const isCloudDatabaseAvailable = (): boolean => {
  return isFirebaseReady && dbInstance !== null;
};

// Firestore 拒绝写入 undefined 字段。递归移除对象中的 undefined，
// 避免"Unsupported field value: undefined (field xxx)"错误导致云端保存失败。
export const stripUndefined = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item) => stripUndefined(item)) as unknown as T;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (value === undefined) continue;
    clean[key] = stripUndefined(value);
  }
  return clean as T;
};

// ========================
// 🔐 GOOGLE AUTH METHODS
// ========================

export const subscribeToAuthChanges = (callback: (user: AppUser | null) => void): (() => void) => {
  if (!authInstance) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(authInstance, (firebaseUser: User | null) => {
    if (firebaseUser) {
      const appUser: AppUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL
      };
      callback(appUser);
    } else {
      callback(null);
    }
  });
};

export const signInWithGoogle = async (): Promise<AppUser | null> => {
  if (!authInstance) {
    throw new Error('Firebase Auth is not initialized');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(authInstance, provider);
  if (result.user) {
    return {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL
    };
  }
  return null;
};

export const logoutGoogleUser = async (): Promise<void> => {
  if (!authInstance) return;
  await signOut(authInstance);
};

export const getCurrentAuthUser = (): AppUser | null => {
  if (!authInstance?.currentUser) return null;
  const u = authInstance.currentUser;
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    photoURL: u.photoURL
  };
};

// ========================
// 1. Cloud Assessments Operations (/assessments)
// ========================

export const saveAssessmentToCloud = async (
  data: BusinessFormData,
  currentUser?: AppUser | null
): Promise<boolean> => {
  if (!dbInstance) return false;
  try {
    const user = currentUser || getCurrentAuthUser();
    const docRef = doc(dbInstance, 'assessments', data.id);
    const payload = {
      ...data,
      ...(user ? { ownerUid: user.uid, ownerEmail: user.email || data.ownerEmail } : {}),
      cloudSyncedAt: new Date().toISOString()
    };
    await setDoc(docRef, stripUndefined(payload), { merge: true });
    return true;
  } catch (err) {
    console.warn('saveAssessmentToCloud failed:', err);
    return false;
  }
};

export const fetchAssessmentsFromCloud = async (
  user?: AppUser | null
): Promise<BusinessFormData[]> => {
  if (!dbInstance) return [];
  try {
    const colRef = collection(dbInstance, 'assessments');
    const snapshot = await getDocs(colRef);
    const list: BusinessFormData[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as BusinessFormData);
    });
    
    // If a user is specified, prioritize user-owned or accessible projects
    if (user?.uid) {
      const userProjects = list.filter(
        (p) => p.ownerUid === user.uid || (user.email && p.ownerEmail === user.email)
      );
      if (userProjects.length > 0) {
        return userProjects;
      }
    }
    return list;
  } catch (err) {
    console.warn('fetchAssessmentsFromCloud failed:', err);
    return [];
  }
};

export const deleteAssessmentFromCloud = async (id: string): Promise<boolean> => {
  if (!dbInstance) return false;
  try {
    const docRef = doc(dbInstance, 'assessments', id);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn('deleteAssessmentFromCloud failed:', err);
    return false;
  }
};

// ========================
// 2. Cloud Reports Operations (/reports)
// ========================

export const saveReportToCloud = async (
  report: AssessmentReport,
  currentUser?: AppUser | null
): Promise<boolean> => {
  if (!dbInstance) return false;
  try {
    const user = currentUser || getCurrentAuthUser();
    const docRef = doc(dbInstance, 'reports', report.id);
    const payload = {
      ...report,
      ...(user ? { ownerUid: user.uid, ownerEmail: user.email || report.ownerEmail } : {}),
      cloudSyncedAt: new Date().toISOString()
    };
    await setDoc(docRef, stripUndefined(payload), { merge: true });
    return true;
  } catch (err) {
    console.warn('saveReportToCloud failed:', err);
    return false;
  }
};

export const fetchReportsFromCloud = async (
  user?: AppUser | null
): Promise<AssessmentReport[]> => {
  if (!dbInstance) return [];
  try {
    const colRef = collection(dbInstance, 'reports');
    const snapshot = await getDocs(colRef);
    const list: AssessmentReport[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as AssessmentReport);
    });

    if (user?.uid) {
      const userReports = list.filter(
        (r) => r.ownerUid === user.uid || (user.email && r.ownerEmail === user.email)
      );
      if (userReports.length > 0) {
        return userReports;
      }
    }
    return list;
  } catch (err) {
    console.warn('fetchReportsFromCloud failed:', err);
    return [];
  }
};

export const deleteReportFromCloud = async (id: string): Promise<boolean> => {
  if (!dbInstance) return false;
  try {
    const docRef = doc(dbInstance, 'reports', id);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn('deleteReportFromCloud failed:', err);
    return false;
  }
};

// ========================
// 3. Cloud Escalated Questions (/escalated_questions)
// ========================

export const saveQuestionToCloud = async (q: EscalatedQuestion): Promise<boolean> => {
  if (!dbInstance) return false;
  try {
    const docRef = doc(dbInstance, 'escalated_questions', q.id);
    await setDoc(docRef, stripUndefined({
      ...q,
      cloudSyncedAt: new Date().toISOString()
    }), { merge: true });
    return true;
  } catch (err) {
    console.warn('saveQuestionToCloud failed:', err);
    return false;
  }
};

export const fetchQuestionsFromCloud = async (): Promise<EscalatedQuestion[]> => {
  if (!dbInstance) return [];
  try {
    const colRef = collection(dbInstance, 'escalated_questions');
    const snapshot = await getDocs(colRef);
    const list: EscalatedQuestion[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as EscalatedQuestion);
    });
    return list;
  } catch (err) {
    console.warn('fetchQuestionsFromCloud failed:', err);
    return [];
  }
};

export { dbInstance as db, authInstance as auth };

