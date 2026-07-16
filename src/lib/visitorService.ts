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

export async function getVisitorStats(): Promise<VisitorStats> {
  const today = getLocalDateString();
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
      // fallback
    }
  }
  const defaultStats: VisitorStats = {
    daily: 124,
    total: 2842,
    lastResetDate: today
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultStats));
  return defaultStats;
}

export async function trackVisit(): Promise<VisitorStats> {
  const today = getLocalDateString();
  
  try {
    const localStatsStr = localStorage.getItem(STORAGE_KEY);
    let stats: VisitorStats;
    
    if (localStatsStr) {
      stats = JSON.parse(localStatsStr) as VisitorStats;
    } else {
      stats = {
        daily: 124,
        total: 2842,
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
  } catch (error) {
    console.error("Error tracking visit offline:", error);
    return {
      daily: 124,
      total: 2842,
      lastResetDate: today
    };
  }
}

