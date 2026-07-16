import React from 'react';
import Navbar from './components/Navbar';
import Home from './components/Home';
import SearchPage from './components/SearchPage';
import ExplorePage from './components/ExplorePage';
import AdminDashboard from './components/AdminDashboard';
import StatsPage from './components/StatsPage';
import StatsGraphPage from './components/StatsGraphPage';
import { motion, AnimatePresence } from 'motion/react';
import { getStats } from './constants';
import { fetchAllAdmissionCases } from './lib/admissionService';
import { AdmissionCase } from './types';

export default function App() {
  const [currentView, setCurrentView] = React.useState<'home' | 'search' | 'admin' | 'explore' | 'stats' | 'stats-graph'>('home');
  const [selectedUniForExplore, setSelectedUniForExplore] = React.useState<string | undefined>(undefined);
  const [admissionCases, setAdmissionCases] = React.useState<AdmissionCase[]>([]);

  React.useEffect(() => {
    fetchAllAdmissionCases().then(setAdmissionCases).catch(console.error);
  }, []);

  const stats = getStats(admissionCases);

  const handleUniAction = (uni?: string) => {
    setSelectedUniForExplore(uni);
    setCurrentView('explore');
  };

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return (
          <Home 
            onSearch={() => setCurrentView('search')} 
            onExplore={() => handleUniAction()} 
            onStats={() => setCurrentView('stats')}
            onUniClick={handleUniAction}
            stats={stats} 
            admissionCases={admissionCases} 
          />
        );
      case 'search':
        return <SearchPage />;
      case 'explore':
        return <ExplorePage initialUniversity={selectedUniForExplore} />;
      case 'stats':
        return <StatsPage />;
      case 'stats-graph':
        return <StatsGraphPage />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <Home onSearch={() => setCurrentView('search')} onExplore={() => handleUniAction()} onStats={() => setCurrentView('stats')} onUniClick={handleUniAction} stats={stats} admissionCases={admissionCases} />;
    }
  };

  return (
    <div className="min-h-screen bg-bg relative overflow-x-hidden">
      <div className="bg-glow" />
      <Navbar currentView={currentView} onNavigate={setCurrentView} />
      
      <main>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <span className="text-[10px] font-bold">D</span>
              </div>
              <span className="text-lg font-bold">DreamUni</span>
            </div>
            
            <div className="flex gap-8 text-sm text-zinc-500">
              <a href="#" className="hover:text-white transition-colors">이용약관</a>
              <a href="#" className="hover:text-white transition-colors">개인정보처리방침</a>
              <a href="#" className="hover:text-white transition-colors">고객센터</a>
            </div>

            <div className="text-sm text-zinc-500">
              © 2026 Dream University Navigator. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
