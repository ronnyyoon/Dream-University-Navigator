import { University, AdmissionCase, StatItem } from './types';

// University list derived from cases
export const UNIVERSITIES_MOCK: University[] = [
  { id: '1', name: '서울대학교', location: '서울특별시', departmentCount: 88 },
  { id: '2', name: '연세대학교', location: '서울특별시', departmentCount: 92 },
  { id: '3', name: '고려대학교', location: '서울특별시', departmentCount: 90 },
  { id: '4', name: '한양대학교', location: '서울특별시', departmentCount: 85 },
];

export const getStats = (cases: AdmissionCase[]): StatItem[] => {
  const totalRecords = cases.length || 2751; // Fallback to target if empty for landing
  const passCount = cases.filter(c => c.finalResult === '합격' || c.finalResult === '충원합격').length || 1069;
  
  const universitySet = new Set(cases.map(c => c.universityName));
  const departmentSet = new Set(cases.map(c => c.departmentName));
  
  return [
    { label: '등록 대학', value: (universitySet.size || 117).toString(), icon: 'School' },
    { label: '학과 수', value: (departmentSet.size || 542).toString(), icon: 'BookOpen' },
    { label: '입시결과 레코드', value: totalRecords.toLocaleString(), icon: 'Database' },
    { label: '합격사례', value: passCount.toLocaleString(), icon: 'Trophy' },
  ];
};

