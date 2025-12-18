import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import AuthPage from './pages/AuthPage';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0"></div>

      <div className="relative z-10">
        <main>
          {isAuthenticated ? (
            <Dashboard />
          ) : (
            // Pass a callback to simulate login success (in real app, use Context/Redux)
            // We are hacking the internal state of AuthPage via a prop doesn't work well without changing AuthPage signature.
            // Let's just wrap it or assume user logs in.
            // Actually, AuthPage doesn't accept props yet. Let's just modify the view based on a simple "Continue" for now, 
            // OR better: modify AuthPage to accept onLoginSuccess callback. 
            // For simplicity in this demo step: creating a wrapper here is overkill.
            // Let's just SHOW AuthPage.             // To make it functional, I should update AuthPage.tsx to accept props.
            <div className="relative">
              {/* Temporary overlay to simulate navigation hack for the demo */}
              <AuthPage onLogin={() => setIsAuthenticated(true)} />
            </div>
          )}
        </main>
      </div>

      <footer className="relative z-10 mt-20 border-t border-white/5 py-8 text-center text-slate-500 text-sm">
        <p>&copy; 2025 AMS Blockchain. Secured by Hyperledger Fabric.</p>
      </footer>
    </div>
  );
}

export default App;
