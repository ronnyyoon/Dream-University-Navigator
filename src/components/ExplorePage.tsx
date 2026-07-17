import React from 'react';
import { Search, Loader2, Info, ArrowUp, ArrowDown, Filter, X, Check } from 'lucide-react';
import { AdmissionCase } from '../types';
import { fetchAllAdmissionCases } from '../lib/admissionService';

type SortConfig = {
  key: keyof AdmissionCase;
  direction: 'asc' | 'desc';
};

interface ExplorePageProps {
  initialUniversity?: string;
}

export default function ExplorePage({ initialUniversity }: ExplorePageProps) {
  const [admissionCases, setAdmissionCases] = React.useState<AdmissionCase[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedUni, setSelectedUni] = React.useState(initialUniversity || '선택해주세요');
  const [selectedType, setSelectedType] = React.useState('전체');
  const [selectedYear, setSelectedYear] = React.useState('전체');

  // Detail table sorting & filtering state
  const [sortConfig, setSortConfig] = React.useState<SortConfig[]>([]);
  const [columnFilters, setColumnFilters] = React.useState<Record<string, string[]>>({});

  React.useEffect(() => {
    fetchAllAdmissionCases().then(setAdmissionCases).finally(() => setLoading(false));
  }, []);

  const universities = ['선택해주세요', ...([...new Set(admissionCases.map(c => {
    const name = c.universityName;
    if (name === '국립국립목포대학교') return '국립목포대학교';
    if (name === '국립국립목포해양대학교') return '국립목포해양대학교';
    return name;
  }))].sort())];
  const types = ['전체', ...([...new Set(admissionCases.map(c => c.admissionType))].sort())];
  const years = ['전체', ...([...new Set(admissionCases.map(c => c.year.toString()))].sort().reverse())];

  const baseFiltered = admissionCases.filter(c => {
    const normName = c.universityName === '국립국립목포대학교' ? '국립목포대학교' : 
                     c.universityName === '국립국립목포해양대학교' ? '국립목포해양대학교' : c.universityName;
    return normName === selectedUni && 
           (selectedType === '전체' || c.admissionType === selectedType) &&
           (selectedYear === '전체' || c.year.toString() === selectedYear);
  });

  const calculateStats = (data: AdmissionCase[]) => {
    if (data.length === 0) return { max: '해당없음', avg: '해당없음', min: '해당없음', count: 0 };
    const grades = data.map(d => d.grade).filter(g => !isNaN(g));
    if (grades.length === 0) return { max: '해당없음', avg: '해당없음', min: '해당없음', count: 0 };
    
    return {
      max: Math.min(...grades).toFixed(2),
      min: Math.max(...grades).toFixed(2),
      avg: (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2),
      count: data.length
    };
  };

  const applicant = calculateStats(baseFiltered);
  const firstSuccess = calculateStats(baseFiltered.filter(c => c.finalResult === '합격'));
  const final = calculateStats(baseFiltered.filter(c => c.finalResult === '합격' || c.finalResult === '충원합격'));
  const enrolled = calculateStats(baseFiltered.filter(c => c.isEnrolled === 'Y'));

  // Multi-column sorting logic
  const toggleSort = (key: keyof AdmissionCase) => {
    // Only allow sorting for specific columns: 학년도, 내신, 모집단위, 전형, 세부전형, 1단계, 최종결과, 등록
    const allowedSortCols = ['year', 'grade', 'departmentName', 'admissionType', 'detailedType', 'step1Result', 'finalResult', 'isEnrolled'];
    if (!allowedSortCols.includes(key as string)) return;

    setSortConfig(prev => {
      const idx = prev.findIndex(s => s.key === key);
      if (idx !== -1) {
        const nextDir = prev[idx].direction === 'asc' ? 'desc' : 'asc';
        const updated = [...prev];
        updated[idx] = { key, direction: nextDir };
        return updated;
      }
      const newSort: SortConfig = { key, direction: 'asc' };
      return prev.length < 3 ? [...prev, newSort] : [...prev.slice(1), newSort];
    });
  };

  const handleFilterChange = (key: string, val: string[]) => {
    setColumnFilters(prev => ({ ...prev, [key]: val }));
  };

  const finalDetailRows = React.useMemo(() => {
    // 1. Apply column filters
    let result = baseFiltered.filter(c => {
      return Object.entries(columnFilters).every(([key, selectedVals]) => {
        const vals = selectedVals as string[];
        if (!vals || vals.length === 0) return true;
        const cellValue = String((c as any)[key]);
        return vals.includes(cellValue);
      });
    });

    // 2. Apply multi-column sort
    if (sortConfig.length > 0) {
      result = [...result].sort((a, b) => {
        for (const config of sortConfig) {
          const valA = a[config.key];
          const valB = b[config.key];
          if (valA === valB) continue;
          if (typeof valA === 'number' && typeof valB === 'number') {
            return config.direction === 'asc' ? valA - valB : valB - valA;
          }
          return config.direction === 'asc' 
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA));
        }
        return 0;
      });
    }

    return result;
  }, [baseFiltered, columnFilters, sortConfig]);

  // Helper to get unique values for header filters
  const getFilterOptions = (key: keyof AdmissionCase) => {
    return [...new Set(baseFiltered.map(c => String(c[key])))].sort();
  };

  if (loading) {
    return (
      <div className="pt-40 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-text-dim text-sm animate-pulse">리포트 데이터를 분석 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 font-sans">
      <div className="mb-12 text-center lg:text-left">
        <h1 className="text-5xl font-black tracking-tight mb-3 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">대학·전형별 합격 사례 통계</h1>
        <p className="text-text-dim font-bold text-lg">대학 및 전형별 합격자 통계(최고, 평균, 최저 내신 등급)를 상세하게 확인해 보세요.</p>
      </div>

      {/* Main Report Table */}
      <div className="glass-card overflow-hidden border border-white/10 shadow-2xl mb-12 max-w-5xl mx-auto">
        <div className="grid grid-cols-12 bg-white/10 border-b border-white/20">
          <div className="col-span-2 p-3 border-r border-white/10 font-black text-center bg-primary/20 text-primary uppercase tracking-widest text-[12px]">Year</div>
          <div className="col-span-2 p-3 border-r border-white/10 font-black text-center bg-primary/20 text-primary uppercase tracking-widest text-[12px]">University</div>
          <div className="col-span-2 p-3 border-r border-white/10 font-black text-center bg-primary/20 text-primary uppercase tracking-widest text-[12px]">Type</div>
          <div className="col-span-6 p-3 font-black text-center bg-primary/20 text-primary uppercase tracking-widest text-[12px]">Grade statistics (내신 등급 통계)</div>
        </div>

        <div className="grid grid-cols-12 border-b border-white/10 border-t border-white/5">
          <div className="col-span-2 p-4 border-r border-white/10 flex items-center justify-center bg-white/[0.02]">
            <select 
              value={selectedYear} 
              onChange={e => setSelectedYear(e.target.value)}
              className="bg-transparent outline-none font-black text-base w-full text-center text-white cursor-pointer hover:text-primary transition-colors pr-1"
            >
              {years.map((y, idx) => <option key={`${y}-${idx}`} value={y} className="bg-[#0A0A0A]">{y}</option>)}
            </select>
          </div>
          <div className="col-span-2 p-4 border-r border-white/10 flex items-center justify-center bg-white/[0.02]">
            <select 
              value={selectedUni} 
              onChange={e => setSelectedUni(e.target.value)}
              className="bg-transparent outline-none font-black text-base w-full text-center text-white cursor-pointer hover:text-primary transition-colors pr-1"
            >
              {universities.map((u, idx) => <option key={`${u}-${idx}`} value={u} className="bg-[#0A0A0A]">{u}</option>)}
            </select>
          </div>
          <div className="col-span-2 p-4 border-r border-white/10 flex items-center justify-center bg-white/[0.02]">
            <select 
              value={selectedType} 
              onChange={e => setSelectedType(e.target.value)}
              className="bg-transparent outline-none font-black text-sm w-full text-center text-sky-400 cursor-pointer hover:text-sky-300 transition-colors pr-1"
            >
              {types.map((t, idx) => <option key={`${t}-${idx}`} value={t} className="bg-[#0A0A0A] font-bold">{t}</option>)}
            </select>
          </div>
          <div className="col-span-6">
            <GradeHeader label="지원자 전체 기준" />
            <GradeRow stats={applicant} />
          </div>
        </div>

        <div className="grid grid-cols-12 border-b border-white/10">
          <div className="col-span-2 p-5 border-r border-white/10 bg-emerald-600/10 flex flex-col items-center justify-center group">
            <span className="text-emerald-400 font-black text-base group-hover:scale-110 transition-transform">지원 건수</span>
          </div>
          <div className="col-span-4 p-5 border-r border-white/10 flex items-center justify-center text-3xl font-black text-white bg-white/[0.01]">
            {applicant.count}<span className="text-sm text-text-dim ml-1 font-medium">건</span>
          </div>
          <div className="col-span-6">
            <GradeHeader label="최초합격자 기준" />
            <GradeRow stats={firstSuccess} />
          </div>
        </div>

        <div className="grid grid-cols-12 border-b border-white/10">
          <div className="col-span-2 p-5 border-r border-white/10 bg-emerald-600/10 flex flex-col items-center justify-center group">
            <span className="text-emerald-400 font-black text-base group-hover:scale-110 transition-transform text-center leading-tight">합격 건수<br /><span className="text-[10px] font-medium opacity-70">(최종합격자 기준)</span></span>
          </div>
          <div className="col-span-4 p-5 border-r border-white/10 flex items-center justify-center text-3xl font-black text-white bg-white/[0.01]">
             {final.count}<span className="text-sm text-text-dim ml-1 font-medium">건</span>
          </div>
          <div className="col-span-6">
            <GradeHeader label="최종합격자 기준 (합격 + 충원)" />
            <GradeRow stats={final} />
          </div>
        </div>

        <div className="grid grid-cols-12">
          <div className="col-span-2 p-5 border-r border-white/10 bg-emerald-600/10 flex flex-col items-center justify-center group">
            <span className="text-emerald-400 font-black text-base group-hover:scale-110 transition-transform">등록 건수</span>
          </div>
          <div className="col-span-4 p-5 border-r border-white/10 flex items-center justify-center text-3xl font-black text-white bg-white/[0.01]">
             {enrolled.count}<span className="text-sm text-text-dim ml-1 font-medium">건</span>
          </div>
          <div className="col-span-6">
            <GradeHeader label="등록자 기준" />
            <GradeRow stats={enrolled} />
          </div>
        </div>
      </div>

      {/* Case List Section - Only visible when a university is selected */}
      {selectedUni !== '선택해주세요' ? (
        <div className="mt-20">
          <div className="flex flex-col md:flex-row items-baseline justify-between mb-8 gap-2 px-2">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                <Search className="text-primary" size={28} />
                {selectedUni} <span className="text-sky-400">[{selectedType}]</span> 사례 상세
              </h2>
              <p className="text-text-dim text-base font-medium mt-1">심층 분석에 사용된 원본 데이터를 직접 확인할 수 있습니다.</p>
            </div>
            <div className="flex items-center gap-4">
              {sortConfig.length > 0 && (
                <div className="flex items-center gap-2 bg-white/5 py-1 px-3 rounded-full border border-white/10">
                  <span className="text-[10px] text-text-dim font-bold uppercase">정렬:</span>
                  {sortConfig.map((s, i) => (
                    <span key={s.key} className="text-[10px] text-primary font-black">{i+1}. {getColumnLabel(s.key as string)} ({s.direction === 'asc' ? '↑' : '↓'})</span>
                  ))}
                  <X size={12} className="text-text-dim cursor-pointer hover:text-white" onClick={() => setSortConfig([])} />
                </div>
              )}
              <div className="bg-white/10 px-4 py-2 rounded-full border border-white/10">
                <span className="text-sm font-bold text-primary">총 {finalDetailRows.length}건 / {baseFiltered.length}건</span>
              </div>
            </div>
          </div>

          <div className="glass-card border border-white/10">
            <div className="overflow-x-auto scrollbar-hide rounded-2xl">
              <table className="w-full text-left table-fixed min-w-[800px]">
                <thead className="bg-white/5 text-text-dim uppercase tracking-wider font-bold border-b border-white/10 text-[10px]">
                  <tr>
                    <SortableFilterHeader label="학년도" columnKey="year" sortConfig={sortConfig} onSort={toggleSort} filterSelected={columnFilters.year || []} onFilterChange={(v: string[]) => handleFilterChange('year', v)} options={getFilterOptions('year')} className="w-[85px] px-2" />
                    <SortableFilterHeader label="내신" columnKey="grade" sortConfig={sortConfig} onSort={toggleSort} filterSelected={columnFilters.grade || []} onFilterChange={(v: string[]) => handleFilterChange('grade', v)} options={getFilterOptions('grade')} className="w-[85px] px-2" />
                    <SortableFilterHeader label="모집단위" columnKey="departmentName" sortConfig={sortConfig} onSort={toggleSort} filterSelected={columnFilters.departmentName || []} onFilterChange={(v: string[]) => handleFilterChange('departmentName', v)} options={getFilterOptions('departmentName')} className="w-[160px] px-2" />
                    <SortableFilterHeader label="전형" columnKey="admissionType" sortConfig={sortConfig} onSort={toggleSort} filterSelected={columnFilters.admissionType || []} onFilterChange={(v: string[]) => handleFilterChange('admissionType', v)} options={getFilterOptions('admissionType')} className="w-[85px] px-2" />
                    <SortableFilterHeader label="세부전형" columnKey="detailedType" sortConfig={sortConfig} onSort={toggleSort} filterSelected={columnFilters.detailedType || []} onFilterChange={(v: string[]) => handleFilterChange('detailedType', v)} options={getFilterOptions('detailedType')} className="w-[110px] px-2" />
                    <SortableFilterHeader label="1단계" columnKey="step1Result" sortConfig={sortConfig} onSort={toggleSort} filterSelected={columnFilters.step1Result || []} onFilterChange={(v: string[]) => handleFilterChange('step1Result', v)} options={getFilterOptions('step1Result')} className="w-[85px] text-center" />
                    <SortableFilterHeader label="최종결과" columnKey="finalResult" sortConfig={sortConfig} onSort={toggleSort} filterSelected={columnFilters.finalResult || []} onFilterChange={(v: string[]) => handleFilterChange('finalResult', v)} options={getFilterOptions('finalResult')} className="w-[85px] text-center" />
                    <th className="px-3 py-4 w-[120px] text-zinc-500 font-bold">비고</th>
                    <th className="px-3 py-4 w-[60px] text-center text-zinc-500 font-bold">순위</th>
                    <SortableFilterHeader label="등록" columnKey="isEnrolled" sortConfig={sortConfig} onSort={toggleSort} filterSelected={columnFilters.isEnrolled || []} onFilterChange={(v: string[]) => handleFilterChange('isEnrolled', v)} options={getFilterOptions('isEnrolled')} className="w-[65px] text-center" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-zinc-300">
                  {finalDetailRows.length > 0 ? (
                    finalDetailRows.map((c) => (
                      <tr key={c.id} className="hover:bg-white/[0.04] transition-colors group">
                        <td className="px-4 py-5 text-center text-text-dim opacity-50 font-mono text-xs">{c.year}</td>
                        <td className="px-4 py-5 font-black text-white text-[13px] text-center bg-white/[0.01]">{c.grade.toFixed(2)}</td>
                        <td className="px-4 py-4 border-r border-white/10 bg-white/[0.01] sticky left-0 z-10 shadow-xl" style={{ backgroundColor: '#0A0A0A' }}>
                          <div className="font-black text-white text-xs">
                            {c.universityName === '국립국립목포대학교' ? '국립목포대학교' : 
                             c.universityName === '국립국립목포해양대학교' ? '국립목포해양대학교' : c.universityName}
                          </div>
                          <div className="text-[10px] text-text-dim font-bold">{c.departmentName}</div>
                        </td>
                        <td className="px-4 py-5 font-bold text-sky-400 text-[12px] truncate" title={c.admissionType}>{c.admissionType}</td>
                        <td className="px-4 py-5 text-text-dim truncate text-[11px]" title={c.detailedType}>{c.detailedType}</td>
                        <td className="px-4 py-5 text-center">
                          <StepResultBadge result={c.step1Result} />
                        </td>
                        <td className="px-4 py-5 text-center">
                          <FinalResultBadge result={c.finalResult} />
                        </td>
                        <td className="px-4 py-5 text-text-dim text-[11px] truncate italic" title={c.failReason || ''}>{c.failReason || '-'}</td>
                        <td className="px-2 py-5 text-center text-text-dim font-bold">{c.waitlistRank || '-'}</td>
                        <td className="px-4 py-5 text-center font-black">
                          <span className={c.isEnrolled === 'Y' ? 'text-primary text-[13px]' : 'text-text-dim opacity-30 text-[11px]'}>{c.isEnrolled}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-24 text-center">
                        <div className="flex flex-col items-center gap-4 text-text-dim">
                          <Info size={40} className="opacity-20" />
                          <p className="font-bold text-lg">해당 조건에 부합하는 사례를 찾을 수 없습니다.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-12 py-20 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-4 text-text-dim/40 italic">
          <Info size={48} />
          <p className="text-xl font-bold">대학을 선택하면 상세 분석 리포트와 실제 사례를 확인할 수 있습니다.</p>
        </div>
      )}
    </div>
  );
}

function SortableFilterHeader({ label, columnKey, sortConfig, onSort, filterSelected, onFilterChange, options, className }: any) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  const sort = sortConfig.find((s: any) => s.key === columnKey);
  const sortIdx = sortConfig.findIndex((s: any) => s.key === columnKey);
  
  const allowedSortCols = ['year', 'grade', 'departmentName', 'admissionType', 'detailedType', 'step1Result', 'finalResult', 'isEnrolled'];
  const isSortable = allowedSortCols.includes(columnKey);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (opt: string) => {
    if (filterSelected.includes(opt)) {
      onFilterChange(filterSelected.filter((i: string) => i !== opt));
    } else {
      onFilterChange([...filterSelected, opt]);
    }
  };

  return (
    <th className={`px-0 py-4 transition-colors group relative ${className}`} ref={containerRef}>
      <div className="flex flex-col gap-1.5 px-2">
        <div 
          className={`flex items-center gap-1 leading-tight ${isSortable ? 'cursor-pointer hover:text-white' : 'text-zinc-500'}`}
          onClick={() => isSortable && onSort(columnKey)}
        >
          <span className="truncate">{label}</span>
          {isSortable && (
            <>
              <div className="flex flex-col opacity-20 group-hover:opacity-100 transition-opacity">
                <ArrowUp className={sort?.direction === 'asc' ? 'text-primary opacity-100' : ''} size={8} />
                <ArrowDown className={sort?.direction === 'desc' ? 'text-primary opacity-100' : ''} size={8} />
              </div>
              {sortIdx !== -1 && (
                <span className="text-[7px] text-primary font-black -mt-2">{sortIdx + 1}</span>
              )}
            </>
          )}
        </div>
        
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className={`group/filter flex items-center justify-between bg-white/5 border rounded px-1.5 py-1 cursor-pointer transition-colors ${filterSelected.length > 0 ? 'border-primary/50 text-white' : 'border-white/10 text-white/30 hover:border-white/20'}`}
        >
          <span className="text-[9px] font-bold truncate max-w-[50px]">
            {filterSelected.length === 0 ? '전체' : `${filterSelected.length}`}
          </span>
          <Filter size={8} className="shrink-0" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 max-h-56 overflow-y-auto bg-[#0F0F0F] border border-white/10 rounded-lg z-[100] shadow-2xl p-1.5 scrollbar-hide">
          <div 
            onClick={() => { onFilterChange([]); setIsOpen(false); }}
            className="flex items-center justify-between p-2 hover:bg-white/5 rounded-md cursor-pointer text-[10px] font-bold border-b border-white/5 mb-1"
          >
            <span className={filterSelected.length === 0 ? "text-primary" : "text-text-dim"}>전체 선택 해제</span>
            {filterSelected.length === 0 && <Check size={10} className="text-primary" />}
          </div>
          {options.map((opt: string) => (
            <div 
              key={opt} 
              onClick={() => toggleOption(opt)}
              className="flex items-center justify-between p-2 hover:bg-white/5 rounded-md cursor-pointer text-[10px] font-bold"
            >
              <span className={filterSelected.includes(opt) ? "text-white" : "text-text-dim"}>{opt}</span>
              {filterSelected.includes(opt) && <Check size={10} className="text-primary" />}
            </div>
          ))}
        </div>
      )}
    </th>
  );
}

function getColumnLabel(key: string) {
  const labels: any = {
    year: '학년도',
    grade: '내신',
    location: '지역',
    universityName: '대학',
    departmentName: '학과',
    admissionType: '전형',
    detailedType: '세부전형',
    waitlistRank: '순위',
    isEnrolled: '등록',
    step1Result: '1단계',
    finalResult: '최종'
  };
  return labels[key] || key;
}

function GradeHeader({ label }: { label: string }) {
  return (
    <div className="bg-emerald-600/30 py-2 text-center text-[13px] font-black text-emerald-400 border-b border-white/10 uppercase tracking-tight">
      {label}
    </div>
  );
}

function GradeRow({ stats }: { stats: any }) {
  return (
    <div className="grid grid-cols-3 text-center">
      <div className="border-r border-white/10 group bg-white/[0.01]">
        <div className="bg-sky-500/20 py-1.5 font-black border-b border-white/10 uppercase tracking-widest text-[9px] text-sky-300">Highest (최고)</div>
        <div className="py-4 font-black text-white text-xl group-hover:text-sky-400 transition-colors">
          {stats.max === '해당없음' ? stats.max : stats.max}<span className="text-[10px] font-medium ml-1 text-text-dim">등급</span>
        </div>
      </div>
      <div className="border-r border-white/10 group bg-white/[0.02]">
        <div className="bg-amber-500/20 py-1.5 font-black border-b border-white/10 uppercase tracking-widest text-[9px] text-amber-300">Average (평균)</div>
        <div className="py-4 font-black text-white text-xl group-hover:text-amber-400 transition-colors">
          {stats.avg === '해당없음' ? stats.avg : stats.avg}<span className="text-[10px] font-medium ml-1 text-text-dim">등급</span>
        </div>
      </div>
      <div className="group bg-white/[0.01]">
        <div className="bg-orange-600/20 py-1.5 font-black border-b border-white/10 uppercase tracking-widest text-[9px] text-orange-300">Lowest (최저)</div>
        <div className="py-4 font-black text-white text-xl group-hover:text-orange-400 transition-colors">
          {stats.min === '해당없음' ? stats.min : stats.min}<span className="text-[10px] font-medium ml-1 text-text-dim">등급</span>
        </div>
      </div>
    </div>
  );
}

function StepResultBadge({ result }: { result: string }) {
  if (result === '합격') return <span className="text-emerald-500 font-black text-[13px]">합격</span>;
  if (result === '불합격') return <span className="text-rose-600 font-bold text-[13px]">불합격</span>;
  return <span className="text-text-dim opacity-30 text-[12px]">{result}</span>;
}

function FinalResultBadge({ result }: { result: string }) {
  let colorClass = "";
  let displayResult = result;
  
  if (result === '합격') {
    colorClass = "text-emerald-500";
  } else if (result === '충원합격') {
    colorClass = "text-amber-500";
    displayResult = "충원";
  } else if (result === '불합격') {
    colorClass = "text-rose-600";
  }

  return (
    <div className={`inline-block px-2 py-1 rounded border ${colorClass.replace('text-', 'border-').replace('500', '500/30')} bg-white/5`}>
      <span className={`${colorClass} font-black text-[12px]`}>{displayResult}</span>
    </div>
  );
}
