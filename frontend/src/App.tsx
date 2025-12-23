import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import AuthPage from './pages/AuthPage';
import PublicExplorer from './pages/PublicExplorer';
import type { User } from './types';
import { fetchCurrentUser, setAuthToken } from './services/api';

import { WebSocketProvider } from './context/WebSocketContext';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isExplorer, setIsExplorer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('ams_token');
      if (token) {
        try {
          // Token is already set in api.ts on load, but we verify it by fetching user
          const user = await fetchCurrentUser();
          setCurrentUser(user);
        } catch (error) {
          console.error('Failed to restore session:', error);
          setAuthToken(null);
        }
      }
      setLoading(false);
    };

    restoreSession();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <WebSocketProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Animated Background */}
        <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

        {/* Gradient Orbs */}
        <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

        {/* Main Content */}
        <div className="relative z-10">
          <main>
            {currentUser ? (
              <Dashboard
                currentUser={currentUser}
                onLogout={() => {
                  setAuthToken(null);
                  setCurrentUser(null);
                }}
              />
            ) : isExplorer ? (
              <PublicExplorer onBack={() => setIsExplorer(false)} />
            ) : (
              <AuthPage
                onLogin={(user) => setCurrentUser(user)}
                onExplore={() => setIsExplorer(true)}
              />
            )}
          </main>
        </div>

        {/* Footer */}
        <footer className="relative z-10 mt-20 border-t border-white/5 py-8 text-center text-slate-500 text-sm">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <p>&copy; 2025 AMS Blockchain. Secured by Hyperledger Fabric.</p>
          </div>
        </footer>
      </div>
    </WebSocketProvider>
  );
}

export default App;
