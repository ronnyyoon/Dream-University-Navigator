import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, ArrowRight, School, BookOpen, Database, Trophy, Users, Calendar } from 'lucide-react';
import { trackVisit, getVisitorStats, VisitorStats } from '../lib/visitorService';

const ICON_MAP: Record<string, any> = {
  School,
  BookOpen,
  Database,
  Trophy
};

interface HomeProps {
  onSearch: () => void;
  onExplore: () => void;
  onStats: () => void;
  onUniClick: (uni: string) => void;
  stats: any[];
  admissionCases: any[];
}

export default function Home({ onSearch, onExplore, onStats, onUniClick, stats, admissionCases }: HomeProps) {
  const [visitorStats, setVisitorStats] = React.useState<VisitorStats | null>(null);

  React.useEffect(() => {
    trackVisit().then(setVisitorStats).catch(console.error);
  }, []);

  const dynamicUnis = React.useMemo(() => {
    const normalize = (name: string) => {
      if (name === '국립국립목포대학교') return '국립목포대학교';
      if (name === '국립국립목포해양대학교') return '국립목포해양대학교';
      return name;
    };

    // Count occurrences for each university to sort by popularity
    const counts: Record<string, number> = {};
    admissionCases.forEach(c => {
      const name = normalize(c.universityName);
      counts[name] = (counts[name] || 0) + 1;
    });

    const uniMap = new Map();
    admissionCases.forEach(c => {
      const normName = normalize(c.universityName);
      if (!uniMap.has(normName)) {
        uniMap.set(normName, {
          id: normName,
          name: normName,
          location: c.location,
          count: counts[normName],
          departmentCount: new Set(admissionCases.filter(x => normalize(x.universityName) === normName).map(x => x.departmentName)).size
        });
      }
    });
    
    // Sort by count (descending)
    return Array.from(uniMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); 
  }, [admissionCases]);

  return (
    <div className="pt-24 pb-20 relative z-10">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-center lg:text-left">
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
                <span className="text-gradient">데이터로 보는</span> <br />
                대학입시의 모든 것
              </h1>
              <p className="text-text-dim text-lg md:text-xl max-w-2xl mx-auto lg:mx-0 mb-10 leading-relaxed font-medium">
                대학별·전형별 상세 사례부터 대학 발표 데이터까지,<br className="hidden md:block" /> 
                꿈꾸는 대학으로 가는 가장 정확한 길을 제시합니다.
              </p>
            </motion.div>

            {/* Visitor Stats Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="flex flex-wrap justify-center lg:justify-start gap-4 mt-2"
            >
              {visitorStats && (
                <div className="flex items-center gap-6 px-6 py-2.5 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary opacity-60" />
                    <span className="text-[11px] font-black text-text-dim uppercase tracking-wider">오늘 방문</span>
                    <span className="text-sm font-black text-white font-mono">{visitorStats.daily.toLocaleString()}</span>
                  </div>
                  <div className="w-[1px] h-3 bg-white/10" />
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary opacity-60" />
                    <span className="text-[11px] font-black text-text-dim uppercase tracking-wider">누적 방문</span>
                    <span className="text-sm font-black text-white font-mono">{visitorStats.total.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          <motion.div
            className="lg:col-span-5 flex justify-center lg:justify-end mt-6 lg:mt-0"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            {/* Stylish thank you card */}
            <div className="w-full max-w-sm glass-card p-6 border border-primary/20 bg-gradient-to-br from-primary/10 via-transparent to-transparent relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 rounded-full blur-2xl group-hover:scale-150 transition-all duration-500" />
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary">
                  <Trophy size={20} />
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Special Thanks</div>
                  <p className="text-sm text-white/90 leading-relaxed font-medium">
                    소수점 하나하나 직접 자료를 수집하는데 도움을 주신 <span className="text-primary font-bold">여수고등학교 3학년 담임선생님들</span>께 감사드립니다.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => {
            const Icon = ICON_MAP[stat.icon];
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 group hover:border-primary/40 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] text-text-dim uppercase tracking-widest font-bold">{stat.label}</span>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                    {Icon && <Icon className="w-4 h-4 text-primary" />}
                  </div>
                </div>
                <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Feature Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { 
              title: '대학·전형별 사례', 
              desc: '대학별 모집 단위 및 전형별 합격 사례를 심층적으로 분석하여 제공합니다.',
              onClick: onExplore
            },
            { 
              title: '대학발표 3개년 통계', 
              desc: '대학 공식 입결 데이터의 3개년 흐름을 분석하여 보다 객관적인 지표를 제시합니다.',
              onClick: onStats
            },
            { 
              title: '내신등급별 합격사례', 
              desc: '나의 내신 등급과 비슷한 선배들의 실제 합격 사례를 상세히 확인하세요.',
              onClick: onSearch
            },
          ].map((feature, i) => (
            <motion.div 
              key={feature.title} 
              whileHover={{ y: -8, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
              onClick={feature.onClick}
              className="glass-card p-8 cursor-pointer transition-all border border-white/10 hover:border-primary/30 group"
            >
              <div className="w-8 h-1 rounded-full bg-primary mb-6 group-hover:w-16 transition-all" />
              <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
              <p className="text-text-dim leading-relaxed text-sm font-medium">{feature.desc}</p>
              <div className="mt-8 flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                탐색하기 <ChevronRight size={14} />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* University Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">주요 대학</h2>
            <p className="text-text-dim font-medium">가장 많은 합격 사례가 등록된 인기 대학 순입니다.</p>
          </div>
          <button 
            onClick={onExplore}
            className="text-primary hover:underline flex items-center gap-1 font-bold text-sm"
          >
            전체 보기 <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {dynamicUnis.length > 0 ? dynamicUnis.map((uni) => (
            <motion.div
              key={uni.id}
              whileHover={{ y: -5 }}
              onClick={() => onUniClick(uni.name)}
              className="glass-card p-6 relative overflow-hidden group cursor-pointer"
            >
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/10 blur-3xl group-hover:bg-primary/20 transition-all" />
              <h4 className="text-lg font-bold mb-3">{uni.name}</h4>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-text-dim">{uni.location}</span>
                <span className="text-primary bg-primary/10 px-2 py-1 rounded">사례 {uni.count}건</span>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-full py-10 text-center text-text-dim text-sm italic">
              데이터를 불러오는 중이거나 등록된 대학이 없습니다.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
