import React from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Plus, 
  Search, 
  Zap,
  MoreVertical, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  Settings,
  Bell,
  LogOut,
  Database,
  Loader2,
  FileUp,
  ArrowRight,
  Code2,
  Trash2,
  Lock,
  User
} from 'lucide-react';
import { fetchAllAdmissionCases, uploadOfficialStats, deleteAllOfficialStats } from '../lib/admissionService';
import { seedInitialData, checkNeedSeeding } from '../lib/dataSeeder';
import { AdmissionCase } from '../types';
import Papa from 'papaparse';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function AdminDashboard() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [loginId, setLoginId] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');
  const [loginError, setLoginError] = React.useState('');

  const [activeTab, setActiveTab] = React.useState<'cases' | 'stats'>('cases');
  const [seeding, setSeeding] = React.useState(false);
  const [needsSeed, setNeedsSeed] = React.useState(false);
  const [recentCases, setRecentCases] = React.useState<AdmissionCase[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [jsonInput, setJsonInput] = React.useState('');
  const [showJsonInput, setShowJsonInput] = React.useState(false);
  const [statsJsonInput, setStatsJsonInput] = React.useState('');
  const [statusMessage, setStatusMessage] = React.useState<{text: string, type: 'success' | 'error' | 'info'} | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const normalizeUniversityName = (name: string) => {
    if (!name) return '';
    const trimmed = name.trim();
    if (trimmed === '국립국립목포대학교') return '국립목포대학교';
    if (trimmed === '국립국립목포해양대학교') return '국립목포해양대학교';
    return trimmed;
  };

  const handleStatsJsonUpload = async () => {
    if (!statsJsonInput.trim()) return;
    setUploading(true);
    try {
      const data = JSON.parse(statsJsonInput);
      const statsArray = (Array.isArray(data) ? data : [data]).map(s => ({
        ...s,
        universityName: normalizeUniversityName(s.universityName)
      }));
      await uploadOfficialStats(statsArray);
      showStatus(`${statsArray.length}개의 통계 데이터가 성공적으로 업로드되었습니다.`, 'success');
      setStatsJsonInput('');
    } catch (error: any) {
      showStatus("통계 데이터 JSON 형식이 올바르지 않거나 업로드에 실패했습니다: " + error.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleStatsFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    const parseConfig = (encoding: string) => ({
      skipEmptyLines: true,
      encoding: encoding,
      complete: async (results: any) => {
        const allRows = results.data as string[][];
        if (allRows.length < 3) {
          // If we tried UTF-8 and it looks empty or corrupted, we will retry in EUC-KR if this isn't already EUC-KR
          if (encoding === 'UTF-8') {
            Papa.parse(file, parseConfig('EUC-KR'));
            return;
          }
          showStatus("올바른 양식의 CSV 파일이 아닙니다.", "error");
          setUploading(false);
          return;
        }

        // Quick check if Row 0 or 1 contains readable Korean. 
        // If it's garbage and we are in UTF-8, retry with EUC-KR.
        if (encoding === 'UTF-8') {
          const sample = allRows[0].join('');
          if (sample.includes('') || /[^a-zA-Z0-9\sㄱ-ㅎㅏ-ㅣ가-힣,()]/.test(sample) && !sample.includes('지역')) {
             Papa.parse(file, parseConfig('EUC-KR'));
             return;
          }
        }

        try {
          // Row 0: Category labels
          // Row 1: Sub-category labels (Years)
          // Row 2: Data starts
          const dataRows = allRows.slice(2);
          
          const statsToUpload: any[] = dataRows.map(row => {
            const clean = (val: any) => (val && val !== '-' ? String(val).trim() : '');
            
            // Basic validation: row must have uni name
            if (!row || row.length < 5 || !clean(row[1])) return null;

            const item: any = {
              location: clean(row[0]) || '부산',
              universityName: normalizeUniversityName(clean(row[1])),
              departmentName: clean(row[2]),
              admissionType: clean(row[3]),
              detailedType: clean(row[4]),
              stats: {}
            };

            const years = ['2024', '2025', '2026'];
            years.forEach((year, yIdx) => {
              item.stats[year] = {
                enrollment: clean(row[5 + yIdx]),
                registeredCount: clean(row[8 + yIdx]),
                competitionRate: clean(row[11 + yIdx]),
                waitlistLastRank: clean(row[14 + yIdx]),
                average: clean(row[17 + yIdx]),
                cut50: clean(row[20 + yIdx]),
                cut70: clean(row[23 + yIdx]),
                cut80: clean(row[26 + yIdx]),
              };
            });

            return item;
          }).filter(item => item !== null);

          if (statsToUpload.length === 0) {
             showStatus("업로드할 유효한 데이터가 없습니다. CSV 형식을 확인해주세요.", "error");
             setUploading(false);
             return;
          }

          await uploadOfficialStats(statsToUpload);
          showStatus(`${statsToUpload.length}개의 통계 데이터가 성공적으로 업로드되었습니다.`, "success");
        } catch (err: any) {
          showStatus('데이터 분석 중 오류가 발생했습니다: ' + err.message, "error");
        } finally {
          setUploading(false);
          if (event.target) event.target.value = '';
        }
      },
      error: (err: any) => {
        showStatus('CSV 파싱 오류: ' + err.message, "error");
        setUploading(false);
      }
    });

    Papa.parse(file, parseConfig('UTF-8'));
  };

  const handleClearAllStats = async () => {
    try {
      setUploading(true);
      setShowDeleteConfirm(false);
      showStatus('모든 통계 데이터를 삭제하는 중...', 'info');
      const count = await deleteAllOfficialStats();
      showStatus(`${count}개의 모든 통계 데이터가 삭제되었습니다.`, "success");
    } catch (err: any) {
      console.error("Delete Error:", err);
      showStatus('삭제 중 오류 발생: ' + (err.message || 'Firestore 권한을 확인해주세요.'), "error");
    } finally {
      setUploading(false);
    }
  };

  const showStatus = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMessage({ text, type });
    if (type !== 'error') {
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const loadRecent = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAllAdmissionCases();
      setRecentCases(data.slice(0, 4));
      
      // Use the helper to check if either collection needs seeding
      const needsInit = await checkNeedSeeding();
      setNeedsSeed(needsInit);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log("File selected:", file.name);
    setUploading(true);

    // Strategy: Try parsing with UTF-8 first.
    // If we can't find '학년도' or 'year' in headers, retry with EUC-KR (common for Korean Excel CSVs)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      encoding: 'UTF-8',
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const rows = results.data as any[];
        const firstRow = rows[0] || {};
        const headers = Object.keys(firstRow).join(',');
        
        console.log("UTF-8 headers found:", headers);

        if (headers.includes('학년도') || headers.includes('year') || headers.includes('성적')) {
          processParsedData(rows, event);
        } else {
          console.log("Retrying with EUC-KR...");
          Papa.parse(file, {
            header: true,
            skipEmptyLines: 'greedy',
            encoding: 'EUC-KR',
            transformHeader: (h) => h.trim(),
            complete: (resultsKR) => {
              processParsedData(resultsKR.data as any[], event);
            },
            error: (err) => {
              console.error("EUC-KR parse error:", err);
              setUploading(false);
              showStatus("EUC-KR 파일 읽기 중 오류가 발생했습니다.", "error");
            }
          });
        }
      },
      error: (err) => {
        console.error("UTF-8 parse error:", err);
        setUploading(false);
        showStatus("파일 읽기 오류: " + err.message, "error");
      }
    });
  };

  const processParsedData = async (rows: any[], event: React.ChangeEvent<HTMLInputElement>) => {
    if (rows.length === 0) {
      showStatus("파일에 데이터가 없습니다.", "error");
      setUploading(false);
      return;
    }

    const firstRow = rows[0];
    const getVal = (row: any, ...keys: string[]) => {
      for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null) return String(row[key]).trim();
      }
      return null;
    };

    // Check for "학년도" or "year" to verify it's the right file structure
    if (!getVal(firstRow, '학년도', 'year', 'Year')) {
      const foundHeaders = Object.keys(firstRow).join(', ');
      showStatus(`'학년도' 헤더를 찾을 수 없습니다. (헤더: ${foundHeaders})`, "error");
      setUploading(false);
      return;
    }

    try {
      showStatus(`${rows.length}개의 데이터를 업로드하는 중...`, "info");
      const colRef = collection(db, 'admissionCases');

      // Processing in chunks to respect Firestore limits (500 per batch)
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500);
        const batch = writeBatch(db);
        
        for (const raw of chunk) {
          const newDoc = doc(colRef);
          batch.set(newDoc, {
            id: newDoc.id,
            year: parseInt(getVal(raw, '학년도', 'year') || '2024') || 2024,
            grade: parseFloat(getVal(raw, '내신성적', 'grade') || '0') || 0,
            location: getVal(raw, '지역', 'location') || '',
            universityName: normalizeUniversityName(getVal(raw, '학교명', 'universityName') || ''),
            admissionType: getVal(raw, '전형유형', 'admissionType') || '',
            detailedType: getVal(raw, '세부유형', 'detailedType') || '',
            departmentName: getVal(raw, '모집단위(학과)', 'departmentName') || '',
            step1Result: getVal(raw, '1단계', 'step1Result') || '-',
            finalResult: getVal(raw, '최종단계', 'finalResult', '최종합불') || '합격',
            failReason: getVal(raw, '불합격사유', 'failReason', '최초합불여부') || '',
            waitlistRank: getVal(raw, '최초후보순위', 'waitlistRank') || '',
            waitlistHistory: getVal(raw, '순위변동추이', 'waitlistHistory') || '',
            isEnrolled: getVal(raw, '등록여부', 'isEnrolled') || '-'
          });
        }
        await batch.commit();
      }

      showStatus(`성공적으로 ${rows.length}개의 데이터를 업로드했습니다.`, "success");
      loadRecent();
    } catch (err: any) {
      console.error("Upload Error:", err);
      showStatus('업로드 오류: ' + (err.message || 'Firestore 권한을 확인해주세요.'), "error");
    } finally {
      setUploading(false);
      event.target.value = ''; // Clear for next upload
    }
  };

  const handleJsonUpload = async () => {
    if (!jsonInput.trim()) {
      showStatus("JSON 데이터를 입력해주세요.", "error");
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      
      if (rows.length === 0) {
        showStatus("업로드할 데이터가 없습니다.", "error");
        return;
      }

      const getVal = (row: any, ...keys: string[]) => {
        for (const key of keys) {
          if (row[key] !== undefined && row[key] !== null) return String(row[key]).trim();
        }
        return null;
      };

      setUploading(true);
      showStatus(`${rows.length}개의 데이터를 업로드하는 중...`, "info");
      const colRef = collection(db, 'admissionCases');

      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500);
        const batch = writeBatch(db);
        
        for (const raw of chunk) {
          const newDoc = doc(colRef);
          batch.set(newDoc, {
            id: newDoc.id,
            year: parseInt(getVal(raw, '학년도', 'year', 'Year') || '2024') || 2024,
            grade: parseFloat(getVal(raw, '내신성적', 'grade', 'Grade') || '0') || 0,
            location: getVal(raw, '지역', 'location') || '',
            universityName: normalizeUniversityName(getVal(raw, '학교명', 'universityName') || ''),
            admissionType: getVal(raw, '전형유형', 'admissionType') || '',
            detailedType: getVal(raw, '세부유형', 'detailedType') || '',
            departmentName: getVal(raw, '모집단위(학과)', 'departmentName') || '',
            step1Result: getVal(raw, '1단계', 'step1Result') || '-',
            finalResult: getVal(raw, '최종단계', 'finalResult') || '합격',
            failReason: getVal(raw, '불합격사유', 'failReason', '최초합불여부') || '',
            waitlistRank: getVal(raw, '최초후보순위', 'waitlistRank') || '',
            waitlistHistory: getVal(raw, '순위변동추이', 'waitlistHistory') || '',
            isEnrolled: getVal(raw, '등록여부', 'isEnrolled') || '-'
          });
        }
        await batch.commit();
      }

      showStatus(`성공적으로 ${rows.length}개의 데이터를 업로드했습니다.`, "success");
      setJsonInput('');
      setShowJsonInput(false);
      loadRecent();
    } catch (err: any) {
      console.error("JSON Upload Error:", err);
      showStatus('JSON 파싱 오류: ' + err.message, "error");
    } finally {
      setUploading(false);
    }
  };


  const handleSeed = async () => {
    try {
      setSeeding(true);
      showStatus("샘플 데이터를 업로드 중입니다...", "info");
      await seedInitialData();
      showStatus("데이터 업로드가 완료되었습니다.", "success");
      loadRecent();
    } catch (err) {
      console.error(err);
      showStatus("업로드 중 오류가 발생했습니다.", "error");
    } finally {
      setSeeding(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginId === 'ydg116258' && loginPassword === 'Emrrud0922!') {
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md glass-card p-10 border border-white/10"
        >
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 rounded-3xl bg-primary/20 flex items-center justify-center text-primary mb-6">
              <Lock size={32} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Admin Login</h1>
            <p className="text-text-dim text-sm font-bold mt-2">관리자 계정으로 로그인해 주세요.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-widest pl-1">ID</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" />
                <input 
                  type="text" 
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-primary/50 transition-all"
                  placeholder="관리자 아이디"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-widest pl-1">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" />
                <input 
                  type="password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-primary/50 transition-all"
                  placeholder="비밀번호"
                  required
                />
              </div>
            </div>

            {loginError && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-rose-500 text-xs font-bold text-center"
              >
                {loginError}
              </motion.div>
            )}

            <button 
              type="submit"
              className="w-full btn-primary py-4 rounded-2xl font-black text-base shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              로그인
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-20 min-h-screen relative z-10 font-sans">
      <div className="flex">
        {/* Main Content */}
        <main className="flex-1 p-8">
          {/* Status Message */}
          {statusMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 p-4 rounded-2xl flex items-center gap-3 border shadow-lg ${
                statusMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                statusMessage.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
              }`}
            >
              {statusMessage.type === 'success' ? <CheckCircle2 size={20} /> : 
               statusMessage.type === 'error' ? <AlertCircle size={20} /> : <Loader2 size={20} className="animate-spin" />}
              <span className="text-sm font-bold">{statusMessage.text}</span>
            </motion.div>
          )}

          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">관리자 대시보드</h1>
              <p className="text-text-dim mt-1">입시 데이터 업로드 및 시스템 관리를 진행합니다.</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-3 glass-card rounded-2xl">
                <Bell size={20} className="text-text-dim" />
              </button>
              <div className="flex items-center gap-3 px-4 py-2 glass-card rounded-2xl">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">AD</div>
                <span className="text-sm font-bold text-white">관리자</span>
              </div>
            </div>
          </div>

          <div className="mb-10 p-1 glass-card inline-flex rounded-xl bg-white/5">
            <button 
              onClick={() => setActiveTab('cases')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'cases' ? 'bg-primary text-white' : 'text-text-dim hover:text-white'}`}
            >
              합격 사례 관리
            </button>
            <button 
              onClick={() => setActiveTab('stats')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'stats' ? 'bg-primary text-white' : 'text-text-dim hover:text-white'}`}
            >
              3개년 통계 관리
            </button>
          </div>

          {/* Global Seeding Banner */}
          {needsSeed && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-10 p-8 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-amber-500/5"
            >
              <div className="flex items-center gap-5 text-amber-500 text-center md:text-left">
                <div className="p-4 rounded-2xl bg-amber-500/10">
                  <Database size={40} />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight leading-tight">첨부파일 데이터 구축이 필요합니다</h3>
                  <p className="text-sm font-bold opacity-70 mt-1">제공해주신 3개년 통계 및 사례 샘플 데이터를 기반으로 즉시 데이터베이스를 생성하세요.</p>
                </div>
              </div>
              <button 
                onClick={handleSeed}
                disabled={seeding}
                className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-black px-10 py-4 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-3 shadow-xl shadow-amber-500/20 disabled:opacity-50 hover:scale-105 active:scale-95"
              >
                {seeding ? <Loader2 className="animate-spin" size={24} /> : <Zap size={24} />}
                지금 즉시 데이터 구축하기
              </button>
            </motion.div>
          )}

          {activeTab === 'cases' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
              <div className={`p-8 glass-card border-dashed border-2 ${needsSeed ? 'border-amber-500/50 bg-amber-500/5' : 'border-white/10'}`}>
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <FileUp size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">합격 사례 대량 업로드 (CSV)</h3>
                    <p className="text-sm text-text-dim">개별 지원 사례 CSV 파일을 선택하세요.</p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <label className="flex-1">
                    <div className="btn-primary py-3 px-6 flex items-center justify-center gap-2 cursor-pointer text-sm">
                      {uploading ? <Loader2 className="animate-spin" size={18} /> : <FileUp size={18} />}
                      {uploading ? '업로드 중...' : 'CSV 파일 선택'}
                    </div>
                    <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                  </label>
                  
                  {needsSeed && (
                    <button 
                      onClick={handleSeed}
                      disabled={seeding}
                      className="flex-1 py-3 px-6 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      {seeding ? <Loader2 className="animate-spin" size={18} /> : <Database size={18} />}
                      샘플로 초기화
                    </button>
                  )}
                </div>
                <p className="mt-4 text-[10px] text-text-dim italic">
                  * 필수 헤더: 학년도, 내신성적, 지역, 학교명, 전형유형, 모집단위(학과), 최종단계
                </p>
              </div>

              <div className="p-8 glass-card border-white/10">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
                    <Code2 size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="text-lg font-bold text-white">JSON 직접 입력</h3>
                      <button 
                        onClick={() => setShowJsonInput(!showJsonInput)}
                        className="text-xs text-primary hover:underline font-bold"
                      >
                        {showJsonInput ? '닫기' : '입력창 열기'}
                      </button>
                    </div>
                    <p className="text-sm text-text-dim">데이터를 JSON 배열 형태로 바로 붙여넣으세요.</p>
                  </div>
                </div>
                
                {showJsonInput && (
                  <div className="mt-4 space-y-4">
                    <textarea
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      placeholder='[{ "학년도": 2024, "내신성적": 2.5, "학교명": "서울대학교", ... }]'
                      className="w-full h-40 bg-black/40 border border-white/10 rounded-xl p-4 text-xs font-mono text-zinc-300 focus:border-primary/50 outline-none resize-none"
                    />
                    <button 
                      onClick={handleJsonUpload}
                      disabled={uploading || !jsonInput.trim()}
                      className="w-full btn-primary py-3 px-6 flex items-center justify-center gap-2 cursor-pointer text-sm"
                    >
                      {uploading ? <Loader2 className="animate-spin" size={18} /> : <Code2 size={18} />}
                      JSON 데이터 업로드
                    </button>
                  </div>
                )}

                {!showJsonInput && (
                  <a 
                    href="https://console.firebase.google.com/project/gen-lang-client-0276044322/firestore/databases/(default)/data"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline font-bold mt-2 text-sm"
                  >
                    Firebase 콘솔로 이동 <ArrowRight size={14} />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
              <div className="p-8 glass-card border-dashed border-2 border-white/10">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 rounded-xl bg-sky-500/10 text-sky-500">
                    <FileUp size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">3개년 통계 대량 업로드 (CSV)</h3>
                    <p className="text-sm text-text-dim">대학 공식 발표 입결 CSV 파일을 선택하세요.</p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 mt-6">
                  <label className="flex-1">
                    <div className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl py-3 px-6 flex items-center justify-center gap-2 cursor-pointer text-sm font-bold transition-all shadow-lg shadow-sky-500/20">
                      {uploading ? <Loader2 className="animate-spin" size={18} /> : <FileUp size={18} />}
                      {uploading ? '업로드 중...' : 'CSV 파일 선택'}
                    </div>
                    <input type="file" accept=".csv" onChange={handleStatsFileUpload} className="hidden" disabled={uploading} />
                  </label>
                  {showDeleteConfirm ? (
                    <div className="flex-1 flex flex-col gap-2 p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                      <p className="text-[11px] font-black text-rose-500 text-center uppercase tracking-tighter">진짜로 모든 통계 데이터를 삭제할까요?</p>
                      <div className="flex gap-2">
                        <button 
                          onClick={handleClearAllStats}
                          className="flex-1 bg-rose-500 text-white py-2 rounded-lg text-xs font-black"
                        >
                          네, 전체 삭제
                        </button>
                        <button 
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 bg-white/10 text-white py-2 rounded-lg text-xs font-black"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={uploading}
                      className="bg-white/5 hover:bg-rose-500/20 text-rose-500/80 hover:text-rose-500 border border-white/10 hover:border-rose-500/30 rounded-xl py-3 px-6 flex items-center justify-center gap-2 text-sm font-bold transition-all disabled:opacity-50"
                    >
                      <Trash2 size={18} />
                      전체 통계 삭제
                    </button>
                  )}
                </div>
                <p className="mt-4 text-[10px] text-text-dim italic leading-relaxed">
                  * 필수 헤더: 학교명, 학과, 전형, 세부전형, 연도, 모집인원, 등록인원, 경쟁률, 충원순위, 평균, 50%컷, 70%컷, 80%컷
                </p>
              </div>

              <div className="p-8 glass-card border-white/10">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
                    <Code2 size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white">JSON 직접 입력</h3>
                    <p className="text-sm text-text-dim">공식 통계 데이터를 JSON 형태로 업로드하세요.</p>
                  </div>
                </div>
                <textarea
                  value={statsJsonInput}
                  onChange={(e) => setStatsJsonInput(e.target.value)}
                  placeholder='{ "universityName": "A대학교", "departmentName": "경영학과", "admissionType": "학종", "detailedType": "일반", "stats": { "2024": { "enrollment": "20", "registeredCount": "18", ... } } }'
                  className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-xs font-mono text-zinc-300 focus:border-primary/50 outline-none resize-none mb-4"
                />
                <button 
                  onClick={handleStatsJsonUpload}
                  disabled={uploading || !statsJsonInput.trim()}
                  className="w-full bg-white/5 hover:bg-white/10 text-white py-3 px-6 rounded-xl flex items-center justify-center gap-2 text-sm font-bold border border-white/10 transition-all disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="animate-spin" size={18} /> : <Code2 size={18} />}
                  JSON 데이터 업로드
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatsMiniCard label="신규 사례" value={recentCases.length.toString()} trend="+0%" icon={CheckCircle2} color="text-emerald-500" />
            <StatsMiniCard label="일일 방문자" value="2,842" trend="+5.4%" icon={TrendingUp} color="text-primary" />
            <StatsMiniCard label="경고 알림" value="0" trend="-" icon={AlertCircle} color="text-amber-500" />
            <StatsMiniCard label="전체 유저" value="1,204" trend="+12" icon={Users} color="text-text-dim" />
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-card p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold tracking-tight text-white">최근 등록된 입시 데이터</h3>
                  <button className="text-primary text-xs font-bold uppercase tracking-widest hover:underline">
                    전체 보기
                  </button>
                </div>
                
                <div className="space-y-4">
                  {loading ? (
                    <div className="py-10 flex justify-center">
                      <Loader2 className="animate-spin text-zinc-600" />
                    </div>
                  ) : recentCases.length > 0 ? (
                    recentCases.map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-4 glass-card hover:bg-white/[0.03] transition-all group border-white/5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary font-mono">
                            {c.grade}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white">
                              {c.universityName === '국립국립목포대학교' ? '국립목포대학교' : 
                               c.universityName === '국립국립목포해양대학교' ? '국립목포해양대학교' : c.universityName}
                            </div>
                            <div className="text-[10px] text-text-dim font-bold uppercase tracking-wider">{c.departmentName} · {c.admissionType}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right hidden sm:block">
                            <div className="text-[10px] text-text-dim uppercase font-bold">합격여부</div>
                            <div className="text-xs font-bold text-white">{c.finalResult}</div>
                          </div>
                          <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <MoreVertical size={18} className="text-text-dim" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-20 text-center flex flex-col items-center gap-3">
                      <div className="p-4 rounded-full bg-white/5 text-zinc-600 mb-2">
                        <Database size={32} />
                      </div>
                      <p className="text-zinc-500 text-sm font-medium">데이터베이스가 비어 있습니다.</p>
                      <p className="text-zinc-600 text-[11px] max-w-xs">좌측 상단의 'CSV 파일 선택' 버튼을 눌러 데이터를 업로드하거나 샘플로 초기화하세요.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass-card p-8">
                <h3 className="text-xl font-bold tracking-tight text-white mb-6">시스템 설정</h3>
                <div className="space-y-6">
                  <SettingItem label="전체 테마 색상" value="Purple (#8B5CF6)" />
                  <SettingItem label="보안 모드" value="강함 (Firestore Rules 2.0)" />
                  <div className="pt-6 mt-6 border-t border-white/5 space-y-2">
                    <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.05] transition-all group text-white">
                      <div className="flex items-center gap-3">
                        <Settings size={18} className="text-text-dim" />
                        <span className="text-sm font-bold">설정 열기</span>
                      </div>
                    </button>
                    <button 
                      onClick={() => setIsLoggedIn(false)}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-rose-500/10 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <LogOut size={18} className="text-rose-500" />
                        <span className="text-sm font-bold text-rose-500">로그아웃</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatsMiniCard({ label, value, trend, icon: Icon, color }: any) {
  return (
    <div className="p-6 rounded-3xl border border-white/5 bg-zinc-900/30">
      <div className="flex justify-between items-start mb-4">
        <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider">{label}</label>
        <div className={`p-2 rounded-xl bg-white/5 ${color}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div className="text-2xl font-bold text-white font-mono">{value}</div>
        <div className={`text-xs font-bold ${trend.startsWith('+') ? 'text-emerald-500' : 'text-zinc-500'}`}>
          {trend}
        </div>
      </div>
    </div>
  );
}

function SettingItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none">{label}</span>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}
