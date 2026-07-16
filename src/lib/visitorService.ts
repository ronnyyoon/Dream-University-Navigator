export interface VisitorStats {
  daily: number;
  total: number;
  lastResetDate: string; // YYYY-MM-DD
}

export async function getVisitorStats(): Promise<VisitorStats> {
  const today = new Date().toISOString().split('T')[0];
  const localStatsStr = localStorage.getItem('dreamUni_visitor_stats_v2');
  if (localStatsStr) {
    try {
      const stats = JSON.parse(localStatsStr) as VisitorStats;
      if (stats.lastResetDate !== today) {
        stats.daily = 0;
        stats.lastResetDate = today;
        localStorage.setItem('dreamUni_visitor_stats_v2', JSON.stringify(stats));
      }
      return stats;
    } catch (e) {
      // fallback
    }
  }
  const defaultStats: VisitorStats = {
    daily: 1,
    total: 1,
    lastResetDate: today
  };
  localStorage.setItem('dreamUni_visitor_stats_v2', JSON.stringify(defaultStats));
  return defaultStats;
}

export async function trackVisit(): Promise<VisitorStats> {
  const sessionKey = 'dreamUni_session_tracked_v2';
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const localStatsStr = localStorage.getItem('dreamUni_visitor_stats_v2');
    let stats: VisitorStats;
    
    if (localStatsStr) {
      stats = JSON.parse(localStatsStr) as VisitorStats;
    } else {
      stats = {
        daily: 0,
        total: 0,
        lastResetDate: today
      };
    }

    if (stats.lastResetDate !== today) {
      stats.daily = 0;
      stats.lastResetDate = today;
    }

    if (!sessionStorage.getItem(sessionKey)) {
      stats.daily += 1;
      stats.total += 1;
      sessionStorage.setItem(sessionKey, 'true');
      localStorage.setItem('dreamUni_visitor_stats_v2', JSON.stringify(stats));
    }

    return stats;
  } catch (error) {
    console.error("Error tracking visit offline:", error);
    return {
      daily: 1,
      total: 1,
      lastResetDate: today
    };
  }
}

