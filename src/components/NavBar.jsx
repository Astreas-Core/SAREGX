import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Palette, LogOut, Settings, User } from 'lucide-react';
import { useTheme, THEMES } from '../contexts/ThemeContext';
import { usePlayer } from '../contexts/PlayerContext';

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const { currentTheme, setCurrentTheme } = useTheme();
  const { likedSongs } = usePlayer();
  
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/search', label: 'Search' },
    { path: '/library', label: 'Library' }
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Close dropdowns if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setThemeDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef, profileDropdownRef]);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      <Link to="/" className="nav-logo-fixed" style={{ position: 'fixed', top: '28px', left: '32px', zIndex: 2000, display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--accent-hex, var(--accent-pink)), #ffffff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontSize: '1.6rem',
          fontWeight: 900,
          letterSpacing: '-0.04em'
        }}>Saregx</div>
      </Link>

      <nav className="nav-container">
      
      <button 
        className={`menu-toggle ${menuOpen ? 'active' : ''}`}
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
      </button>

      <div className={`nav-menu ${menuOpen ? 'active' : ''}`}>
        <ul className="nav-links">
          {navItems.map(item => (
            <li key={item.path}>
              <Link 
                to={item.path} 
                onClick={() => setMenuOpen(false)}
                className="nav-item-link"
                style={{
                  padding: '8px 20px',
                  borderRadius: '999px',
                  background: location.pathname === item.path ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: location.pathname === item.path ? 'white' : 'var(--text-muted)',
                  fontWeight: location.pathname === item.path ? 600 : 500,
                  transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
                }}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="nav-actions">
          {user ? (
            <>
              <button 
                onClick={() => navigate('/settings')}
                style={{ 
                  background: location.pathname === '/settings' ? 'var(--accent-hex, var(--accent-pink))' : 'rgba(255,255,255,0.1)', 
                  border: location.pathname === '/settings' ? '2px solid white' : '2px solid transparent',
                  color: location.pathname === '/settings' ? 'black' : 'white', 
                  cursor: 'pointer', 
                  width: '38px', height: '38px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                  boxShadow: location.pathname === '/settings' ? '0 0 16px rgba(var(--accent-rgb), 0.5)' : 'none'
                }}
                title="Profile & Preferences"
                onMouseEnter={(e) => {
                  if(location.pathname !== '/settings') {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if(location.pathname !== '/settings') {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  }
                }}
              >
                {(user.displayName || user.email)[0].toUpperCase()}
              </button>
            </>
          ) : (
            <>
              <button className="btn-pill btn-login" onClick={() => { navigate('/login'); setMenuOpen(false); }}>Login</button>
              <button className="btn-pill btn-signup" onClick={() => { navigate('/login'); setMenuOpen(false); }}>Sign Up</button>
            </>
          )}
        </div>
      </div>
      </nav>
    </>
  );
}
