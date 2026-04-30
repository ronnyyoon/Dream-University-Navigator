import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, School, Search, LayoutDashboard } from 'lucide-react';

interface NavbarProps {
  onNavigate: (view: 'home' | 'search' | 'admin' | 'explore' | 'stats') => void;
  currentView: string;
}

export default function Navbar({ onNavigate, currentView }: NavbarProps) {
  const [isOpen, setIsOpen] = React.useState(false);

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
            <button 
              onClick={() => onNavigate('explore')}
              className={`text-sm font-bold transition-colors hover:text-primary ${currentView === 'explore' ? 'text-primary' : 'text-text-dim'}`}
            >
              대학·전형별 탐색
            </button>
            <button 
              onClick={() => onNavigate('stats')}
              className={`text-sm font-bold transition-colors hover:text-primary ${currentView === 'stats' ? 'text-primary' : 'text-text-dim'}`}
            >
              3개년 통계
            </button>
            <button 
              onClick={() => onNavigate('search')}
              className={`text-sm font-bold transition-colors hover:text-primary ${currentView === 'search' ? 'text-primary' : 'text-text-dim'}`}
            >
              합격 사례
            </button>
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
            <div className="px-4 py-6 flex flex-col gap-4">
              <button 
                onClick={() => { onNavigate('home'); setIsOpen(false); }}
                className="text-lg font-medium text-left px-4 py-2 rounded-lg hover:bg-white/5"
              >
                홈
              </button>
              <button 
                onClick={() => { onNavigate('search'); setIsOpen(false); }}
                className="text-lg font-medium text-left px-4 py-2 rounded-lg hover:bg-white/5"
              >
                합격사례 검색
              </button>
              <button 
                onClick={() => { onNavigate('admin'); setIsOpen(false); }}
                className="text-lg font-medium text-left px-4 py-2 rounded-lg hover:bg-white/5 flex items-center gap-2"
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
