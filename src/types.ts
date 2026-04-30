export interface University {
  id: string;
  name: string;
  location: string;
  departmentCount: number;
  logo?: string;
}

export interface AdmissionCase {
  id: string;
  year: number;
  grade: number;
  location: string;
  universityName: string;
  admissionType: string;
  detailedType: string;
  departmentName: string;
  step1Result: string;
  finalResult: string;
  failReason?: string;
  waitlistRank?: string;
  waitlistHistory?: string;
  isEnrolled: 'Y' | 'N' | '-';
}

export interface StatItem {
  label: string;
  value: string;
  icon: string;
}

export interface OfficialStat {
  id: string;
  location: string;
  universityName: string;
  departmentName: string;
  admissionType: string;
  detailedType: string;
  stats: {
    [year: string]: {
      enrollment: string;
      registeredCount: string;
      competitionRate: string;
      waitlistLastRank: string;
      average: string;
      cut50: string;
      cut70: string;
      cut80: string;
    };
  };
}
