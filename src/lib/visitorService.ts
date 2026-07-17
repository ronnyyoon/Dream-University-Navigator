import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';

export interface VisitorStats {
  daily: number;
  total: number;
  lastResetDate: string; // YYYY-MM-DD
}

function getLocalDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const STORAGE_KEY = 'dreamUni_visitor_stats_v3';
const SESSION_KEY = 'dreamUni_session_tracked_v3';

// Base offline fallback counts
const BASE_DAILY = 124;
const BASE_TOTAL = 2842;

export async function getVisitorStats(): Promise<VisitorStats> {
  const today = getLocalDateString();
  try {
    const docRef = doc(db, 'system', 'visitors');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as VisitorStats;
      if (data.lastResetDate !== today) {
        return {
          daily: 0,
          total: data.total,
          lastResetDate: today
        };
      }
      return data;
    }
  } catch (error) {
    console.warn("Firestore visitor fetch failed, using local fallback:", error);
  }

  // Fallback to local storage if Firestore fails
  const localStatsStr = localStorage.getItem(STORAGE_KEY);
  if (localStatsStr) {
    try {
      const stats = JSON.parse(localStatsStr) as VisitorStats;
      if (stats.lastResetDate !== today) {
        stats.daily = 0;
        stats.lastResetDate = today;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
      }
      return stats;
    } catch (e) {
      // ignore
    }
  }
  return {
    daily: BASE_DAILY,
    total: BASE_TOTAL,
    lastResetDate: today
  };
}

export async function trackVisit(): Promise<VisitorStats> {
  const today = getLocalDateString();
  const isSessionTracked = sessionStorage.getItem(SESSION_KEY) === 'true';

  try {
    const docRef = doc(db, 'system', 'visitors');
    
    const updatedStats = await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      let stats: VisitorStats;
      
      if (docSnap.exists()) {
        stats = docSnap.data() as VisitorStats;
      } else {
        stats = {
          daily: BASE_DAILY,
          total: BASE_TOTAL,
          lastResetDate: today
        };
      }

      if (stats.lastResetDate !== today) {
        stats.daily = 0;
        stats.lastResetDate = today;
      }

      if (!isSessionTracked) {
        stats.daily += 1;
        stats.total += 1;
      }

      transaction.set(docRef, stats);
      return stats;
    });

    if (!isSessionTracked) {
      sessionStorage.setItem(SESSION_KEY, 'true');
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStats));
    return updatedStats;

  } catch (error) {
    console.warn("Firestore transaction failed, tracking offline:", error);
    
    // Offline local storage fallback
    const localStatsStr = localStorage.getItem(STORAGE_KEY);
    let stats: VisitorStats;
    
    if (localStatsStr) {
      try {
        stats = JSON.parse(localStatsStr) as VisitorStats;
      } catch (e) {
        stats = {
          daily: BASE_DAILY,
          total: BASE_TOTAL,
          lastResetDate: today
        };
      }
    } else {
      stats = {
        daily: BASE_DAILY,
        total: BASE_TOTAL,
        lastResetDate: today
      };
    }

    if (stats.lastResetDate !== today) {
      stats.daily = 0;
      stats.lastResetDate = today;
      sessionStorage.removeItem(SESSION_KEY);
    }

    if (!sessionStorage.getItem(SESSION_KEY)) {
      stats.daily += 1;
      stats.total += 1;
      sessionStorage.setItem(SESSION_KEY, 'true');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    }

    return stats;
  }
}
