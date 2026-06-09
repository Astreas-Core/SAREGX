import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Heart } from 'lucide-react';
import { usePlayer } from '../contexts/PlayerContext';
import { useTheme } from '../contexts/ThemeContext';
import { getAverageColor } from '../utils/colorUtils';

export default function BottomPlayer() {
  const { 
    currentTrack, 
    isPlaying, 
    togglePlay, 
    progress, 
    duration,
    seekTo,
    volume,
    setVolume,
    likedSongs,
    toggleLike
  } = usePlayer();
  const { themeObj, currentTheme, setDynamicColor } = useTheme();

  useEffect(() => {
    if (currentTheme === 'dynamic' && currentTrack?.thumbnail) {
      getAverageColor(currentTrack.thumbnail)
        .then(color => setDynamicColor(color))
        .catch(err => console.error('Failed to extract dynamic color:', err));
    }
  }, [currentTheme, currentTrack?.thumbnail, setDynamicColor]);

  const isLiked = currentTrack && likedSongs[currentTrack.id];

  // Local state for smooth dragging without stuttering the audio engine
  const [localProgress, setLocalProgress] = useState(null);
  
  // Local state for hover effects
  const [isHoveringCover, setIsHoveringCover] = useState(false);
  const [isHoveringWaveform, setIsHoveringWaveform] = useState(false);

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeekChange = (e) => {
    setLocalProgress(Number(e.target.value));
  };

  const handleSeekCommit = (e) => {
    const val = Number(e.target.value);
    seekTo(val);
    setLocalProgress(null);
  };

  const handleVolumeChange = (e) => {
    setVolume(Number(e.target.value));
  };

  // Determine which progress value to display
  const displayProgress = localProgress !== null ? localProgress : progress;

  // Generate a consistent pseudo-random waveform based on the track ID
  const generateWaveform = (seed) => {
    if (!seed) return Array(100).fill(20);
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const random = (s) => {
      const x = Math.sin(s) * 10000;
      return x - Math.floor(x);
    };
    
    const waveform = [];
    let currentSeed = hash;
    for (let i = 0; i < 100; i++) {
      const val = random(currentSeed++) * 80 + 20;
      waveform.push(val);
    }
    for (let i = 1; i < 99; i++) {
      waveform[i] = (waveform[i-1] + waveform[i] + waveform[i+1]) / 3;
    }
    return waveform;
  };

  const waveform = generateWaveform(currentTrack?.id);

  // If nothing is playing, hide the player completely for a clean UI
  if (!currentTrack) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 48px)',
      maxWidth: '1000px',
      height: '96px',
      background: 'rgba(18, 18, 26, 0.75)',
      backdropFilter: 'blur(32px)',
      WebkitBackdropFilter: 'blur(32px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.1)',
      zIndex: 9999,
      animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)' // Sleek entrance animation
    }}>
      
      {/* Track Info */}
      <div className="player-track-info" style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '30%', minWidth: '220px' }}>
        {/* Animated Album Cover */}
        <div 
          onMouseEnter={() => setIsHoveringCover(true)}
          onMouseLeave={() => setIsHoveringCover(false)}
          style={{ 
            width: '56px', height: '56px', 
            background: '#1e1e2c', 
            borderRadius: isPlaying && !isHoveringCover ? '50%' : '12px', 
            overflow: 'hidden',
            position: 'relative',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transform: isHoveringCover ? 'scale(1.15) translateY(-8px)' : 'scale(1)',
            boxShadow: isHoveringCover ? '0 12px 24px rgba(0,0,0,0.6)' : 'none',
            animation: isPlaying && !isHoveringCover ? 'spin 12s linear infinite' : 'none'
          }}
        >
          {(currentTrack?.thumb || currentTrack?.albumArtUrl) && (
            <img src={currentTrack.thumb || currentTrack.albumArtUrl} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
          {isPlaying && !isHoveringCover && (
            <div style={{ position: 'absolute', inset: '22px', background: 'rgba(10,10,15,0.8)', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)' }}></div>
          )}
        </div>
        
        {/* Animated Marquee for Long Titles */}
        <div style={{ overflow: 'hidden', flex: 1, maskImage: 'linear-gradient(90deg, black 85%, transparent 100%)' }}>
          <div style={{ 
            fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', 
            display: 'inline-block',
            animation: currentTrack.title.length > 25 ? 'marquee 15s linear infinite' : 'none'
          }}>
            {currentTrack.title}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {currentTrack.artist}
          </div>
        </div>

        {/* Bouncy Like Button */}
        <button 
          onClick={() => toggleLike(currentTrack)}
          style={{ 
            background: 'none', border: 'none', 
            color: isLiked ? 'var(--accent-pink)' : 'var(--text-muted)', 
            cursor: 'pointer', display: 'flex', alignItems: 'center', 
            transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)' 
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.7)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Heart size={20} fill={isLiked ? "currentColor" : "none"} style={{ filter: isLiked ? 'drop-shadow(0 0 8px rgba(var(--accent-rgb), 0.6))' : 'none' }} />
        </button>
      </div>

      {/* Controls & Waveform */}
      <div className="player-controls" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '45%' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <button 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'transform 0.1s' }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.8)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <SkipBack size={22} fill="currentColor" />
          </button>
          
          <button 
            onClick={togglePlay}
            style={{ 
              width: '42px', height: '42px', 
              borderRadius: '50%', 
              background: 'white', 
              color: 'black',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              boxShadow: '0 4px 12px rgba(255,255,255,0.2)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />}
          </button>

          <button 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'transform 0.1s' }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.8)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <SkipForward size={22} fill="currentColor" />
          </button>
        </div>

        {/* Apple Music Style Wavy Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', maxWidth: '500px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', minWidth: '35px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {formatDuration((displayProgress / 100) * duration)}
          </span>
          
          <div 
            onMouseEnter={() => setIsHoveringWaveform(true)}
            onMouseLeave={() => setIsHoveringWaveform(false)}
            style={{ 
              flex: 1, 
              height: '16px', 
              cursor: 'pointer', 
              position: 'relative', 
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {/* Background Track (Straight Line - Unplayed portion only) */}
            <div style={{
              position: 'absolute',
              left: `${displayProgress}%`,
              right: 0,
              height: '3px',
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '2px',
              transition: localProgress !== null ? 'none' : 'left 0.2s linear'
            }}></div>

            {/* Active Track (Rippling Sine Wave) */}
            <div 
              className={isPlaying && localProgress === null ? 'active-wave-progress' : 'idle-wave-progress'}
              style={{
                position: 'absolute',
                left: 0,
                width: `${displayProgress}%`,
                height: '12px',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='12' viewBox='0 0 32 12'%3E%3Cpath d='M 0 6 Q 8 1.5, 16 6 T 32 6' fill='none' stroke='${encodeURIComponent(themeObj.hex)}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat-x',
                backgroundPosition: 'left center',
                transition: localProgress !== null ? 'none' : 'width 0.2s linear',
                filter: 'drop-shadow(0 0 8px rgba(var(--accent-rgb), 0.8)) drop-shadow(0 0 3px rgba(var(--accent-rgb), 0.5))'
              }}
            >
              {/* Playhead Knob */}
              <div style={{
                position: 'absolute',
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                width: '3px',
                height: '14px',
                background: 'var(--accent-hex, var(--accent-pink))',
                borderRadius: '2px',
                boxShadow: '0 0 4px rgba(0,0,0,0.5)'
              }}></div>
            </div>
            
            <input 
              type="range" 
              min="0" max="100" step="0.1"
              value={displayProgress}
              onChange={handleSeekChange}
              onMouseUp={handleSeekCommit}
              onTouchEnd={handleSeekCommit}
              style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', margin: 0, zIndex: 10 }}
            />
          </div>

          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', minWidth: '35px', fontVariantNumeric: 'tabular-nums' }}>
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* Volume */}
      <div className="player-volume" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '14px', width: '25%' }}>
        <Volume2 size={18} color="var(--text-muted)" />
        <div style={{ 
          width: '90px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', cursor: 'pointer', position: 'relative' 
        }}>
          <div style={{ width: `${volume}%`, height: '100%', background: 'white', borderRadius: '2px', boxShadow: '0 0 8px rgba(255,255,255,0.3)' }}></div>
          <input 
            type="range" min="0" max="100" step="1"
            value={volume} onChange={handleVolumeChange}
            style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', margin: 0 }}
          />
        </div>
      </div>

      <style>{`
        @keyframes waveRipple {
          from { background-position: 0 center; }
          to { background-position: -32px center; }
        }
        .active-wave-progress {
          animation: waveRipple 1s linear infinite;
        }
        .idle-wave-progress {
          animation: none;
        }
      `}</style>
    </div>
  );
}
