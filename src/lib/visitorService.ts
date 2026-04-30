import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

const VISITORS_DOC = 'system/visitors';

export interface VisitorStats {
  daily: number;
  total: number;
  lastResetDate: string; // YYYY-MM-DD
}

export async function getVisitorStats(): Promise<VisitorStats> {
  const docRef = doc(db, VISITORS_DOC);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    const initialStats: VisitorStats = {
      daily: 0,
      total: 0,
      lastResetDate: new Date().toISOString().split('T')[0]
    };
    await setDoc(docRef, initialStats);
    return initialStats;
  }

  return docSnap.data() as VisitorStats;
}

export async function trackVisit() {
  // Use a local flag to check if we've already tracked a visit in this session
  const sessionKey = 'dreamUni_session_tracked';
  if (sessionStorage.getItem(sessionKey)) return;

  const docRef = doc(db, VISITORS_DOC);
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      await setDoc(docRef, {
        daily: 1,
        total: 1,
        lastResetDate: today
      });
    } else {
      const data = docSnap.data() as VisitorStats;
      
      if (data.lastResetDate !== today) {
        // New day, reset daily
        await updateDoc(docRef, {
          daily: 1,
          total: increment(1),
          lastResetDate: today
        });
      } else {
        await updateDoc(docRef, {
          daily: increment(1),
          total: increment(1)
        });
      }
    }
    
    sessionStorage.setItem(sessionKey, 'true');
  } catch (error) {
    console.error("Error tracking visit:", error);
  }
}
