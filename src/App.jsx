import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/NavBar';
import BottomPlayer from './components/BottomPlayer';
import YouTubePlayer from './components/YouTubePlayer';
import Home from './pages/Home';
import Login from './pages/Login';
import Search from './pages/Search';
import Library from './pages/Library';
import Settings from './pages/Settings';
import { PlayerProvider } from './contexts/PlayerContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './index.css';

// A wrapper for routes that require authentication
function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    // Redirect unauthenticated users to login page
    return <Navigate to="/login" replace />;
  }

  return children;
}

function NetworkNotifier() {
  const [isSlow, setIsSlow] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // If the network state fully recovers, reset the dismissed flag so it can appear again later if needed
    if (!isOffline && !isSlow) {
      setDismissed(false);
    }
  }, [isOffline, isSlow]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    const checkNetwork = () => {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn) {
        if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g' || conn.effectiveType === '3g') {
          setIsSlow(true);
        } else {
          setIsSlow(false);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (navigator.connection) {
      navigator.connection.addEventListener('change', checkNetwork);
      checkNetwork();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (navigator.connection) {
        navigator.connection.removeEventListener('change', checkNetwork);
      }
    };
  }, []);

  if ((!isSlow && !isOffline) || dismissed) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '100px',
      right: '-12px',
      background: isOffline ? 'rgba(255, 75, 75, 0.9)' : 'rgba(255, 152, 0, 0.9)',
      backdropFilter: 'blur(12px)',
      color: 'white',
      padding: '12px 24px 12px 16px',
      borderRadius: '16px 0 0 16px',
      fontWeight: 600,
      fontSize: '0.85rem',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      zIndex: 9999,
      boxShadow: '-8px 8px 24px rgba(0,0,0,0.3), inset 1px 1px 0 rgba(255,255,255,0.1)',
      animation: 'slideInRight 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {isOffline ? (
          <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.58 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
        ) : (
          <>
            <path d="M12 20h.01M8.5 16.429a5 5 0 017 0M5 12.55a10 10 0 0114 0M1.42 9a16 16 0 0121.16 0" />
            <path d="M12 20h.01" strokeWidth="3" />
          </>
        )}
      </svg>
      <span>{isOffline ? 'Offline Mode' : 'Slow Network'}</span>
      
      <button 
        onClick={() => setDismissed(true)}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', marginLeft: '4px', transition: 'color 0.2s' }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
      >
        <X size={16} />
      </button>
      
      <style>{`
        @keyframes slideInRight {
          0% { transform: translateX(100%); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function AppContent() {
  const { currentUser } = useAuth();

  return (
    <>
      {/* Only show NavBar if logged in */}
      {currentUser && <NavBar />}
      
      <NetworkNotifier />
      
      <main style={{ paddingBottom: currentUser ? '100px' : '0', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', justifyContent: currentUser ? 'flex-start' : 'center' }}>
        <Routes>
          <Route path="/login" element={
            currentUser ? <Navigate to="/" replace /> : <Login />
          } />
          
          <Route path="/" element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          } />
          
          <Route path="/search" element={
            <PrivateRoute>
              <Search />
            </PrivateRoute>
          } />

          <Route path="/library" element={
            <PrivateRoute>
              <Library />
            </PrivateRoute>
          } />

          <Route path="/settings" element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          } />
        </Routes>
      </main>

      {/* Only render music player systems if logged in */}
      {currentUser && (
        <>
          <YouTubePlayer />
          <BottomPlayer />
        </>
      )}
    </>
  );
}

import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <PlayerProvider>
          <Router>
            <AppContent />
          </Router>
        </PlayerProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
