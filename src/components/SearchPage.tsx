import React from 'react';
import { Search, Loader2, ChevronDown, Check, X, ArrowUp, ArrowDown } from 'lucide-react';
import { AdmissionCase } from '../types';
import { fetchAllAdmissionCases } from '../lib/admissionService';

type SortConfig = {
  key: keyof AdmissionCase;
  direction: 'asc' | 'desc';
};

export default function SearchPage() {
  const [admissionCases, setAdmissionCases] = React.useState<AdmissionCase[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await fetchAllAdmissionCases();
        setAdmissionCases(data);
      } catch (err: any) {
        console.error(err);
        setError("데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const [gradeRange, setGradeRange] = React.useState<[number, number]>([1.0, 9.0]);
  const [minInput, setMinInput] = React.useState('1.0');
  const [maxInput, setMaxInput] = React.useState('9.0');
  
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedYears, setSelectedYears] = React.useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = React.useState<string[]>([]);
  const [selectedUnis, setSelectedUnis] = React.useState<string[]>([]);
  const [selectedDepts, setSelectedDepts] = React.useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);
  const [selectedDetailedType, setSelectedDetailedType] = React.useState('전체');
  const [selectedResult, setSelectedResult] = React.useState('전체');
  const [selectedEnrolled, setSelectedEnrolled] = React.useState('전체');

  // Sorting state
  const [sortConfig, setSortConfig] = React.useState<SortConfig[]>([
    { key: 'year', direction: 'desc' },
    { key: 'grade', direction: 'asc' }
  ]);

  const toggleSort = (key: keyof AdmissionCase) => {
    setSortConfig(prev => {
      const existingIdx = prev.findIndex(s => s.key === key);
      
      if (existingIdx !== -1) {
        // Toggle direction
        const newDirection = prev[existingIdx].direction === 'asc' ? 'desc' : 'asc';
        const newConfig = [...prev];
        newConfig[existingIdx] = { key, direction: newDirection };
        return newConfig;
      } else {
        // Add new sort key (limit to 3)
        const newSort: SortConfig = { key, direction: 'asc' };
        if (prev.length < 3) {
          return [...prev, newSort];
        } else {
          // Replace the oldest (first) one if we want to keep current as primary
          // Or just replace the 3rd one. Let's replace the oldest.
          return [...prev.slice(1), newSort];
        }
      }
    });
  };

  const removeSort = (key: keyof AdmissionCase) => {
    setSortConfig(prev => prev.filter(s => s.key !== key));
  };

  // Helper to sort options
  const getOptions = (options: string[], descending = false) => {
    const list = [...new Set(options)];
    list.sort((a, b) => descending ? b.localeCompare(a) : a.localeCompare(b));
    return list;
  };

  // Dynamic values for filters
  const years = getOptions(admissionCases.map(c => c.year.toString()), true);
  const locations = getOptions(admissionCases.map(c => c.location));
  
  const normalize = (name: string) => {
    if (name === '국립국립목포대학교') return '국립목포대학교';
    if (name === '국립국립목포해양대학교') return '국립목포해양대학교';
    return name;
  };

  // Filter universities based on selected locations
  const filteredUnis = selectedLocations.length === 0
    ? admissionCases
    : admissionCases.filter(c => selectedLocations.includes(c.location));
  const universities = getOptions(filteredUnis.map(c => normalize(c.universityName)));
  
  // Filter departments based on selected universities
  const filteredDepts = selectedUnis.length === 0
    ? filteredUnis 
    : filteredUnis.filter(c => selectedUnis.includes(normalize(c.universityName)));
  const departments = getOptions(filteredDepts.map(c => c.departmentName));
  
  const admissionTypes = getOptions(admissionCases.map(c => c.admissionType));
  
  // Filter detailed types
  const filteredDetailed = selectedTypes.length === 0
    ? admissionCases
    : admissionCases.filter(c => selectedTypes.includes(c.admissionType));
  const detailedTypes = ['전체', ...getOptions(filteredDetailed.map(c => c.detailedType))];

  const resultTypes = ['전체', '최종합격(합격+충원합격)', '합격', '충원합격', '불합격'];
  const enrollmentTypes = ['전체', 'Y', 'N', '-'];

  const handleGradeChange = (val: [number, number]) => {
    setGradeRange(val);
    setMinInput(val[0].toFixed(1));
    setMaxInput(val[1].toFixed(1));
  };

  const handleMinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMinInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 1.0 && num <= gradeRange[1]) {
      setGradeRange([num, gradeRange[1]]);
    }
  };

  const handleMaxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMaxInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num <= 9.0 && num >= gradeRange[0]) {
      setGradeRange([gradeRange[0], num]);
    }
  };

  const filteredCases = React.useMemo(() => {
    const normalize = (name: string) => {
      if (name === '국립국립목포대학교') return '국립목포대학교';
      if (name === '국립국립목포해양대학교') return '국립목포해양대학교';
      return name;
    };

    const filtered = admissionCases.filter(c => {
      const inGradeRange = c.grade >= gradeRange[0] && c.grade <= gradeRange[1];
      const matchesSearch = normalize(c.universityName).includes(searchQuery) || c.departmentName.includes(searchQuery);
      const matchesYear = selectedYears.length === 0 || selectedYears.includes(c.year.toString());
      const matchesLocation = selectedLocations.length === 0 || selectedLocations.includes(c.location);
      const matchesUni = selectedUnis.length === 0 || selectedUnis.includes(normalize(c.universityName));
      const matchesDept = selectedDepts.length === 0 || selectedDepts.includes(c.departmentName);
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(c.admissionType);
      const matchesDetailedType = selectedDetailedType === '전체' || c.detailedType === selectedDetailedType;
      const matchesEnrolled = selectedEnrolled === '전체' || c.isEnrolled === selectedEnrolled;
      
      let matchesResult = true;
      if (selectedResult === '전체') matchesResult = true;
      else if (selectedResult === '합격') matchesResult = c.finalResult === '합격';
      else if (selectedResult === '충원합격') matchesResult = c.finalResult === '충원합격';
      else if (selectedResult === '불합격') matchesResult = c.finalResult === '불합격';
      else if (selectedResult === '최종합격(합격+충원합격)') matchesResult = c.finalResult === '합격' || c.finalResult === '충원합격';

      return inGradeRange && matchesSearch && matchesYear && matchesLocation && matchesUni && matchesDept && matchesType && matchesDetailedType && matchesResult && matchesEnrolled;
    });

    // Apply multi-column sort
    return [...filtered].sort((a, b) => {
      for (const config of sortConfig) {
        const { key, direction } = config;
        const valA = a[key];
        const valB = b[key];

        if (valA === valB) continue;

        if (typeof valA === 'string' && typeof valB === 'string') {
          return direction === 'asc' 
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }

        if (typeof valA === 'number' && typeof valB === 'number') {
          return direction === 'asc' ? valA - valB : valB - valA;
        }
      }
      return 0;
    });
  }, [admissionCases, gradeRange, searchQuery, selectedYears, selectedLocations, selectedUnis, selectedDepts, selectedTypes, selectedDetailedType, selectedResult, selectedEnrolled, sortConfig]);

  if (loading) {
    return (
      <div className="pt-40 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-text-dim text-sm animate-pulse">데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-40 text-center">
        <p className="text-rose-500 font-bold mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/80 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 font-sans text-xs">
      {/* Horizontal Filter Box */}
      <div className="glass-card mb-8 border border-white/10 relative z-20">
        <div className="p-6 flex flex-col gap-6">
          {/* Top Row: Grade & Search */}
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="flex-1 w-full">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-3 block">내신 등급 범위 (1.0 ~ 9.0)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="text" value={minInput} onChange={handleMinInputChange}
                  className="w-16 bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-center font-bold outline-none focus:border-primary/50 transition-colors"
                />
                <div className="flex-1 px-2 flex items-center gap-2">
                   <input type="range" min="1" max="9" step="0.1" value={gradeRange[0]} onChange={(e) => handleGradeChange([parseFloat(e.target.value), gradeRange[1]])} className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary" />
                   <input type="range" min="1" max="9" step="0.1" value={gradeRange[1]} onChange={(e) => handleGradeChange([gradeRange[0], parseFloat(e.target.value)])} className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary" />
                </div>
                <input 
                  type="text" value={maxInput} onChange={handleMaxInputChange}
                  className="w-16 bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-center font-bold outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>
            
            <div className="w-full lg:w-80">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-3 block">상세 텍스트 검색</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={14} />
                <input 
                  type="text" placeholder="대학명, 학과명 등..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs font-bold focus:border-primary/50 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Bottom Row: Multi-select Dropdowns */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <MultiSelectFilter label="학년도" selected={selectedYears} setSelected={setSelectedYears} options={years} />
            <MultiSelectFilter label="지역" selected={selectedLocations} setSelected={setSelectedLocations} options={locations} />
            <MultiSelectFilter label="학교명" selected={selectedUnis} setSelected={setSelectedUnis} options={universities} />
            <MultiSelectFilter label="모집단위" selected={selectedDepts} setSelected={setSelectedDepts} options={departments} />
            <MultiSelectFilter label="전형" selected={selectedTypes} setSelected={setSelectedTypes} options={admissionTypes} />
            <FilterSelect label="세부전형" value={selectedDetailedType} onChange={setSelectedDetailedType} options={detailedTypes} />
            <FilterSelect label="합격유형" value={selectedResult} onChange={setSelectedResult} options={resultTypes} />
            <FilterSelect label="등록여부" value={selectedEnrolled} onChange={setSelectedEnrolled} options={enrollmentTypes} />
          </div>
        </div>
      </div>

      {/* Sorted Columns Info */}
      {sortConfig.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 px-2">
          <span className="text-[10px] text-text-dim font-bold uppercase py-1">정렬 순서:</span>
          {sortConfig.map((s, idx) => (
            <div key={s.key} className="flex items-center gap-1 bg-primary/20 text-primary px-2 py-1 rounded border border-primary/30 font-bold text-[10px]">
              {idx + 1}. {getColumnLabel(s.key)} ({s.direction === 'asc' ? '오름차순' : '내림차순'})
              <X size={10} className="cursor-pointer hover:text-white" onClick={() => removeSort(s.key)} />
            </div>
          ))}
        </div>
      )}

      {/* Results Header */}
      <div className="mb-4">
        <h2 className="text-xl font-black tracking-tight text-white px-2">
          검색 결과 <span className="text-primary ml-1">{filteredCases.length}</span>
        </h2>
      </div>

      {/* Results Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left text-[10px] table-fixed">
            <thead className="bg-white/5 text-text-dim uppercase tracking-wider font-bold border-b border-white/10 text-[9px]">
              <tr>
                <SortableHeader label="학년도" columnKey="year" sortConfig={sortConfig} onSort={toggleSort} className="w-[45px] text-center" />
                <SortableHeader label="내신" columnKey="grade" sortConfig={sortConfig} onSort={toggleSort} className="w-[45px] text-center" />
                <SortableHeader label="지역" columnKey="location" sortConfig={sortConfig} onSort={toggleSort} className="w-[55px] text-center" />
                <SortableHeader label="대학" columnKey="universityName" sortConfig={sortConfig} onSort={toggleSort} className="w-[100px]" />
                <SortableHeader label="학과" columnKey="departmentName" sortConfig={sortConfig} onSort={toggleSort} className="w-[130px]" />
                <SortableHeader label="전형" columnKey="admissionType" sortConfig={sortConfig} onSort={toggleSort} className="w-[110px]" />
                <SortableHeader label="세부전형" columnKey="detailedType" sortConfig={sortConfig} onSort={toggleSort} className="w-[90px]" />
                <SortableHeader label="1단계" columnKey="step1Result" sortConfig={sortConfig} onSort={toggleSort} className="w-[65px] text-center" />
                <SortableHeader label="최종" columnKey="finalResult" sortConfig={sortConfig} onSort={toggleSort} className="w-[65px] text-center" />
                <SortableHeader label="불합격사유" columnKey="failReason" sortConfig={sortConfig} onSort={toggleSort} className="w-[90px]" />
                <th className="px-1 py-3 w-[45px] text-center">순위</th>
                <th className="px-1 py-3 w-[45px] text-center">추이</th>
                <SortableHeader label="등록" columnKey="isEnrolled" sortConfig={sortConfig} onSort={toggleSort} className="w-[35px] text-center" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-300">
              {filteredCases.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.03] transition-colors group">
                  <td className="px-2 py-3 text-center text-text-dim opacity-50 font-mono">{c.year}</td>
                  <td className="px-2 py-3 font-black text-white text-[11px] text-center">{c.grade.toFixed(2)}</td>
                  <td className="px-2 py-3 text-center text-text-dim truncate">{c.location}</td>
                  <td className="px-2 py-3 font-black text-white text-[11px] truncate">
                    {c.universityName === '국립국립목포대학교' ? '국립목포대학교' : 
                     c.universityName === '국립국립목포해양대학교' ? '국립목포해양대학교' : c.universityName}
                  </td>
                  <td className="px-2 py-3 font-bold text-[11px] truncate" title={c.departmentName}>{c.departmentName}</td>
                  <td className="px-2 py-3 font-bold text-sky-400 text-[11px] truncate" title={c.admissionType}>{c.admissionType}</td>
                  <td className="px-2 py-3 text-text-dim truncate" title={c.detailedType}>{c.detailedType}</td>
                  <td className="px-2 py-3 text-center">
                    <StepResultBadge result={c.step1Result} />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <FinalResultBadge 
                      result={c.finalResult} 
                      isFinalFilter={selectedResult === '최종합격(합격+충원합격)'} 
                    />
                  </td>
                  <td className="px-2 py-3 text-text-dim text-[9px] truncate" title={c.failReason || ''}>{c.failReason || '-'}</td>
                  <td className="px-1 py-3 text-center text-text-dim">{c.waitlistRank || '-'}</td>
                  <td className="px-1 py-3 text-center text-text-dim font-mono">{c.waitlistHistory || '-'}</td>
                  <td className="px-2 py-3 text-center font-black">
                    <span className={c.isEnrolled === 'Y' ? 'text-primary text-[11px]' : 'text-text-dim opacity-30'}>{c.isEnrolled}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredCases.length === 0 && (
          <div className="py-20 text-center text-text-dim font-medium">
            검색 조건에 맞는 결과가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

function MultiSelectFilter({ label, selected, setSelected, options }: any) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

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
    if (selected.includes(opt)) {
      setSelected(selected.filter((item: string) => item !== opt));
    } else {
      setSelected([...selected, opt]);
    }
  };

  const displayText = selected.length === 0 ? '전체' : `${selected.length}개 선택됨`;

  return (
    <div className="flex flex-col gap-1.5 relative" ref={containerRef}>
      <span className="text-[10px] text-text-dim font-bold ml-1 uppercase">{label}</span>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold flex items-center justify-between cursor-pointer hover:border-white/20 transition-all"
      >
        <span className={selected.length > 0 ? "text-primary" : "text-white/70"}>{displayText}</span>
        <ChevronDown size={14} className={`text-text-dim transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-64 max-h-60 overflow-y-auto bg-[#0A0A0A] border border-white/10 rounded-xl z-[100] p-2 shadow-2xl scrollbar-hide">
          <div 
            onClick={() => { setSelected([]); setIsOpen(false); }}
            className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg cursor-pointer text-xs font-bold border-b border-white/5 mb-1"
          >
            <span className={selected.length === 0 ? "text-primary" : "text-text-dim"}>전체</span>
            {selected.length === 0 && <Check size={12} className="text-primary" />}
          </div>
          {options.map((opt: string, idx: number) => (
            <div 
              key={`${opt}-${idx}`} 
              onClick={() => toggleOption(opt)}
              className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg cursor-pointer text-xs font-bold"
            >
              <span className={selected.includes(opt) ? "text-white" : "text-text-dim"}>{opt}</span>
              {selected.includes(opt) && <Check size={12} className="text-primary" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: any) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] text-text-dim font-bold ml-1 uppercase">{label}</span>
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold outline-none focus:border-primary/50 transition-colors appearance-none cursor-pointer"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'rgba(148,163,184,0.5)\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundPosition: 'right 12px center', backgroundRepeat: 'no-repeat', backgroundSize: '16px' }}
      >
        {options.map((opt: string, idx: number) => (
          <option key={`${opt}-${idx}`} value={opt} className="bg-[#0A0A0A]">{opt}</option>
        ))}
      </select>
    </div>
  );
}

function SortableHeader({ label, columnKey, sortConfig, onSort, className }: any) {
  const sort = sortConfig.find((s: any) => s.key === columnKey);
  const sortIdx = sortConfig.findIndex((s: any) => s.key === columnKey);

  return (
    <th 
      className={`px-2 py-3 cursor-pointer group hover:bg-white/5 transition-colors ${className}`}
      onClick={() => onSort(columnKey)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <div className="flex flex-col -gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
          <ArrowUp className={sort?.direction === 'asc' ? 'text-primary opacity-100' : ''} size={8} />
          <ArrowDown className={sort?.direction === 'desc' ? 'text-primary opacity-100' : ''} size={8} />
        </div>
        {sortIdx !== -1 && (
          <span className="text-[7px] text-primary font-black -mt-2">{sortIdx + 1}</span>
        )}
      </div>
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
    isEnrolled: '등록'
  };
  return labels[key] || key;
}

function StepResultBadge({ result }: { result: string }) {
  if (result === '합격') return <span className="text-emerald-500 font-extrabold">합격</span>;
  if (result === '불합격') return <span className="text-rose-600 font-extrabold">불합격</span>;
  return <span className="text-text-dim opacity-30">{result}</span>;
}

function FinalResultBadge({ result, isFinalFilter }: { result: string, isFinalFilter: boolean }) {
  let displayResult = result;
  let colorClass = "";

  if (isFinalFilter && (result === '합격' || result === '충원합격')) {
    displayResult = '최종합격';
    colorClass = "text-blue-500";
  } else {
    if (result === '합격') colorClass = "text-emerald-500";
    else if (result === '충원합격') colorClass = "text-amber-500";
    else if (result === '불합격') colorClass = "text-rose-600";
  }

  return <span className={`${colorClass} font-extrabold text-[13px] uppercase`}>{displayResult}</span>;
}
