import React, { useState, useEffect } from 'react';
import { updateProfile, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { User, Settings as SettingsIcon, Shield, AudioWaveform, Palette, LogOut } from 'lucide-react';
import { useTheme, THEMES } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { currentUser } = useAuth();
  const { currentTheme, setCurrentTheme } = useTheme();
  const navigate = useNavigate();

  // Profile State
  const [displayName, setDisplayName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');

  // Preferences State
  const [highQualityAudio, setHighQualityAudio] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
    }
    // Load preferences from local storage
    const savedHQ = localStorage.getItem('saregx_hq_audio');
    if (savedHQ) setHighQualityAudio(savedHQ === 'true');
  }, [currentUser]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsUpdating(true);
    setUpdateMsg('');

    try {
      await updateProfile(currentUser, { displayName });
      setUpdateMsg('Profile updated successfully!');
      // Force reload auth state subtly if needed, or just let it be.
    } catch (error) {
      console.error(error);
      setUpdateMsg('Failed to update profile.');
    }
    setIsUpdating(false);
  };

  const handleToggleHQ = () => {
    const newValue = !highQualityAudio;
    setHighQualityAudio(newValue);
    localStorage.setItem('saregx_hq_audio', newValue);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '1000px', margin: '40px auto', padding: '0 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '16px', margin: 0 }}>
          <User /> Profile & Preferences
        </h1>
        <button
          onClick={handleLogout}
          style={{
            padding: '10px 20px', borderRadius: '12px', background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d',
            fontWeight: 600, border: '1px solid rgba(255, 77, 77, 0.2)', cursor: 'pointer', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 77, 77, 0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 77, 77, 0.1)'}
        >
          <LogOut size={18} /> Log Out
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '32px'
      }}>

        {/* Content Area - Profile */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '24px', padding: '32px', display: 'flex', flexDirection: 'column'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={20} color="var(--accent-pink)" /> Account Profile
          </h2>

          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--accent-hex, var(--accent-pink))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 800, color: 'black' }}>
                {(currentUser?.displayName || currentUser?.email || '?')[0].toUpperCase()}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem' }}>{currentUser?.email}</p>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Authenticated User
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} style={{ flex: 1 }}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: '12px',
                  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent-hex, var(--accent-pink))'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                placeholder="Enter your name"
              />
            </div>

            <button
              disabled={isUpdating}
              type="submit"
              style={{
                width: '100%', padding: '12px 24px', borderRadius: '12px', background: 'white', color: 'black',
                fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'opacity 0.2s', marginBottom: '16px'
              }}
              onMouseEnter={(e) => e.target.style.opacity = '0.9'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              {isUpdating ? 'Saving...' : 'Save Profile'}
            </button>

            {updateMsg && (
              <p style={{ margin: '0', fontSize: '0.9rem', color: updateMsg.includes('success') ? '#4caf50' : '#f44336', textAlign: 'center' }}>
                {updateMsg}
              </p>
            )}
          </form>
        </div>

        {/* Content Area - Preferences */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '24px', padding: '32px'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SettingsIcon size={20} color="var(--accent-pink)" /> Global Preferences
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AudioWaveform size={20} color="var(--text-muted)" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 500 }}>High Quality Audio</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Request 256kbps audio streams when available.</p>
              </div>
            </div>

            {/* Custom Toggle Switch */}
            <button
              onClick={handleToggleHQ}
              style={{
                width: '48px', height: '24px', borderRadius: '12px', border: 'none',
                background: highQualityAudio ? 'var(--accent-hex, var(--accent-pink))' : 'rgba(255,255,255,0.1)',
                position: 'relative', cursor: 'pointer', transition: 'background 0.3s', flexShrink: 0
              }}
            >
              <div style={{
                position: 'absolute', top: '2px', left: highQualityAudio ? '26px' : '2px',
                width: '20px', height: '20px', borderRadius: '50%', background: highQualityAudio && currentTheme === 'elclasico' ? 'black' : 'white',
                transition: 'left 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </button>
          </div>

          <h3 style={{ margin: '32px 0 16px 0', fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Palette size={20} color="var(--accent-hex, var(--accent-pink))" /> Theme Engine
          </h3>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            {Object.entries(THEMES).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => setCurrentTheme(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px',
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${currentTheme === key ? theme.hex : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: '999px', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: currentTheme === key ? `0 0 16px rgba(${theme.rgb}, 0.3)` : 'none',
                  transform: currentTheme === key ? 'scale(1.05)' : 'scale(1)'
                }}
                onMouseEnter={(e) => {
                  if (currentTheme !== key) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                }}
                onMouseLeave={(e) => {
                  if (currentTheme !== key) e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                }}
              >
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: theme.hex,
                  boxShadow: `0 0 10px rgba(${theme.rgb || '255,255,255'}, 0.5)`
                }} />
                <span style={{ fontSize: '0.9rem', fontWeight: currentTheme === key ? 700 : 500, color: currentTheme === key ? 'white' : 'var(--text-muted)' }}>
                  {theme.name}
                </span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
