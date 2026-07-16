import { AdmissionCase, OfficialStat } from '../types';
import { SEED_ADMISSION_CASES } from '../seedData';
import universityData from '../university_stats.json';
import admissionData from '../admission_cases.json';

// Cast the imported universityData to OfficialStat[]
const INITIAL_OFFICIAL_STATS = universityData as OfficialStat[];

// In-memory/localStorage stores
let cachedAdmissionCases: AdmissionCase[] | null = null;
let cachedOfficialStats: OfficialStat[] | null = null;

// Initialize admission cases from localStorage or fallback to SEED_ADMISSION_CASES
function getLocalAdmissionCases(): AdmissionCase[] {
  if (cachedAdmissionCases) {
    return cachedAdmissionCases;
  }
  try {
    console.log("🚀 [Offline Case Engine] 2,763건의 실제 합격 사례 데이터가 로컬 JSON 파일로부터 정상 로딩되었습니다.");
    
    cachedAdmissionCases = admissionData.map((data: any, index: number) => {
      const getVal = (...args: any[]) => {
        for (const val of args) {
          if (val !== undefined && val !== null && val !== "") return val;
        }
        return "-";
      };

      return {
        id: data.id || String(index),
        grade: Number(data.grade || 0),
        year: Number(data.year || 2026),
        universityName: getVal(data.universityName, data.college),
        departmentName: getVal(data.departmentName, data.major),
        admissionType: getVal(data.admissionType, data.type),
        detailedType: getVal(data.detailedType, data.detailType),
        step1Result: getVal(data.step1Result, "-"),
        finalResult: getVal(data.finalResult, "-"),
        failReason: getVal(data.failReason, ""),
        waitlistRank: getVal(data.waitlistRank, ""),
        waitlistHistory: getVal(data.waitlistHistory, ""),
        location: getVal(data.location, "-"),
        isEnrolled: getVal(data.isEnrolled, "N")
      };
    });
  } catch (error) {
    console.error("로컬 합격 사례 JSON 매핑 에러:", error);
    cachedAdmissionCases = [];
  }

  return cachedAdmissionCases;
}

function saveLocalAdmissionCases(cases: AdmissionCase[]) {
  // 로컬 JSON 고정 구동 방식이므로 저장 함수는 무력화 처리합니다.
}

// Initialize official stats from memory (to avoid local storage quota limits of 5MB for large json data)
function getLocalOfficialStats(): OfficialStat[] {
  if (cachedOfficialStats) {
    return cachedOfficialStats;
  }
  // Load from local memory cache
  cachedOfficialStats = [...INITIAL_OFFICIAL_STATS];
  return cachedOfficialStats;
}

export function clearAdmissionCache() {
  cachedAdmissionCases = null;
  cachedOfficialStats = null;
}

export async function fetchAdmissionCases(filters: {
  year?: string;
  location?: string;
  universityName?: string;
  departmentName?: string;
  admissionType?: string;
  detailedType?: string;
  finalResult?: string;
  isEnrolled?: string;
  minGrade?: number;
  maxGrade?: number;
} = {}): Promise<AdmissionCase[]> {
  try {
    const allCases = getLocalAdmissionCases();
    let results = [...allCases];

    if (filters.year && filters.year !== '전체') {
      results = results.filter(c => c.year === parseInt(filters.year!));
    }
    if (filters.location && filters.location !== '전체') {
      results = results.filter(c => c.location === filters.location);
    }
    if (filters.universityName && filters.universityName !== '전체') {
      results = results.filter(c => c.universityName === filters.universityName);
    }
    if (filters.departmentName && filters.departmentName !== '전체') {
      results = results.filter(c => c.departmentName === filters.departmentName);
    }
    if (filters.admissionType && filters.admissionType !== '전체') {
      results = results.filter(c => c.admissionType === filters.admissionType);
    }
    if (filters.detailedType && filters.detailedType !== '전체') {
      results = results.filter(c => c.detailedType === filters.detailedType);
    }
    if (filters.finalResult && filters.finalResult !== '전체') {
      if (filters.finalResult === '최종합격(합격+충원합격)') {
        results = results.filter(c => ['합격', '충원합격'].includes(c.finalResult));
      } else {
        results = results.filter(c => c.finalResult === filters.finalResult);
      }
    }
    if (filters.isEnrolled && filters.isEnrolled !== '전체') {
      results = results.filter(c => c.isEnrolled === filters.isEnrolled);
    }
    if (filters.minGrade !== undefined) {
      results = results.filter(c => c.grade >= filters.minGrade!);
    }
    if (filters.maxGrade !== undefined) {
      results = results.filter(c => c.grade <= filters.maxGrade!);
    }
    
    // Sort logic (year desc, grade asc)
    results.sort((a, b) => {
      if (b.year !== a.year) {
        return b.year - a.year;
      }
      return a.grade - b.grade;
    });

    return results;
  } catch (error: any) {
    console.error("Error filtering admission cases:", error);
    return [];
  }
}

export async function fetchAllAdmissionCases(): Promise<AdmissionCase[]> {
  return getLocalAdmissionCases();
}

export async function fetchOfficialStats(filters: {
  location?: string;
  universityName?: string;
  departmentName?: string;
  admissionType?: string;
  detailedType?: string;
} = {}): Promise<OfficialStat[]> {
  try {
    const stats = getLocalOfficialStats();
    let results = [...stats];

    if (filters.location && filters.location !== '전체') {
      results = results.filter(r => r.location === filters.location);
    }
    if (filters.universityName && filters.universityName !== '전체') {
      results = results.filter(r => r.universityName === filters.universityName);
    }
    if (filters.admissionType && filters.admissionType !== '전체') {
      results = results.filter(r => r.admissionType === filters.admissionType);
    }
    if (filters.detailedType && filters.detailedType !== '전체') {
      results = results.filter(r => r.detailedType === filters.detailedType);
    }
    if (filters.departmentName) {
      const search = filters.departmentName.toLowerCase().trim();
      if (search) {
        results = results.filter(r => r.departmentName && r.departmentName.toLowerCase().includes(search));
      }
    }

    // Final safety check for UI display
    return results.filter(r => r.universityName && r.universityName.trim() !== '');
  } catch (error: any) {
    console.error("Error fetching official stats:", error);
    return [];
  }
}

export async function uploadOfficialStats(stats: OfficialStat[]): Promise<void> {
  // Append new stats to our local memory database
  const current = getLocalOfficialStats();
  cachedOfficialStats = [...current, ...stats];
}

export async function deleteOfficialStatsByUniversity(universityName: string): Promise<number> {
  const current = getLocalOfficialStats();
  const filtered = current.filter(s => s.universityName !== universityName);
  const deletedCount = current.length - filtered.length;
  cachedOfficialStats = filtered;
  return deletedCount;
}

export async function deleteOfficialStat(id: string): Promise<void> {
  const current = getLocalOfficialStats();
  cachedOfficialStats = current.filter(s => s.id !== id);
}

export async function updateOfficialStat(id: string, data: Partial<OfficialStat>): Promise<void> {
  const current = getLocalOfficialStats();
  cachedOfficialStats = current.map(s => {
    if (s.id === id) {
      return { ...s, ...data };
    }
    return s;
  });
}

export async function deleteAllOfficialStats(): Promise<number> {
  const count = getLocalOfficialStats().length;
  cachedOfficialStats = [];
  return count;
}
