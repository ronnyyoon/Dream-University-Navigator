import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Loader2, Filter, Info, ArrowUpDown, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';
import { fetchOfficialStats } from '../lib/admissionService';
import { OfficialStat } from '../types';

export default function StatsGraphPage() {
  const [loading, setLoading] = React.useState(true);
  const [statsData, setStatsData] = React.useState<OfficialStat[]>([]);
  const [expandedUni, setExpandedUni] = React.useState<string | null>(null);

  // Filters state
  const [filters, setFilters] = React.useState({
    location: '전체',
    university: '전체',
    department: '전체',
    admissionType: '전체', // '학생부종합', '학생부교과', '논술', '실기', '기타'
    gradeCriteria: 'cut70', // 'average', 'cut50', 'cut70'
  });

  // Fetch initial data
  React.useEffect(() => {
    setLoading(true);
    fetchOfficialStats()
      .then((stats) => {
        setStatsData(stats);
      })
      .catch((err) => {
        console.error("Error loading stats for graph:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const normalize = (name: string) => {
    if (!name) return '';
    if (name === '국립국립목포대학교') return '국립목포대학교';
    if (name === '국립국립목포해양대학교') return '국립목포해양대학교';
    return name;
  };

  // Helper to check standard admission type mapping
  const matchesAdmissionType = (itemType: string, selectedType: string) => {
    if (selectedType === '전체') return true;
    if (selectedType === '기타') {
      return !['학생부종합', '학생부교과', '논술', '실기'].includes(itemType);
    }
    return itemType === selectedType;
  };

  // Dynamic Options
  const dynamicOptions = React.useMemo(() => {
    let filtered = statsData;

    if (filters.location !== '전체') {
      filtered = filtered.filter(s => s.location === filters.location);
    }
    if (filters.university !== '전체') {
      filtered = filtered.filter(s => normalize(s.universityName) === filters.university);
    }

    const locations = Array.from(new Set(statsData.map(s => s.location))).filter(Boolean).sort();
    const universities = Array.from(new Set(statsData.map(s => normalize(s.universityName)))).filter(Boolean).sort();
    const departments = Array.from(new Set(filtered.map(s => s.departmentName))).filter(Boolean).sort();

    return {
      locations: ['전체', ...locations],
      universities: ['전체', ...universities],
      departments: ['전체', ...departments],
      admissionTypes: ['전체', '학생부종합', '학생부교과', '논술', '실기', '기타']
    };
  }, [statsData, filters.location, filters.university]);

  // Aggregate stats per university for visualization
  const universityChartData = React.useMemo(() => {
    // 1. Filter raw data items
    const filteredItems = statsData.filter(item => {
      if (filters.location !== '전체' && item.location !== filters.location) return false;
      if (filters.university !== '전체' && normalize(item.universityName) !== filters.university) return false;
      if (filters.department !== '전체' && item.departmentName !== filters.department) return false;
      if (!matchesAdmissionType(item.admissionType, filters.admissionType)) return false;
      return true;
    });

    // 2. Group by university and extract grade range
    const uniGroups: Record<string, {
      universityName: string;
      location: string;
      allGrades: Array<{ department: string; type: string; detail: string; year: string; grade: number }>;
      minGrade: number;
      maxGrade: number;
    }> = {};

    filteredItems.forEach(item => {
      const uniName = normalize(item.universityName);
      if (!uniName) return;

      if (!uniGroups[uniName]) {
        uniGroups[uniName] = {
          universityName: uniName,
          location: item.location || '기타',
          allGrades: [],
          minGrade: 9.0,
          maxGrade: 1.0,
        };
      }

      // Collect grades across 2024, 2025, 2026
      ['2024', '2025', '2026'].forEach(year => {
        const statsObj = item.stats?.[year];
        if (!statsObj) return;

        const rawGrade = statsObj[filters.gradeCriteria as 'average' | 'cut50' | 'cut70' | 'cut80'];
        if (!rawGrade || rawGrade === '-') return;

        const gradeNum = Number(String(rawGrade).replace(/[^0-9.]/g, ''));
        if (isNaN(gradeNum) || gradeNum < 1.0 || gradeNum > 9.0) return;

        uniGroups[uniName].allGrades.push({
          department: item.departmentName,
          type: item.admissionType,
          detail: item.detailedType,
          year,
          grade: gradeNum
        });
      });
    });

    // 3. Compute ranges
    const result = Object.values(uniGroups)
      .map(uni => {
        if (uni.allGrades.length === 0) {
          return {
            ...uni,
            minGrade: 0,
            maxGrade: 0,
          };
        }
        const gradesOnly = uni.allGrades.map(g => g.grade);
        const minVal = Math.min(...gradesOnly);
        const maxVal = Math.max(...gradesOnly);
        return {
          ...uni,
          minGrade: minVal,
          maxGrade: maxVal,
        };
      })
      .filter(uni => uni.allGrades.length > 0) // Only show universities with valid data
      .sort((a, b) => a.minGrade - b.minGrade); // Sort by best grade first

    return result;
  }, [statsData, filters]);

  // Handle resets
  const handleResetFilters = () => {
    setFilters({
      location: '전체',
      university: '전체',
      department: '전체',
      admissionType: '전체',
      gradeCriteria: 'cut70',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase mb-3">
          <BarChart2 size={12} />
          Visual Graph Analysis
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          대학별 학생부 등급 <span className="text-primary">그래프 검색</span>
        </h1>
        <p className="text-text-dim text-sm mt-1">
          성적 적용 기준을 선택하여 1등급부터 9등급까지의 분포를 한눈에 비교해보세요.
        </p>
      </div>

      {/* Filter Section */}
      <div className="glass-card p-6 border border-white/10 rounded-3xl mb-8 space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2 text-white font-black text-sm">
            <Filter size={16} className="text-primary" />
            검색 조건 설정
          </div>
          <button 
            onClick={handleResetFilters}
            className="text-xs text-text-dim hover:text-white font-bold transition-colors"
          >
            필터 초기화
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest pl-1">지역</label>
            <div className="relative">
              <select 
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value, university: '전체', department: '전체' }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-xs font-bold appearance-none outline-none focus:border-primary/50 transition-all cursor-pointer"
              >
                {dynamicOptions.locations.map(loc => (
                  <option key={loc} value={loc} className="bg-zinc-950 text-white">{loc}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" size={14} />
            </div>
          </div>

          {/* University */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest pl-1">학교명</label>
            <div className="relative">
              <select 
                value={filters.university}
                onChange={(e) => setFilters(prev => ({ ...prev, university: e.target.value, department: '전체' }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-xs font-bold appearance-none outline-none focus:border-primary/50 transition-all cursor-pointer"
              >
                {dynamicOptions.universities.map(uni => (
                  <option key={uni} value={uni} className="bg-zinc-950 text-white">{uni}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" size={14} />
            </div>
          </div>

          {/* Department */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest pl-1">학과</label>
            <div className="relative">
              <select 
                value={filters.department}
                onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-xs font-bold appearance-none outline-none focus:border-primary/50 transition-all cursor-pointer"
              >
                {dynamicOptions.departments.map(dept => (
                  <option key={dept} value={dept} className="bg-zinc-950 text-white">{dept}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" size={14} />
            </div>
          </div>

          {/* Admission Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest pl-1">전형</label>
            <div className="relative">
              <select 
                value={filters.admissionType}
                onChange={(e) => setFilters(prev => ({ ...prev, admissionType: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-xs font-bold appearance-none outline-none focus:border-primary/50 transition-all cursor-pointer"
              >
                {dynamicOptions.admissionTypes.map(type => (
                  <option key={type} value={type} className="bg-zinc-950 text-white">{type}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" size={14} />
            </div>
          </div>

          {/* Grade Criteria */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest pl-1">성적 적용 기준</label>
            <div className="relative">
              <select 
                value={filters.gradeCriteria}
                onChange={(e) => setFilters(prev => ({ ...prev, gradeCriteria: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-xs font-bold appearance-none outline-none focus:border-primary/50 transition-all cursor-pointer"
              >
                <option value="cut70" className="bg-zinc-950 text-white">70% 컷 (기본값)</option>
                <option value="average" className="bg-zinc-950 text-white">평균 성적</option>
                <option value="cut50" className="bg-zinc-950 text-white">50% 컷</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* Graph Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-primary" size={36} />
          <p className="text-sm font-bold text-text-dim">데이터 분석 중...</p>
        </div>
      ) : universityChartData.length === 0 ? (
        <div className="glass-card border border-white/5 rounded-3xl p-16 text-center text-text-dim">
          <Info className="mx-auto text-zinc-600 mb-4 animate-pulse" size={40} />
          <h3 className="text-lg font-black text-white">검색 조건에 부합하는 데이터가 없습니다.</h3>
          <p className="text-sm text-text-dim mt-2">다른 검색 조건을 시도해 보세요.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Chart Table Legend / Scale header */}
          <div className="hidden lg:grid grid-cols-[200px_100px_1fr] px-6 py-4 bg-white/[0.02] border border-white/5 rounded-2xl text-xs font-black text-text-dim uppercase tracking-wider items-center">
            <div>대학명 (1열)</div>
            <div className="text-center border-l border-r border-white/5">지역 (2열)</div>
            <div className="pl-8 relative h-6 flex justify-between w-full select-none">
              {/* Scale points 1.0 to 9.0 */}
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((val) => (
                <div key={val} className="flex flex-col items-center flex-1 relative">
                  <span className="text-[10px] font-bold text-white/50">{val}등급</span>
                  <div className="h-1.5 w-px bg-white/20 mt-1" />
                </div>
              ))}
            </div>
          </div>

          {/* List of university range bars */}
          <div className="space-y-3">
            {universityChartData.map((uni) => {
              const leftPercent = ((uni.minGrade - 1.0) / 8.0) * 100;
              const widthPercent = ((uni.maxGrade - uni.minGrade) / 8.0) * 100;
              const isExpanded = expandedUni === uni.universityName;

              return (
                <div 
                  key={uni.universityName}
                  className="glass-card border border-white/5 rounded-2xl hover:border-white/15 transition-all overflow-hidden"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-[200px_100px_1fr] p-5 lg:p-6 items-center gap-4 lg:gap-0">
                    {/* Uni Column */}
                    <div className="flex items-center justify-between lg:justify-start gap-3">
                      <div>
                        <span className="text-sm font-black text-white group-hover:text-primary transition-colors block">
                          {uni.universityName}
                        </span>
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold mt-1 inline-block">
                          분석사례 {uni.allGrades.length}개
                        </span>
                      </div>
                      <button
                        onClick={() => setExpandedUni(isExpanded ? null : uni.universityName)}
                        className="lg:hidden p-1.5 hover:bg-white/5 rounded-lg text-text-dim transition-colors"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>

                    {/* Region Column */}
                    <div className="text-center text-xs font-black text-text-dim bg-white/[0.02] py-1.5 rounded-lg lg:bg-transparent lg:py-0 lg:border-l lg:border-r lg:border-white/5">
                      {uni.location}
                    </div>

                    {/* Horizontal Range Bar Column */}
                    <div className="lg:pl-8 flex flex-col gap-2 relative">
                      <div className="relative h-12 flex items-center w-full">
                        {/* Background track & vertical grid lines */}
                        <div className="absolute inset-x-0 h-2 bg-white/5 rounded-full" />
                        
                        <div className="absolute inset-x-0 h-full flex justify-between pointer-events-none select-none">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((val) => (
                            <div key={val} className="flex-1 border-r border-white/[0.03] last:border-0 h-full flex items-center justify-center relative">
                              <span className="lg:hidden text-[9px] font-bold text-white/20 absolute top-0">{val}등급</span>
                            </div>
                          ))}
                        </div>

                        {/* Active range bar */}
                        <div 
                          className="absolute h-4 rounded-full bg-gradient-to-r from-primary to-teal-400 shadow-lg shadow-primary/20 flex items-center"
                          style={{
                            left: `${leftPercent}%`,
                            width: `${Math.max(widthPercent, 2)}%`, // Ensure at least small dot is visible if min=max
                          }}
                        >
                          {/* Inner glowing pulse */}
                          <div className="w-full h-full bg-white/10 rounded-full animate-pulse" />
                        </div>

                        {/* Left & Right Pins / Labels */}
                        <div 
                          className="absolute text-[10px] font-mono font-bold bg-secondary border border-white/20 text-white px-2 py-0.5 rounded-md -translate-x-1/2 -top-1 shadow-md whitespace-nowrap pointer-events-none"
                          style={{ left: `${leftPercent}%` }}
                        >
                          {uni.minGrade.toFixed(2)}
                        </div>
                        {uni.maxGrade !== uni.minGrade && (
                          <div 
                            className="absolute text-[10px] font-mono font-bold bg-secondary border border-white/20 text-white px-2 py-0.5 rounded-md -translate-x-1/2 -bottom-1 shadow-md whitespace-nowrap pointer-events-none"
                            style={{ left: `${leftPercent + widthPercent}%` }}
                          >
                            {uni.maxGrade.toFixed(2)}
                          </div>
                        )}
                      </div>

                      {/* Detail toggler for desktop */}
                      <div className="hidden lg:flex items-center justify-between">
                        <span className="text-[10px] text-text-dim font-bold">
                          분포 범위: <span className="text-white font-mono">{uni.minGrade.toFixed(2)}</span> ~ <span className="text-white font-mono">{uni.maxGrade.toFixed(2)}</span> 등급
                        </span>
                        <button
                          onClick={() => setExpandedUni(isExpanded ? null : uni.universityName)}
                          className="text-[10px] text-primary hover:underline font-black flex items-center gap-1 transition-all"
                        >
                          {isExpanded ? (
                            <>모집단위별 목록 접기 <ChevronUp size={12} /></>
                          ) : (
                            <>모집단위별 목록 보기 ({uni.allGrades.length}) <ChevronDown size={12} /></>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail items (show list of specific departments and sub-grades inside) */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white/[0.01] border-t border-white/5 overflow-hidden"
                      >
                        <div className="p-5 lg:p-6 space-y-3">
                          <h4 className="text-xs font-black text-text-dim tracking-wider uppercase mb-2">분석에 반영된 세부 수시모집단위 및 전형 목록</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {uni.allGrades.map((g, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                <div>
                                  <div className="text-xs font-bold text-white">{g.department}</div>
                                  <div className="text-[10px] text-text-dim font-bold mt-0.5">
                                    {g.year}학년도 | {g.type} ({g.detail})
                                  </div>
                                </div>
                                <div className="text-sm font-black text-primary font-mono bg-primary/10 px-2.5 py-1 rounded-lg">
                                  {g.grade.toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
