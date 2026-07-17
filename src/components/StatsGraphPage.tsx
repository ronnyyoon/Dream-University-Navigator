import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Filter, Info, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';
import { fetchOfficialStats } from '../lib/admissionService';
import { OfficialStat } from '../types';

export default function StatsGraphPage() {
  const [loading, setLoading] = React.useState(true);
  const [statsData, setStatsData] = React.useState<OfficialStat[]>([]);
  const [expandedUni, setExpandedUni] = React.useState<string | null>(null);

  // Filters state (with targetGrade added for request 6)
  const [filters, setFilters] = React.useState({
    location: '전체',
    university: '전체',
    department: '전체',
    admissionType: '전체', // '학생부종합', '학생부교과', '논술', '실기', '기타'
    gradeCriteria: 'cut70', // 'average', 'cut50', 'cut70'
    targetGrade: '', // 특정 성적값 입력 검색 조건 (Request 6)
  });

  // State for detail modal (Request 7)
  const [detailModal, setDetailModal] = React.useState<{
    universityName: string;
    departmentName: string;
    selectedType: string;
    selectedDetail: string;
  } | null>(null);

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

  // Helper to parse grade strictly and exclude non-numeric texts like "1명 이하", "3명 이하"
  const parseGrade = (val: any): number | null => {
    if (val === undefined || val === null) return null;
    const trimmed = String(val).trim();
    if (!trimmed || trimmed === '-' || trimmed === '0' || trimmed === '0.0' || trimmed === '0.00') return null;
    if (trimmed.includes('이하') || !/^\d+(\.\d+)?$/.test(trimmed)) {
      return null;
    }
    const parsed = parseFloat(trimmed);
    if (isNaN(parsed) || parsed < 1.0 || parsed > 9.0) {
      return null;
    }
    return parsed;
  };

  // Helper to check standard admission type mapping
  const matchesAdmissionType = (itemType: string, selectedType: string) => {
    if (selectedType === '전체') return true;
    if (selectedType === '기타') {
      return !['학생부종합', '학생부교과', '논술', '실기'].includes(itemType);
    }
    return itemType === selectedType;
  };

  // Dynamic Options for dropdown filters
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

  // Aggregate stats per university for visualization (specifically for 2026 academic year per Request 3 & 4)
  const universityChartData = React.useMemo(() => {
    // 1. Filter raw data items
    const filteredItems = statsData.filter(item => {
      if (filters.location !== '전체' && item.location !== filters.location) return false;
      if (filters.university !== '전체' && normalize(item.universityName) !== filters.university) return false;
      if (filters.department !== '전체' && item.departmentName !== filters.department) return false;
      if (!matchesAdmissionType(item.admissionType, filters.admissionType)) return false;
      return true;
    });

    // 2. Group by university and extract 2026 grade ranges strictly
    const uniRawItems: Record<string, {
      universityName: string;
      location: string;
      items: typeof filteredItems;
    }> = {};

    filteredItems.forEach(item => {
      const uniName = normalize(item.universityName);
      if (!uniName) return;

      if (!uniRawItems[uniName]) {
        uniRawItems[uniName] = {
          universityName: uniName,
          location: item.location || '기타',
          items: []
        };
      }
      uniRawItems[uniName].items.push(item);
    });

    const uniGroups: Record<string, {
      universityName: string;
      location: string;
      allGrades: Array<{ department: string; type: string; detail: string; year: string; grade: number | null }>;
      minGrade: number;
      maxGrade: number;
    }> = {};

    Object.entries(uniRawItems).forEach(([uniName, uniData]) => {
      const processedGrades: Array<{
        department: string;
        type: string;
        detail: string;
        year: string;
        grade: number | null;
      }> = [];

      // Group by department name
      const itemsByDept: Record<string, typeof filteredItems> = {};
      uniData.items.forEach(item => {
        if (!itemsByDept[item.departmentName]) {
          itemsByDept[item.departmentName] = [];
        }
        itemsByDept[item.departmentName].push(item);
      });

      Object.entries(itemsByDept).forEach(([deptName, deptItems]) => {
        // Extract 2026 grade for each item
        const deptItemsWithGrades = deptItems.map(item => {
          let gradeNum: number | null = null;
          const statsObj = item.stats?.['2026'];
          if (statsObj) {
            const rawGrade = statsObj[filters.gradeCriteria as 'average' | 'cut50' | 'cut70' | 'cut80'];
            gradeNum = parseGrade(rawGrade);
          }
          return {
            department: item.departmentName,
            type: item.admissionType,
            detail: item.detailedType,
            year: '2026',
            grade: gradeNum
          };
        });

        if (filters.admissionType === '전체') {
          const getMajorType = (t: string) => {
            if (['학생부종합', '학생부교과', '논술', '실기'].includes(t)) {
              return t;
            }
            return '기타';
          };

          const itemsByMajorType: Record<string, typeof deptItemsWithGrades> = {};
          deptItemsWithGrades.forEach(item => {
            const major = getMajorType(item.type);
            if (!itemsByMajorType[major]) {
              itemsByMajorType[major] = [];
            }
            itemsByMajorType[major].push(item);
          });

          let hasAnyValidGrade = false;
          const majorRepresentatives: typeof deptItemsWithGrades = [];

          ['학생부종합', '학생부교과', '논술', '실기', '기타'].forEach(major => {
            const majorItems = itemsByMajorType[major] || [];
            if (majorItems.length === 0) return;

            const validItems = majorItems.filter(item => item.grade !== null);
            if (validItems.length > 0) {
              hasAnyValidGrade = true;
              let bestItem = validItems[0];
              validItems.forEach(item => {
                if (item.grade! < bestItem.grade!) {
                  bestItem = item;
                }
              });
              majorRepresentatives.push(bestItem);
            }
          });

          if (hasAnyValidGrade) {
            processedGrades.push(...majorRepresentatives);
          } else {
            const firstItem = deptItemsWithGrades[0];
            processedGrades.push({
              department: firstItem.department,
              type: firstItem.type,
              detail: firstItem.detail,
              year: '2026',
              grade: null
            });
          }
        } else {
          const validItems = deptItemsWithGrades.filter(item => item.grade !== null);
          if (validItems.length > 0) {
            let bestItem = validItems[0];
            validItems.forEach(item => {
              if (item.grade! < bestItem.grade!) {
                bestItem = item;
              }
            });
            processedGrades.push(bestItem);
          } else if (deptItemsWithGrades.length > 0) {
            const firstItem = deptItemsWithGrades[0];
            processedGrades.push({
              department: firstItem.department,
              type: firstItem.type,
              detail: firstItem.detail,
              year: '2026',
              grade: null
            });
          }
        }
      });

      uniGroups[uniName] = {
        universityName: uniName,
        location: uniData.location,
        allGrades: processedGrades,
        minGrade: 9.0,
        maxGrade: 1.0
      };
    });

    // 3. Compute exact ranges based only on valid numeric grades (excluding 1명 이하, etc.)
    let result = Object.values(uniGroups)
      .map(uni => {
        const gradesOnly = uni.allGrades
          .map(g => g.grade)
          .filter((g): g is number => g !== null);

        if (gradesOnly.length === 0) {
          return {
            ...uni,
            minGrade: 0,
            maxGrade: 0,
          };
        }
        const minVal = Math.min(...gradesOnly);
        const maxVal = Math.max(...gradesOnly);
        return {
          ...uni,
          minGrade: minVal,
          maxGrade: maxVal,
        };
      })
      // Only show the university in the chart if it has at least one valid grade in 2026
      .filter(uni => uni.minGrade > 0 && uni.maxGrade > 0);

    // 4. Request 6: Target grade range inclusion search
    if (filters.targetGrade) {
      const targetNum = parseFloat(filters.targetGrade);
      if (!isNaN(targetNum)) {
        result = result.filter(uni => targetNum >= uni.minGrade && targetNum <= uni.maxGrade);
      }
    }

    // Sort by best grade (ascending minimum)
    return result.sort((a, b) => a.minGrade - b.minGrade);
  }, [statsData, filters]);

  // Handle resets
  const handleResetFilters = () => {
    setFilters({
      location: '전체',
      university: '전체',
      department: '전체',
      admissionType: '전체',
      gradeCriteria: 'cut70',
      targetGrade: '',
    });
  };

  // Open detail modal with first available types
  const handleOpenDetails = (uniName: string, deptName: string, type?: string, detail?: string) => {
    const matching = statsData.filter(s => 
      normalize(s.universityName) === normalize(uniName) && 
      s.departmentName === deptName
    );
    if (matching.length === 0) return;
    
    let targetType = type || matching[0].admissionType;
    let targetDetail = detail || matching[0].detailedType;

    // Verify if this type and detail exist in matching.
    const exists = matching.some(s => s.admissionType === targetType && s.detailedType === targetDetail);
    if (!exists) {
      // If the exact combination doesn't exist, try to find one matching the type at least
      const typeMatch = matching.find(s => s.admissionType === targetType);
      if (typeMatch) {
        targetType = typeMatch.admissionType;
        targetDetail = typeMatch.detailedType;
      } else {
        targetType = matching[0].admissionType;
        targetDetail = matching[0].detailedType;
      }
    }

    setDetailModal({
      universityName: uniName,
      departmentName: deptName,
      selectedType: targetType,
      selectedDetail: targetDetail,
    });
  };

  // Handle dynamic dropdown changes in modal (Request 7)
  const modalInfo = React.useMemo(() => {
    if (!detailModal) return null;
    const { universityName, departmentName, selectedType, selectedDetail } = detailModal;
    
    const matching = statsData.filter(s => 
      normalize(s.universityName) === normalize(universityName) && 
      s.departmentName === departmentName
    );

    const availableTypes = Array.from(new Set(matching.map(s => s.admissionType))).filter(Boolean);
    const matchingForType = matching.filter(s => s.admissionType === selectedType);
    const availableDetails = Array.from(new Set(matchingForType.map(s => s.detailedType))).filter(Boolean);

    const finalStat = matchingForType.find(s => s.detailedType === selectedDetail) || matchingForType[0] || matching[0];

    return {
      availableTypes,
      availableDetails,
      finalStat,
    };
  }, [detailModal, statsData]);

  const handleModalTypeChange = (newType: string) => {
    if (!detailModal) return;
    const matching = statsData.filter(s => 
      normalize(s.universityName) === normalize(detailModal.universityName) && 
      s.departmentName === detailModal.departmentName &&
      s.admissionType === newType
    );
    const firstDetail = matching[0]?.detailedType || '';
    setDetailModal(prev => prev ? {
      ...prev,
      selectedType: newType,
      selectedDetail: firstDetail
    } : null);
  };

  const handleModalDetailChange = (newDetail: string) => {
    setDetailModal(prev => prev ? {
      ...prev,
      selectedDetail: newDetail
    } : null);
  };

  // Render comparative data rows for modal (Request 7)
  const renderModalRow = (
    label: string, 
    valueKey: 'enrollment' | 'competitionRate' | 'average' | 'cut50' | 'cut70' | 'waitlistLastRank',
    isGrade: boolean = false
  ) => {
    if (!modalInfo || !modalInfo.finalStat) return null;
    const statsObj = modalInfo.finalStat.stats;
    
    const v24 = statsObj?.['2024']?.[valueKey] || '';
    const v25 = statsObj?.['2025']?.[valueKey] || '';
    const v26 = statsObj?.['2026']?.[valueKey] || '';

    const formatVal = (val: string, key: typeof valueKey, statsYearObj?: any) => {
      const trimmed = String(val).trim();
      if (!trimmed || trimmed === '-' || trimmed === '0' || trimmed === '0.0' || trimmed === '0.00' || trimmed.includes('이하')) return '-';
      
      if (key === 'enrollment') {
        return `${trimmed}명`;
      }
      if (key === 'competitionRate') {
        return `${trimmed}:1`;
      }
      if (key === 'waitlistLastRank') {
        const enroll = statsYearObj?.enrollment || '';
        const waitlistNum = parseInt(trimmed);
        const enrollNum = parseInt(enroll);
        if (!isNaN(waitlistNum) && waitlistNum > 0) {
          if (!isNaN(enrollNum) && enrollNum > 0) {
            const pct = Math.round((waitlistNum / enrollNum) * 100);
            return `${waitlistNum}명 (${pct}%)`;
          }
          return `${waitlistNum}명`;
        }
        return `${waitlistNum}명`;
      }
      if (isGrade) {
        const gradeNum = parseFloat(trimmed);
        return isNaN(gradeNum) ? trimmed : gradeNum.toFixed(2);
      }
      return trimmed;
    };

    const display24 = formatVal(v24, valueKey, statsObj?.['2024']);
    const display25 = formatVal(v25, valueKey, statsObj?.['2025']);
    const display26 = formatVal(v26, valueKey, statsObj?.['2026']);

    // Calculate Trend
    let trendNode = <span className="text-white/30">-</span>;
    if (isGrade) {
      const n25 = parseGrade(v25);
      const n26 = parseGrade(v26);
      if (n25 !== null && n26 !== null) {
        if (n26 < n25) {
          trendNode = <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[10px] font-black">상승</span>;
        } else if (n26 > n25) {
          trendNode = <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-black">하락</span>;
        }
      }
    } else if (valueKey === 'waitlistLastRank') {
      const n25 = parseInt(v25);
      const n26 = parseInt(v26);
      if (!isNaN(n25) && !isNaN(n26)) {
        if (n26 < n25) {
          trendNode = <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[10px] font-black">감소</span>;
        } else if (n26 > n25) {
          trendNode = <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-black">증가</span>;
        }
      }
    } else if (valueKey === 'enrollment') {
      const n25 = parseInt(v25);
      const n26 = parseInt(v26);
      if (!isNaN(n25) && !isNaN(n26)) {
        if (n26 < n25) {
          trendNode = <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[10px] font-black">감소</span>;
        } else if (n26 > n25) {
          trendNode = <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-black">증가</span>;
        }
      }
    } else if (valueKey === 'competitionRate') {
      const n25 = parseFloat(v25);
      const n26 = parseFloat(v26);
      if (!isNaN(n25) && !isNaN(n26)) {
        if (n26 < n25) {
          trendNode = <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[10px] font-black">감소</span>;
        } else if (n26 > n25) {
          trendNode = <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-black">증가</span>;
        }
      }
    }

    return (
      <tr className="border-b border-white/5 text-center text-xs font-bold">
        <td className="p-3 bg-white/[0.02] text-text-dim border-r border-white/5 text-center">{label}</td>
        <td className="p-3 text-white border-r border-white/5 text-center">{display24}</td>
        <td className="p-3 text-white border-r border-white/5 text-center">{display25}</td>
        <td className="p-3 text-white border-r border-white/5 text-center">{display26}</td>
        <td className="p-3 text-center">{trendNode}</td>
      </tr>
    );
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
          성적 적용 기준을 선택하여 1등급부터 9등급까지의 분포를 한눈에 비교해보세요. (2026학년도 공식 발표 데이터 기준)
        </p>
      </div>

      {/* Filter Section (Now 6 columns per Request 6) */}
      <div className="glass-card p-6 border border-white/10 rounded-3xl mb-8 space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2 text-white font-black text-sm">
            <Filter size={16} className="text-primary" />
            검색 조건 설정
          </div>
          <button 
            onClick={handleResetFilters}
            className="text-xs text-text-dim hover:text-white font-bold transition-colors cursor-pointer"
          >
            필터 초기화
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest pl-1">지역</label>
            <div className="relative">
              <select 
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value, university: '전체', department: '전체' }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-xs font-bold appearance-none outline-none focus:border-primary/50 transition-all cursor-pointer"
              >
                {dynamicOptions.locations.map((loc, idx) => (
                  <option key={`${loc}-${idx}`} value={loc} className="bg-zinc-950 text-white">{loc}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" size={14} />
            </div>
          </div>

          {/* University Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest pl-1">학교명</label>
            <div className="relative">
              <select 
                value={filters.university}
                onChange={(e) => setFilters(prev => ({ ...prev, university: e.target.value, department: '전체' }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-xs font-bold appearance-none outline-none focus:border-primary/50 transition-all cursor-pointer"
              >
                {dynamicOptions.universities.map((uni, idx) => (
                  <option key={`${uni}-${idx}`} value={uni} className="bg-zinc-950 text-white">{uni}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" size={14} />
            </div>
          </div>

          {/* Department Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest pl-1">학과</label>
            <div className="relative">
              <select 
                value={filters.department}
                onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-xs font-bold appearance-none outline-none focus:border-primary/50 transition-all cursor-pointer"
              >
                {dynamicOptions.departments.map((dept, idx) => (
                  <option key={`${dept}-${idx}`} value={dept} className="bg-zinc-950 text-white">{dept}</option>
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
                {dynamicOptions.admissionTypes.map((type, idx) => (
                  <option key={`${type}-${idx}`} value={type} className="bg-zinc-950 text-white">{type}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" size={14} />
            </div>
          </div>

          {/* Grade Criteria (Request 3: labeled specifically as 2026학년도) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest pl-1">성적 적용 기준 (2026)</label>
            <div className="relative">
              <select 
                value={filters.gradeCriteria}
                onChange={(e) => setFilters(prev => ({ ...prev, gradeCriteria: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-xs font-bold appearance-none outline-none focus:border-primary/50 transition-all cursor-pointer"
              >
                <option value="cut70" className="bg-zinc-950 text-white">2026학년도 70% 컷</option>
                <option value="cut50" className="bg-zinc-950 text-white">2026학년도 50% 컷</option>
                <option value="average" className="bg-zinc-950 text-white">2026학년도 평균 성적</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" size={14} />
            </div>
          </div>

          {/* Specific Grade Search (Request 6) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest pl-1">성적 범위 내 검색 (등급)</label>
            <div className="relative">
              <input 
                type="number"
                step="0.01"
                min="1.0"
                max="9.0"
                value={filters.targetGrade}
                onChange={(e) => setFilters(prev => ({ ...prev, targetGrade: e.target.value }))}
                placeholder="예: 3.50"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-xs font-bold outline-none focus:border-primary/50 transition-all placeholder-white/30"
              />
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
          {/* Chart Table Legend / Scale header (Request 2: renamed headers) */}
          <div className="hidden lg:grid grid-cols-[200px_100px_1fr] px-6 py-4 bg-white/[0.02] border border-white/5 rounded-2xl text-xs font-black text-text-dim uppercase tracking-wider items-center">
            <div>대학명</div> {/* Request 2: 대학명 (1열) -> 대학명 */}
            <div className="text-center border-l border-r border-white/5">지역</div> {/* Request 2: 지역 (2열) -> 지역 */}
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
                          모집단위 {uni.allGrades.length}개
                        </span>
                      </div>
                      <button
                        onClick={() => setExpandedUni(isExpanded ? null : uni.universityName)}
                        className="lg:hidden p-1.5 hover:bg-white/5 rounded-lg text-text-dim transition-colors cursor-pointer"
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
                            width: `${Math.max(widthPercent, 2)}%`, // Ensure at least small bar is visible if min=max
                          }}
                        >
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

                      {/* Detail toggler for desktop (Request 7: Renamed to 모집단위 목록 보기) */}
                      <div className="hidden lg:flex items-center justify-between">
                        <span className="text-[10px] text-text-dim font-bold">
                          성적 분포 범위: <span className="text-white font-mono">{uni.minGrade.toFixed(2)}</span> ~ <span className="text-white font-mono">{uni.maxGrade.toFixed(2)}</span> 등급
                        </span>
                        <button
                          onClick={() => setExpandedUni(isExpanded ? null : uni.universityName)}
                          className="text-[10px] text-primary hover:underline font-black flex items-center gap-1 transition-all cursor-pointer"
                        >
                          {isExpanded ? (
                            <>모집단위 목록 접기 <ChevronUp size={12} /></>
                          ) : (
                            <>모집단위 목록 보기 ({uni.allGrades.length}) <ChevronDown size={12} /></>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail items (Request 7: List unique departments alphabetically in 가나다 순) */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white/[0.01] border-t border-white/5 overflow-hidden"
                      >
                        <div className="p-5 lg:p-6 space-y-4">
                          <h4 className="text-xs font-black text-text-dim tracking-wider uppercase mb-3">모집단위 목록 (클릭 시 3개년 입결 상세 통계 조회)</h4>
                          
                          {(() => {
                            // Group grades from 1등급 to 9등급
                            const groups: Record<number, Array<{
                              department: string;
                              type: string;
                              detail: string;
                              grade: number;
                            }>> = {};

                            const noDataItems: Array<{
                              department: string;
                              type: string;
                              detail: string;
                              grade: null;
                            }> = [];

                            uni.allGrades.forEach(g => {
                              if (g.grade === null) {
                                noDataItems.push(g as any);
                              } else {
                                const groupKey = Math.floor(g.grade); // 1.5 -> 1등급, 2.3 -> 2등급
                                if (groupKey >= 1 && groupKey <= 9) {
                                  if (!groups[groupKey]) {
                                    groups[groupKey] = [];
                                  }
                                  groups[groupKey].push(g as any);
                                } else {
                                  // Fallback for exceptional values just in case
                                  if (!groups[9]) groups[9] = [];
                                  groups[9].push(g as any);
                                }
                              }
                            });

                            const sortedGroupKeys = Object.keys(groups)
                              .map(Number)
                              .sort((a, b) => a - b);

                            // Sort each group's items by grade ascending (best/highest score first)
                            sortedGroupKeys.forEach(key => {
                              groups[key].sort((a, b) => {
                                if (a.grade !== b.grade) {
                                  return a.grade - b.grade;
                                }
                                return a.department.localeCompare(b.department, 'ko');
                              });
                            });

                            // Sort no-data items alphabetically
                            noDataItems.sort((a, b) => a.department.localeCompare(b.department, 'ko'));

                            return (
                              <div className="space-y-4">
                                {sortedGroupKeys.map(groupKey => (
                                  <div key={groupKey} className="flex flex-col md:flex-row md:items-start gap-3 pb-3 border-b border-white/5 last:border-0 last:pb-0">
                                    <div className="flex items-center gap-1.5 min-w-[90px] pt-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                      <span className="text-xs font-black text-primary tracking-wider">{groupKey}등급</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 flex-1">
                                      {groups[groupKey].map((item, idx) => {
                                        const isHighest = uni.minGrade > 0 && item.grade === uni.minGrade;
                                        const isLowest = uni.maxGrade > 0 && item.grade === uni.maxGrade;

                                        let btnClass = "text-xs font-bold text-white bg-white/5 border border-white/10 hover:border-primary hover:bg-primary/5 px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5";
                                        if (isHighest && isLowest) {
                                          btnClass = "text-xs font-bold text-purple-400 bg-purple-500/10 border border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/20 px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(168,85,247,0.15)]";
                                        } else if (isHighest) {
                                          btnClass = "text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 hover:border-rose-500/50 hover:bg-rose-500/20 px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.15)]";
                                        } else if (isLowest) {
                                          btnClass = "text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/30 hover:border-blue-500/50 hover:bg-blue-500/20 px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(59,130,246,0.15)]";
                                        }

                                        return (
                                          <button
                                            key={idx}
                                            onClick={() => handleOpenDetails(uni.universityName, item.department, item.type, item.detail)}
                                            className={btnClass}
                                            title={`${item.department} (${item.type} | ${item.grade}등급)`}
                                          >
                                            <span className="flex items-center gap-1">
                                              <span>{item.department}</span>
                                              {filters.admissionType === '전체' && (
                                                <span className="text-[9px] text-white/40 font-normal">
                                                  ({item.type})
                                                </span>
                                              )}
                                            </span>
                                            <span className="text-[10px] opacity-75 font-mono">
                                              {item.grade.toFixed(2)}
                                            </span>
                                            {isHighest && (
                                              <span className="px-1.5 py-0.5 text-[8px] bg-rose-500/20 text-rose-300 rounded font-black tracking-wider whitespace-nowrap">
                                                최고
                                              </span>
                                            )}
                                            {isLowest && (
                                              <span className="px-1.5 py-0.5 text-[8px] bg-blue-500/20 text-blue-300 rounded font-black tracking-wider whitespace-nowrap">
                                                최하
                                              </span>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}

                                {noDataItems.length > 0 && (
                                  <div className="flex flex-col md:flex-row md:items-start gap-3 pb-3 last:border-0 opacity-60">
                                    <div className="flex items-center gap-1.5 min-w-[90px] pt-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                                      <span className="text-xs font-black text-zinc-400 tracking-wider">평가제외</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 flex-1">
                                      {noDataItems.map((item, idx) => (
                                        <button
                                          key={idx}
                                          onClick={() => handleOpenDetails(uni.universityName, item.department, item.type, item.detail)}
                                          className="text-xs font-bold text-zinc-400 bg-white/5 border border-white/5 hover:border-zinc-500 hover:bg-white/10 px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                                        >
                                          <span className="flex items-center gap-1">
                                            <span>{item.department}</span>
                                            {filters.admissionType === '전체' && (
                                              <span className="text-[9px] text-zinc-500 font-normal">
                                                ({item.type})
                                              </span>
                                            )}
                                          </span>
                                          <span className="text-[10px] text-zinc-500">-</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
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

      {/* Detail Modal Overlay (Request 7: Detailed statistics matching Attached Photo 2) */}
      <AnimatePresence>
        {detailModal && modalInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-4xl bg-[#0b0c10] border border-white/10 rounded-3xl overflow-hidden shadow-2xl my-8 text-white"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2 text-white font-black text-base">
                  <span className="text-primary text-xl">●</span> 3개년 대학 입시 통계 상세자료
                </div>
                <button
                  onClick={() => setDetailModal(null)}
                  className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white/80 rounded-xl text-xs font-black transition-all cursor-pointer"
                >
                  닫기 (X)
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Table 1: Uni, Dept, Type Dropdown, Detail Dropdown */}
                <div className="overflow-x-auto border border-white/10 rounded-2xl">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="border-b border-white/10">
                        <td className="p-3 bg-white/[0.02] text-xs font-black text-text-dim w-1/4 border-r border-white/10 text-center">대학</td>
                        <td className="p-3 text-sm font-black text-white w-1/4 border-r border-white/10 text-center">{detailModal.universityName}</td>
                        <td className="p-3 bg-white/[0.02] text-xs font-black text-text-dim w-1/4 border-r border-white/10 text-center">모집단위</td>
                        <td className="p-3 text-sm font-black text-white w-1/4 text-center">{detailModal.departmentName}</td>
                      </tr>
                      <tr>
                        <td className="p-3 bg-white/[0.02] text-xs font-black text-text-dim w-1/4 border-r border-white/10 text-center">전형유형</td>
                        <td className="p-3 text-sm font-black text-primary w-1/4 border-r border-white/10 text-center">
                          <div className="relative inline-block w-full">
                            <select
                              value={detailModal.selectedType}
                              onChange={(e) => handleModalTypeChange(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-xl py-1.5 px-3 text-primary text-xs font-black appearance-none outline-none focus:border-primary/50 transition-all cursor-pointer text-center"
                            >
                              {modalInfo.availableTypes.map((type) => (
                                <option key={type} value={type} className="bg-zinc-950 text-white">{type}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="p-3 bg-white/[0.02] text-xs font-black text-text-dim w-1/4 border-r border-white/10 text-center">세부전형</td>
                        <td className="p-3 text-sm font-black text-white w-1/4 text-center">
                          <div className="relative inline-block w-full">
                            <select
                              value={detailModal.selectedDetail}
                              onChange={(e) => handleModalDetailChange(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-xl py-1.5 px-3 text-white text-xs font-black appearance-none outline-none focus:border-primary/50 transition-all cursor-pointer text-center"
                            >
                              {modalInfo.availableDetails.map((det) => (
                                <option key={det} value={det} className="bg-zinc-950 text-white">{det}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Table 2: 3-Year Comparison stats */}
                <div className="overflow-x-auto border border-white/10 rounded-2xl">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-white/[0.03] border-b border-white/10 text-center text-xs font-black text-text-dim uppercase tracking-wider">
                        <th className="p-3 border-r border-white/10 w-1/5 text-center">구분</th>
                        <th className="p-3 border-r border-white/10 w-1/5 text-center">2024학년도</th>
                        <th className="p-3 border-r border-white/10 w-1/5 text-center">2025학년도</th>
                        <th className="p-3 border-r border-white/10 w-1/5 text-center">2026학년도</th>
                        <th className="p-3 w-1/5 text-center">3개년 추이</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderModalRow('모집인원', 'enrollment')}
                      {renderModalRow('경쟁률', 'competitionRate')}
                      {renderModalRow('평균', 'average', true)}
                      {renderModalRow('50% CUT', 'cut50', true)}
                      {renderModalRow('70% CUT', 'cut70', true)}
                      {renderModalRow('충원인원', 'waitlistLastRank')}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
