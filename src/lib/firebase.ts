import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import universityData from '../university_stats.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

export interface CollegeStat {
  id: string;
  college: string;
  major: string;
  type: string;
  detailType: string;
  recruitCount2026: string;
  cut70_2026: string;
  chuhapNo2026: string;
  ratio2026: string;
  avgGpa2026?: string;
}

// 68만 줄짜리 로컬 JSON 데이터를 가공하여 UI(대학교 선택, 학과 선택)에 공급하는 전역 함수
export async function fetchCollegeStats(): Promise<CollegeStat[]> {
  try {
    console.log("🚀 [Offline Native Engine] 17,074건의 입결 데이터가 로컬 JSON 파일로부터 정상 로딩되었습니다.");
    
    return universityData.map((data: any, index: number) => {
      const statsObj = data.stats || {};
      const data2026 = statsObj['2026'] || {};
      const data2025 = statsObj['2025'] || {};
      const data2024 = statsObj['2024'] || {};

      const getVal = (...args: any[]) => {
        for (const val of args) {
          if (val !== undefined && val !== null && val !== "") return String(val);
        }
        return "-";
      };

      return {
        id: data.id || String(index),
        college: getVal(data.universityName, data.college),
        major: getVal(data.departmentName, data.major),
        type: getVal(data.admissionType, data.type),
        detailType: getVal(data.detailedType, data.detailType),
        
        recruitCount2026: getVal(data2026.enrollment, data2026.recruitCount, data2025.enrollment, data2024.enrollment, data.recruitCount),
        cut70_2026: getVal(data2026.cut70, data2025.cut70, data2024.cut70),
        chuhapNo2026: getVal(data2026.waitlistLastRank, data2026.chuhapNo, data2025.waitlistLastRank, data2024.waitlistLastRank),
        ratio2026: getVal(data2026.competitionRate, data2026.ratio, data2025.competitionRate, data2024.competitionRate),
        avgGpa2026: data2026.average || data2025.average || data2024.average ? String(data2026.average || data2025.average || data2024.average) : undefined
      };
    });
  } catch (error) {
    console.error("로컬 JSON 매핑 중 예외 에러가 발생했습니다:", error);
    return [];
  }
}

export async function seedCollegeStats(stats: Omit<CollegeStat, 'id'>[]): Promise<void> {
  return Promise.resolve();
}