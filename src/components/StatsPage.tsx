import React from 'react';
import { Search, Loader2, Database, ChevronDown, Filter } from 'lucide-react';
import { fetchAllAdmissionCases, fetchOfficialStats } from '../lib/admissionService';
import { AdmissionCase, OfficialStat } from '../types';

export default function StatsPage() {
  const [loading, setLoading] = React.useState(true);
  const [statsData, setStatsData] = React.useState<OfficialStat[]>([]);
  
  // Options state
  const [options, setOptions] = React.useState({
    locations: ['전체'],
    universities: ['전체'],
    departments: ['전체'],
    admissionTypes: ['전체'],
    detailedTypes: ['전체']
  });

  // Search state
  const [filters, setFilters] = React.useState({
    location: '전체',
    university: '전체',
    department: '전체',
    admissionType: '전체',
    detailedType: '전체',
    registeredTrend: '전체',
    competitionTrend: '전체',
    averageTrend: '전체',
    cut50Trend: '전체',
    cut70Trend: '전체',
    cut80Trend: '전체',
    gradeBaseField: '평균',
    gradeRangeMin: '1.0',
    gradeRangeMax: '9.0'
  });

  // Debounced filters for expensive calculation
  const [debouncedFilters, setDebouncedFilters] = React.useState(filters);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 150); // 150ms delay is enough for responsiveness vs performance
    return () => clearTimeout(timer);
  }, [filters]);

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 30;

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedFilters]);

  // Initial fetch for metadata and data
  React.useEffect(() => {
    setLoading(true);
    fetchOfficialStats().then((stats) => {
      setStatsData(stats);
      
      // Derive all options
      const normalize = (name: string) => {
        if (name === '국립국립목포대학교') return '국립목포대학교';
        if (name === '국립국립목포해양대학교') return '국립목포해양대학교';
        return name;
      };

      const locations = Array.from(new Set(stats.map(s => s.location))).filter(Boolean).sort();
      const unis = Array.from(new Set(stats.map(s => normalize(s.universityName)))).filter(Boolean).sort();
      const depts = Array.from(new Set(stats.map(s => s.departmentName))).filter(Boolean).sort();
      const adTypes = Array.from(new Set(stats.map(s => s.admissionType))).filter(Boolean).sort();
      const detTypes = Array.from(new Set(stats.map(s => s.detailedType))).filter(Boolean).sort();

      setOptions({
        locations: ['전체', ...locations],
        universities: ['전체', ...unis],
        departments: ['전체', ...depts],
        admissionTypes: ['전체', ...adTypes],
        detailedTypes: ['전체', ...detTypes]
      });
    }).finally(() => setLoading(false));
  }, []);

  // Dynamic Options calculation
  const dynamicOptions = React.useMemo(() => {
    const normalize = (name: string) => {
      if (name === '국립국립목포대학교') return '국립목포대학교';
      if (name === '국립국립목포해양대학교') return '국립목포해양대학교';
      return name;
    };

    let filteredForOptions = statsData;
    
    // For Department options: filter by location and university
    if (filters.location !== '전체') {
      filteredForOptions = filteredForOptions.filter(s => s.location === filters.location);
    }
    if (filters.university !== '전체') {
      filteredForOptions = filteredForOptions.filter(s => normalize(s.universityName) === filters.university);
    }
    
    const depts = Array.from(new Set(filteredForOptions.map(s => s.departmentName))).filter(Boolean).sort();
    
    // For University options: filter by location
    let uniStats = statsData;
    if (filters.location !== '전체') {
      uniStats = uniStats.filter(s => s.location === filters.location);
    }
    const unis = Array.from(new Set(uniStats.map(s => normalize(s.universityName)))).filter(Boolean).sort();

    // Admission Types
    const adTypes = Array.from(new Set(filteredForOptions.map(s => s.admissionType))).filter(Boolean).sort();
    const detTypes = Array.from(new Set(filteredForOptions.map(s => s.detailedType))).filter(Boolean).sort();

    return {
      locations: options.locations, // Locations usually fixed
      universities: ['전체', ...unis],
      departments: ['전체', ...depts],
      admissionTypes: ['전체', ...adTypes],
      detailedTypes: ['전체', ...detTypes]
    };
  }, [statsData, filters.location, filters.university, options.locations]);

  const years = ['2024', '2025', '2026'];

  const filteredStats = React.useMemo(() => {
    const normalize = (name: string) => {
      if (name === '국립국립목포대학교') return '국립목포대학교';
      if (name === '국립국립목포해양대학교') return '국립목포해양대학교';
      return name;
    };

    return statsData.filter(item => {
      // Basic Filters
      if (debouncedFilters.location !== '전체' && item.location !== debouncedFilters.location) return false;
      if (debouncedFilters.university !== '전체' && normalize(item.universityName) !== debouncedFilters.university) return false;
      if (debouncedFilters.department !== '전체' && item.departmentName !== debouncedFilters.department) return false;
      if (debouncedFilters.admissionType !== '전체' && item.admissionType !== debouncedFilters.admissionType) return false;
      if (debouncedFilters.detailedType !== '전체' && item.detailedType !== debouncedFilters.detailedType) return false;

      // Trend Helpers
      const getVal = (year: string, field: keyof OfficialStat['stats']['2024']) => {
        const val = item.stats?.[year]?.[field];
        if (!val || val === '-') return null;
        return Number(String(val).replace(/[^0-9.]/g, ''));
      };

      const checkTrend = (field: string, filterVal: string) => {
        if (filterVal === '전체') return true;
        
        const isGradeField = ['average', 'cut50', 'cut70', 'cut80'].includes(field);
        const v24 = getVal('2024', field);
        const v25 = getVal('2025', field);
        const v26 = getVal('2026', field);

        const isRisingFilter = filterVal.includes('상승');
        const isFallingFilter = filterVal.includes('하락');

        // Helper to check if a single interval matches the desired trend
        const matches = (prev: number | null, curr: number | null) => {
          if (prev === null || curr === null) return false;
          if (isRisingFilter) {
            return isGradeField ? prev > curr : prev < curr;
          }
          if (isFallingFilter) {
            return isGradeField ? prev < curr : prev > curr;
          }
          return true;
        };

        if (filterVal.includes('3년 연속')) {
          return matches(v24, v25) && matches(v25, v26);
        }
        if (filterVal.includes('2년 연속')) {
          return matches(v25, v26);
        }
        if (filterVal.includes('1년')) {
          return matches(v25, v26);
        }
        return true;
      };

      // Registered Count Trend
      if (debouncedFilters.registeredTrend !== '전체') {
        const checkShortfall = (year: string) => {
          const enroll = getVal(year, 'enrollment');
          const reg = getVal(year, 'registeredCount');
          return enroll !== null && reg !== null && reg < enroll;
        };

        if (debouncedFilters.registeredTrend === '최근 3년 연속 미달') {
          if (!checkShortfall('2024') || !checkShortfall('2025') || !checkShortfall('2026')) return false;
        } else if (debouncedFilters.registeredTrend === '최근 2년 연속 미달') {
          if (!checkShortfall('2025') || !checkShortfall('2026')) return false;
        } else if (debouncedFilters.registeredTrend === '최근 1년 미달') {
          if (!checkShortfall('2026')) return false;
        }
      }

      // Other Trends
      if (!checkTrend('competitionRate', debouncedFilters.competitionTrend)) return false;
      if (!checkTrend('average', debouncedFilters.averageTrend)) return false;
      if (!checkTrend('cut50', debouncedFilters.cut50Trend)) return false;
      if (!checkTrend('cut70', debouncedFilters.cut70Trend)) return false;
      if (!checkTrend('cut80', debouncedFilters.cut80Trend)) return false;

      // Grade Range Filter (Based on 3-year average)
      const baseFieldMap: Record<string, keyof OfficialStat['stats']['2024']> = {
        '평균': 'average',
        '50% CUT': 'cut50',
        '70% CUT': 'cut70',
        '80% CUT': 'cut80'
      };
      
      const field = baseFieldMap[debouncedFilters.gradeBaseField];
      if (field) {
        const values = years.map(y => getVal(y, field)).filter(v => v !== null) as number[];
        if (values.length > 0) {
          const threeYearAvg = values.reduce((a, b) => a + b, 0) / values.length;
          const min = parseFloat(debouncedFilters.gradeRangeMin) || 1.0;
          const max = parseFloat(debouncedFilters.gradeRangeMax) || 9.0;
          if (threeYearAvg < Math.min(min, max) || threeYearAvg > Math.max(min, max)) return false;
        } else {
          // If no data at all for these years, we might want to exclude it if a filter is set
          if (debouncedFilters.gradeRangeMin !== '1.0' || debouncedFilters.gradeRangeMax !== '9.0') return false;
        }
      }

      return true;
    });
  }, [statsData, debouncedFilters, years]);

  const paginatedStats = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStats.slice(start, start + itemsPerPage);
  }, [filteredStats, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredStats.length / itemsPerPage);

  if (loading) {
    return (
      <div className="pt-40 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-text-dim text-sm animate-pulse">통계 데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 font-sans">
      <div className="mb-12 text-center lg:text-left">
        <h1 className="text-4xl font-black tracking-tight mb-3 text-white">대학발표 3개년 통계</h1>
        <p className="text-text-dim font-medium text-base">각 대학교에서 공식 발표한 최근 3개년 입시 결과를 통합 분석하여 제공합니다.</p>
      </div>

      {/* Conditional Search Box */}
      <div className="glass-card mb-10 border border-white/10 p-6">
        {/* Row 1: Basic Filters */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <FilterSelect 
            label="지역" 
            value={filters.location} 
            options={dynamicOptions.locations}
            onChange={(val) => setFilters(prev => ({ ...prev, location: val }))}
          />
          <FilterSelect 
            label="학교명" 
            value={filters.university} 
            options={dynamicOptions.universities}
            onChange={(val) => setFilters(prev => ({ ...prev, university: val }))}
          />
          <FilterSelect 
            label="학과" 
            value={filters.department} 
            options={dynamicOptions.departments}
            onChange={(val) => setFilters(prev => ({ ...prev, department: val }))}
          />
          <FilterSelect 
            label="전형" 
            value={filters.admissionType} 
            options={dynamicOptions.admissionTypes}
            onChange={(val) => setFilters(prev => ({ ...prev, admissionType: val }))}
          />
          <FilterSelect 
            label="세부전형" 
            value={filters.detailedType} 
            options={dynamicOptions.detailedTypes}
            onChange={(val) => setFilters(prev => ({ ...prev, detailedType: val }))}
          />
        </div>

        {/* Row 2: Grade Range Row */}
        <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="md:col-span-3 flex flex-col gap-3">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">등급 범위 (3개년 평균 기준)</label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                  {filters.gradeRangeMin} - {filters.gradeRangeMax} 등급
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <input 
                type="text" 
                value={filters.gradeRangeMin} 
                onChange={(e) => {
                  const val = e.target.value;
                  setFilters(prev => ({ ...prev, gradeRangeMin: val }));
                  const num = parseFloat(val);
                  if (!isNaN(num) && num >= 1.0 && num <= parseFloat(filters.gradeRangeMax)) {
                    setFilters(prev => ({ ...prev, gradeRangeMin: num.toFixed(1) }));
                  }
                }}
                className="w-16 bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-center font-bold outline-none focus:border-primary/50 transition-colors"
              />
              <div className="flex-1 px-2 flex items-center gap-2 h-10 bg-white/[0.02] rounded-xl border border-white/5">
                <input 
                  type="range" 
                  min="1" 
                  max="9" 
                  step="0.1" 
                  value={filters.gradeRangeMin} 
                  onChange={(e) => {
                    const val = Math.min(parseFloat(e.target.value), parseFloat(filters.gradeRangeMax)).toFixed(1);
                    setFilters(prev => ({ ...prev, gradeRangeMin: val }));
                  }} 
                  className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary" 
                />
                <input 
                  type="range" 
                  min="1" 
                  max="9" 
                  step="0.1" 
                  value={filters.gradeRangeMax} 
                  onChange={(e) => {
                    const val = Math.max(parseFloat(e.target.value), parseFloat(filters.gradeRangeMin)).toFixed(1);
                    setFilters(prev => ({ ...prev, gradeRangeMax: val }));
                  }} 
                  className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary" 
                />
              </div>
              <input 
                type="text" 
                value={filters.gradeRangeMax} 
                onChange={(e) => {
                  const val = e.target.value;
                  setFilters(prev => ({ ...prev, gradeRangeMax: val }));
                  const num = parseFloat(val);
                  if (!isNaN(num) && num <= 9.0 && num >= parseFloat(filters.gradeRangeMin)) {
                    setFilters(prev => ({ ...prev, gradeRangeMax: num.toFixed(1) }));
                  }
                }}
                className="w-16 bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-center font-bold outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          <FilterSelect 
            label="등급 적용 기준" 
            value={filters.gradeBaseField} 
            options={['평균', '50% CUT', '70% CUT', '80% CUT']}
            onChange={(val) => setFilters(prev => ({ ...prev, gradeBaseField: val }))}
          />
        </div>

        {/* Row 3: Trend Filters */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-8 pt-6 border-t border-white/5">
          <FilterSelect 
            label="등록인원 추이" 
            value={filters.registeredTrend} 
            options={['전체', '최근 3년 연속 미달', '최근 2년 연속 미달', '최근 1년 미달']}
            onChange={(val) => setFilters(prev => ({ ...prev, registeredTrend: val }))}
          />
          {['competitionTrend', 'averageTrend', 'cut50Trend', 'cut70Trend', 'cut80Trend'].map((key) => {
            const labels: any = {
              competitionTrend: '경쟁률 추이',
              averageTrend: '평균 추이',
              cut50Trend: '50% CUT 추이',
              cut70Trend: '70% CUT 추이',
              cut80Trend: '80% CUT 추이'
            };
            return (
              <FilterSelect 
                key={key}
                label={labels[key]} 
                value={(filters as any)[key]} 
                options={['전체', '최근 3년 연속 하락', '최근 3년 연속 상승', '최근 2년 연속 하락', '최근 2년 연속 상승', '최근 1년 하락', '최근 1년 상승']}
                onChange={(val) => setFilters(prev => ({ ...prev, [key]: val }))}
              />
            );
          })}
        </div>
      </div>

      {/* Multi-Year Stats Table */}
      <div className="glass-card border border-white/10 overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="bg-white/5 text-[10px] font-black text-text-dim uppercase tracking-tighter text-center">
              {/* Row 1: Main Categories */}
              <tr className="border-b border-white/10">
                <th rowSpan={2} className="px-4 py-4 w-[120px] bg-white/[0.02] border-r border-white/10 sticky left-0 z-20" style={{ backgroundColor: '#111' }}>학교/학과</th>
                <th colSpan={3} className="px-2 py-4 border-r border-white/10 bg-blue-500/5">모집인원</th>
                <th colSpan={3} className="px-2 py-4 border-r border-white/10 bg-indigo-500/5">등록인원</th>
                <th colSpan={3} className="px-2 py-4 border-r border-white/10 bg-emerald-500/5">경쟁률</th>
                <th colSpan={3} className="px-2 py-4 border-r border-white/10 bg-amber-500/5">충원합격 최종순위</th>
                <th colSpan={3} className="px-2 py-4 border-r border-white/10 bg-purple-500/5">평균</th>
                <th colSpan={3} className="px-2 py-4 border-r border-white/10 bg-rose-500/5">50% CUT</th>
                <th colSpan={3} className="px-2 py-4 border-r border-white/10 bg-pink-500/5">70% CUT</th>
                <th colSpan={3} className="px-2 py-4 bg-orange-500/5">80% CUT</th>
              </tr>
              {/* Row 2: Years */}
              <tr className="border-b border-white/10">
                {/* Generated 3 slots for each category */}
                {[1,2,3,4,5,6,7,8].map((_, catIdx) => (
                  <React.Fragment key={catIdx}>
                    {years.map(year => (
                      <th key={`${catIdx}-${year}`} className={`px-2 py-2 text-[9px] border-r border-white/5 last:border-r-0 font-mono ${year === '2026' ? 'text-primary' : ''}`}>
                        {year}
                      </th>
                    ))}
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-[11px] font-bold text-white/80">
              {loading ? (
                <tr>
                  <td colSpan={25} className="py-32 text-center overflow-hidden">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="animate-spin text-primary" size={40} />
                      <p className="text-lg font-black text-white animate-pulse">데이터를 불러오는 중...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedStats.length > 0 ? (
                paginatedStats.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-4 border-r border-white/10 bg-white/[0.01] sticky left-0 z-10 shadow-xl" style={{ backgroundColor: '#0A0A0A' }}>
                      <div className="font-black text-white text-xs">
                        {item.universityName === '국립국립목포대학교' ? '국립목포대학교' : 
                         item.universityName === '국립국립목포해양대학교' ? '국립목포해양대학교' : item.universityName}
                      </div>
                      <div className="text-[10px] text-text-dim font-bold">{item.departmentName}</div>
                      <div className="text-[9px] text-primary/60">{item.admissionType} | {item.detailedType}</div>
                    </td>
                    {/* 모집인원 */}
                    {years.map(year => (
                      <td key={`enroll-${year}`} className="px-2 py-4 text-center border-r border-white/5 font-mono text-white/60">
                        {item.stats?.[year]?.enrollment || '-'}
                      </td>
                    ))}
                    {/* 등록인원 */}
                    {years.map(year => {
                      const stats = item.stats || {};
                      const yearStat = stats[year] || {};
                      const enrollStr = yearStat.enrollment || '';
                      const regStr = yearStat.registeredCount || '';
                      const enroll = Number(enrollStr.replace(/[^0-9]/g, ''));
                      const reg = Number(regStr.replace(/[^0-9]/g, ''));
                      const hasStats = enrollStr !== '' && enrollStr !== '-' && regStr !== '' && regStr !== '-';
                      
                      return (
                        <td key={`registered-${year}`} className="px-2 py-4 text-center border-r border-white/5 font-mono text-indigo-400">
                          <div className="flex flex-col items-center gap-1">
                            <span>{regStr || '-'}</span>
                            {hasStats && (
                              reg < enroll ? (
                                <span className="text-[9px] font-black text-blue-500 animate-pulse">미달</span>
                              ) : (
                                <span className="text-[9px] font-black text-rose-500/60">충족</span>
                              )
                            )}
                          </div>
                        </td>
                      );
                    })}
                    {/* 경쟁률 */}
                    {years.map(year => (
                      <td key={`competition-${year}`} className="px-2 py-4 text-center border-r border-white/5 font-mono text-emerald-400/80">
                        {item.stats?.[year]?.competitionRate || '-'}
                      </td>
                    ))}
                    {/* 충원합격 */}
                    {years.map(year => (
                      <td key={`waitlist-${year}`} className="px-2 py-4 text-center border-r border-white/5 font-mono text-amber-400/80">
                        {item.stats?.[year]?.waitlistLastRank || '-'}
                      </td>
                    ))}
                    {/* 평균 */}
                    {years.map(year => (
                      <td key={`avg-${year}`} className="px-2 py-4 text-center border-r border-white/5 font-mono text-purple-400/80">
                        {item.stats?.[year]?.average || '-'}
                      </td>
                    ))}
                    {/* 50% cut */}
                    {years.map(year => (
                      <td key={`cut50-${year}`} className="px-2 py-4 text-center border-r border-white/5 font-mono text-rose-400/80">
                        {item.stats?.[year]?.cut50 || '-'}
                      </td>
                    ))}
                    {/* 70% cut */}
                    {years.map(year => (
                      <td key={`cut70-${year}`} className="px-2 py-4 text-center border-r border-white/5 font-mono text-pink-400/80">
                        {item.stats?.[year]?.cut70 || '-'}
                      </td>
                    ))}
                    {/* 80% cut */}
                    {years.map(year => (
                      <td key={`cut80-${year}`} className="px-2 py-4 text-center border-r border-white/5 font-mono text-orange-400/80 last:border-r-0">
                        {item.stats?.[year]?.cut80 || '-'}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={25} className="px-4 py-20 text-center">
                    <Database className="mx-auto mb-4 text-white/5" size={48} />
                    <p className="text-text-dim text-sm font-bold">조건에 맞는 데이터가 없습니다.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-6 bg-white/[0.01] border-t border-white/5">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-all text-white"
            >
              <ChevronDown className="rotate-90 w-5 h-5" />
            </button>
            
            <div className="flex gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum = 1;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-lg font-black text-xs transition-all ${
                      currentPage === pageNum 
                        ? 'bg-primary text-secondary' 
                        : 'hover:bg-white/5 text-text-dim'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-all text-white"
            >
              <ChevronDown className="-rotate-90 w-5 h-5" />
            </button>
          </div>
        )}
      </div>
      
      <div className="mt-8 flex items-center justify-center gap-3 p-6 glass-card border border-white/5">
        <Database className="text-primary/40" size={20} />
        <p className="text-text-dim text-sm font-medium">관리자 페이지에서 데이터를 업로드하면 해당 통계표가 자동으로 업데이트됩니다.</p>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black text-text-dim uppercase tracking-widest pl-1">{label}</label>
      <div className="relative group">
        <select 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-xs font-bold text-white outline-none group-hover:border-white/20 transition-colors cursor-pointer"
        >
          {options.map((opt, idx) => <option key={`${opt}-${idx}`} value={opt} className="bg-[#0A0A0A]">{opt}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim group-hover:text-primary transition-colors pointer-events-none" />
      </div>
    </div>
  );
}
