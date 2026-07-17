import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, School, Search, LayoutDashboard, ChevronDown } from 'lucide-react';

interface NavbarProps {
  onNavigate: (view: 'home' | 'search' | 'admin' | 'explore' | 'stats' | 'stats-graph') => void;
  currentView: string;
}

export default function Navbar({ onNavigate, currentView }: NavbarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeDropdown, setActiveDropdown] = React.useState<'cases' | 'stats' | null>(null);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card rounded-none border-t-0 border-x-0 bg-bg/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => onNavigate('home')}
          >
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-primary/20">
              <School className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Dream University <span className="text-primary">Navigator</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {/* 3개년 통계 Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setActiveDropdown('stats')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button 
                className={`text-sm font-bold transition-colors hover:text-primary flex items-center gap-1.5 py-2 ${['stats', 'stats-graph'].includes(currentView) ? 'text-primary' : 'text-text-dim'}`}
              >
                3개년 통계
                <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === 'stats' ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {activeDropdown === 'stats' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 mt-1 w-64 bg-zinc-950/95 backdrop-blur-md border border-white/10 rounded-2xl p-2 shadow-xl flex flex-col gap-1 z-50"
                  >
                    <button
                      onClick={() => { onNavigate('stats'); setActiveDropdown(null); }}
                      className={`text-left text-xs font-black px-4 py-3 rounded-xl transition-all hover:bg-white/5 ${currentView === 'stats' ? 'text-primary bg-white/5' : 'text-text-dim'}`}
                    >
                      지역·대학·학과·전형별 검색
                    </button>
                    <button
                      onClick={() => { onNavigate('stats-graph'); setActiveDropdown(null); }}
                      className={`text-left text-xs font-black px-4 py-3 rounded-xl transition-all hover:bg-white/5 ${currentView === 'stats-graph' ? 'text-primary bg-white/5' : 'text-text-dim'}`}
                    >
                      그래프 검색
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 합격 사례 Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setActiveDropdown('cases')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button 
                className={`text-sm font-bold transition-colors hover:text-primary flex items-center gap-1.5 py-2 ${['explore', 'search'].includes(currentView) ? 'text-primary' : 'text-text-dim'}`}
              >
                합격 사례
                <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === 'cases' ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {activeDropdown === 'cases' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 mt-1 w-64 bg-zinc-950/95 backdrop-blur-md border border-white/10 rounded-2xl p-2 shadow-xl flex flex-col gap-1 z-50"
                  >
                    <button
                      onClick={() => { onNavigate('explore'); setActiveDropdown(null); }}
                      className={`text-left text-xs font-black px-4 py-3 rounded-xl transition-all hover:bg-white/5 ${currentView === 'explore' ? 'text-primary bg-white/5' : 'text-text-dim'}`}
                    >
                      대학·전형별 합격 사례 통계
                    </button>
                    <button
                      onClick={() => { onNavigate('search'); setActiveDropdown(null); }}
                      className={`text-left text-xs font-black px-4 py-3 rounded-xl transition-all hover:bg-white/5 ${currentView === 'search' ? 'text-primary bg-white/5' : 'text-text-dim'}`}
                    >
                      합격사례 검색
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={() => onNavigate('admin')}
              className={`text-sm font-bold flex items-center gap-2 transition-all hover:text-primary ${currentView === 'admin' ? 'text-primary' : 'text-text-dim'}`}
            >
              관리자
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-zinc-400">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden glass border-b border-white/5"
          >
            <div className="px-4 py-6 flex flex-col gap-5">
              <button 
                onClick={() => { onNavigate('home'); setIsOpen(false); }}
                className="text-lg font-bold text-left px-4 py-2 rounded-lg hover:bg-white/5"
              >
                홈
              </button>

              {/* 3-Year Stats Group */}
              <div className="space-y-1.5">
                <div className="text-xs font-black text-text-dim uppercase tracking-wider px-4">3개년 통계</div>
                <div className="pl-4 flex flex-col gap-1">
                  <button 
                    onClick={() => { onNavigate('stats'); setIsOpen(false); }}
                    className={`text-sm font-bold text-left px-4 py-2.5 rounded-lg hover:bg-white/5 ${currentView === 'stats' ? 'text-primary bg-white/5' : 'text-white'}`}
                  >
                    지역·대학·학과·전형별 검색
                  </button>
                  <button 
                    onClick={() => { onNavigate('stats-graph'); setIsOpen(false); }}
                    className={`text-sm font-bold text-left px-4 py-2.5 rounded-lg hover:bg-white/5 ${currentView === 'stats-graph' ? 'text-primary bg-white/5' : 'text-white'}`}
                  >
                    그래프 검색
                  </button>
                </div>
              </div>

              {/* Admission Cases Group */}
              <div className="space-y-1.5">
                <div className="text-xs font-black text-text-dim uppercase tracking-wider px-4">합격 사례</div>
                <div className="pl-4 flex flex-col gap-1">
                  <button 
                    onClick={() => { onNavigate('explore'); setIsOpen(false); }}
                    className={`text-sm font-bold text-left px-4 py-2.5 rounded-lg hover:bg-white/5 ${currentView === 'explore' ? 'text-primary bg-white/5' : 'text-white'}`}
                  >
                    대학·전형별 합격 사례 통계
                  </button>
                  <button 
                    onClick={() => { onNavigate('search'); setIsOpen(false); }}
                    className={`text-sm font-bold text-left px-4 py-2.5 rounded-lg hover:bg-white/5 ${currentView === 'search' ? 'text-primary bg-white/5' : 'text-white'}`}
                  >
                    합격사례 검색
                  </button>
                </div>
              </div>

              <button 
                onClick={() => { onNavigate('admin'); setIsOpen(false); }}
                className="text-lg font-bold text-left px-4 py-2 rounded-lg hover:bg-white/5 flex items-center gap-2"
              >
                <LayoutDashboard size={20} />
                관리자 모드
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
