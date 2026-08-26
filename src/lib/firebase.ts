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
  orderBy,
  limit,
  onSnapshot,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  BusinessFormData,
  AssessmentReport,
  EscalatedQuestion
} from '../types';

let dbInstance: Firestore | null = null;
let isFirebaseReady = false;

try {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  // Using custom firestore database if configured
  if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') {
    dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } else {
    dbInstance = getFirestore(app);
  }
  isFirebaseReady = true;
  console.log('Firebase Firestore initialized successfully for cloud database tables.');
} catch (err) {
  console.warn('Firebase initialization error, using local fallback mode:', err);
}

export const isCloudDatabaseAvailable = (): boolean => {
  return isFirebaseReady && dbInstance !== null;
};

// 1. Cloud Assessments Operations (/assessments)
export const saveAssessmentToCloud = async (data: BusinessFormData): Promise<boolean> => {
  if (!dbInstance) return false;
  try {
    const docRef = doc(dbInstance, 'assessments', data.id);
    await setDoc(docRef, {
      ...data,
      cloudSyncedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('saveAssessmentToCloud failed:', err);
    return false;
  }
};

export const fetchAssessmentsFromCloud = async (): Promise<BusinessFormData[]> => {
  if (!dbInstance) return [];
  try {
    const colRef = collection(dbInstance, 'assessments');
    const snapshot = await getDocs(colRef);
    const list: BusinessFormData[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as BusinessFormData);
    });
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

// 2. Cloud Reports Operations (/reports)
export const saveReportToCloud = async (report: AssessmentReport): Promise<boolean> => {
  if (!dbInstance) return false;
  try {
    const docRef = doc(dbInstance, 'reports', report.id);
    await setDoc(docRef, {
      ...report,
      cloudSyncedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('saveReportToCloud failed:', err);
    return false;
  }
};

export const fetchReportsFromCloud = async (): Promise<AssessmentReport[]> => {
  if (!dbInstance) return [];
  try {
    const colRef = collection(dbInstance, 'reports');
    const snapshot = await getDocs(colRef);
    const list: AssessmentReport[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as AssessmentReport);
    });
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

// 3. Cloud Escalated Questions (/escalated_questions)
export const saveQuestionToCloud = async (q: EscalatedQuestion): Promise<boolean> => {
  if (!dbInstance) return false;
  try {
    const docRef = doc(dbInstance, 'escalated_questions', q.id);
    await setDoc(docRef, {
      ...q,
      cloudSyncedAt: new Date().toISOString()
    }, { merge: true });
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

export { dbInstance as db };
