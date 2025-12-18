import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0"></div>

      <div className="relative z-10">
        <Navbar />
        <main>
          <Dashboard />
        </main>
      </div>

      <footer className="relative z-10 mt-20 border-t border-white/5 py-8 text-center text-slate-500 text-sm">
        <p>&copy; 2025 AMS Blockchain. Secured by Hyperledger Fabric.</p>
      </footer>
    </div>
  );
}

export default App;
