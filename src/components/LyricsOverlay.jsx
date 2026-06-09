import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Music, Loader, Play, Pause, SkipBack, SkipForward, Heart, Plus, Minus } from 'lucide-react';
import { usePlayer } from '../contexts/PlayerContext';

export default function LyricsOverlay({ isOpen, onClose }) {
  const { currentTrack, progress, duration, isPlaying, togglePlay, likedSongs, toggleLike, playNextInQueue, seekTo } = usePlayer();
  const [lyrics, setLyrics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const [syncOffset, setSyncOffset] = useState(0); // For manual sync adjustment
  const containerRef = useRef(null);
  const lastFetchedTrackRef = useRef(null);
  
  const isLiked = currentTrack && likedSongs && likedSongs[currentTrack.id];

  const bgGradient = useMemo(() => {
    if (!currentTrack?.id) return 'linear-gradient(-45deg, rgba(20,10,40,0.95), rgba(10,30,50,0.95), rgba(40,10,20,0.95), rgba(10,40,30,0.95))';
    
    // Hash the video ID to generate stable, unique colors
    let hash = 0;
    for (let i = 0; i < currentTrack.id.length; i++) {
      hash = currentTrack.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate 4 beautifully spaced hues
    const h1 = Math.abs(hash % 360);
    const h2 = (h1 + 60) % 360;
    const h3 = (h1 + 120) % 360;
    const h4 = (h1 + 180) % 360;
    
    // Deep cinematic saturation and lightness for a beautiful dark mode mesh
    return `linear-gradient(-45deg, hsla(${h1}, 70%, 15%, 0.95), hsla(${h2}, 70%, 15%, 0.95), hsla(${h3}, 70%, 15%, 0.95), hsla(${h4}, 70%, 15%, 0.95))`;
  }, [currentTrack?.id]);

  useEffect(() => {
    if (!currentTrack) return;

    // If we already fetched lyrics for this exact track and either succeeded or failed, don't refetch
    if (lastFetchedTrackRef.current === currentTrack.id && (lyrics.length > 0 || error)) {
      return;
    }

    const fetchLyrics = async () => {
      setLoading(true);
      setError(null);
      setLyrics([]);
      setActiveLineIndex(-1);
      lastFetchedTrackRef.current = currentTrack.id;
      
      try {
        // Clean up title and artist to drastically improve lyric match rates
        const cleanTitleStr = (str) => {
          if (!str) return '';
          let cleaned = str
            .replace(/\|.*$/i, '') // Remove anything after | (e.g. | RRR | NTR...)
            .replace(/\[.*?\]/g, '') // Remove ALL square brackets (e.g. [8K], [Video Song])
            .replace(/\(.*?\)/g, '') // Remove ALL parentheses
            .replace(/full video/i, '')
            .replace(/lyrical video/i, '')
            .replace(/official video/i, '')
            .replace(/video song/i, '')
            .replace(/full song/i, '')
            .replace(/lyrical/i, '')
            .replace(/ft\..*$/i, '')
            .replace(/feat\..*$/i, '')
            .replace(/^[:\-\s]+/, '') // Remove leading colons, hyphens, and spaces left behind
            .replace(/[:\-\s]+$/, ''); // Remove trailing colons, hyphens, and spaces
            
          // If the title contains " - ", it's usually "Artist - Title", so we extract the title part
          if (cleaned.includes(' - ')) {
            const parts = cleaned.split(' - ');
            // Return everything after the first " - "
            return parts.slice(1).join(' - ').trim();
          }
          return cleaned.trim();
        };

        const cleanArtistStr = (str) => {
          if (!str) return '';
          // Clean common YouTube channel suffixes
          return str.replace(/ - Topic$/i, '').replace(/VEVO$/i, '').trim();
        };

        const cleanTitle = cleanTitleStr(currentTrack.title);
        const cleanArtist = cleanArtistStr(currentTrack.artist);

        // 1. Exact Match Try
        const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`;
        const res = await fetch(url);
        
        if (res.ok) {
          const data = await res.json();
          if (data.syncedLyrics) return setLyrics(parseLrc(data.syncedLyrics));
          if (data.plainLyrics) return setLyrics(data.plainLyrics.split('\n').map(l => ({ time: -1, text: l })));
        }

        // 2. Search API Try (Title + Artist)
        const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitle + ' ' + cleanArtist)}`;
        const searchRes = await fetch(searchUrl);
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData && searchData.length > 0) {
            const bestMatch = searchData[0];
            if (bestMatch.syncedLyrics) return setLyrics(parseLrc(bestMatch.syncedLyrics));
            if (bestMatch.plainLyrics) return setLyrics(bestMatch.plainLyrics.split('\n').map(l => ({ time: -1, text: l })));
          }
        }

        // 3. EXTREME FALLBACK: Search JUST by the cleaned title.
        // Crucial for Indian music because YouTube lists the Record Label (T-Series) as the artist!
        const ultraCleanTitle = cleanTitleStr(currentTrack.title).replace(/video song/i, '').trim();
        if (ultraCleanTitle) {
          const fallbackUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(ultraCleanTitle)}`;
          const fallbackRes = await fetch(fallbackUrl);
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            if (fallbackData && fallbackData.length > 0) {
              const bestMatch = fallbackData[0];
              if (bestMatch.syncedLyrics) return setLyrics(parseLrc(bestMatch.syncedLyrics));
              if (bestMatch.plainLyrics) return setLyrics(bestMatch.plainLyrics.split('\n').map(l => ({ time: -1, text: l })));
            }
          }
        }

        throw new Error('Lyrics not found in global database');
      } catch (err) {
        setError("Looks like this specific track (or remix) doesn't have lyrics in the global database yet!");
      } finally {
        setLoading(false);
      }
    };

    fetchLyrics();
  }, [currentTrack]);

  // Sync lyrics with progress
  useEffect(() => {
    if (!lyrics.length || lyrics[0].time === -1 || duration === 0) return;
    
    const currentTime = (progress / 100) * duration + syncOffset;
    
    // Find the current active line
    let newIndex = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time) {
        newIndex = i;
      } else {
        break;
      }
    }

    if (newIndex !== activeLineIndex) {
      setActiveLineIndex(newIndex);
    }
  }, [progress, duration, lyrics, activeLineIndex, syncOffset]);

  // Effect to handle scrolling AFTER the activeLineIndex has rendered
  useEffect(() => {
    if (activeLineIndex !== -1 && containerRef.current) {
      // Find by ID to be absolutely sure we have the newly rendered active line
      const activeEl = document.getElementById(`lyric-${activeLineIndex}`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeLineIndex]);

  // Simple LRC parser
  const parseLrc = (lrcString) => {
    const lines = lrcString.split('\n');
    const result = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    
    lines.forEach(line => {
      const match = timeRegex.exec(line);
      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        const ms = parseInt(match[3]);
        const timeInSeconds = (minutes * 60) + seconds + (ms / 1000);
        const text = line.replace(timeRegex, '').trim();
        
        if (text) {
          result.push({ time: timeInSeconds, text });
        }
      }
    });
    
    return result;
  };

  // Format duration helper
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return createPortal(
    <div className={`lyrics-overlay ${isOpen ? 'open' : ''}`} style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: bgGradient,
      backgroundSize: '400% 400%',
      animation: 'gradientBG 15s ease infinite',
      backdropFilter: 'blur(30px)',
      WebkitBackdropFilter: 'blur(30px)',
      zIndex: 1000,
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      opacity: isOpen ? 1 : 0,
      transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20vh) scale(0.7)',
      transformOrigin: 'calc(50% + 350px) calc(100% - 40px)', // Exactly where the mic button is
      pointerEvents: isOpen ? 'auto' : 'none',
      transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
    }}>
      {/* Removed Edge Visualizers */}

      {/* Header with Sync Offset Controls */}
      <div style={{ padding: '24px 40px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', zIndex: 10 }}>
        {lyrics.length > 0 && !error && (
          lyrics[0]?.time !== -1 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(0,0,0,0.3)', padding: '8px 16px', borderRadius: '24px', backdropFilter: 'blur(10px)' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white' }}>
                Sync Offset: {syncOffset > 0 ? '+' : ''}{syncOffset.toFixed(1)}s
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setSyncOffset(prev => prev - 0.5)} 
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                >
                  <Minus size={14} />
                </button>
                <button 
                  onClick={() => setSyncOffset(prev => prev + 0.5)} 
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '8px 16px', borderRadius: '24px', backdropFilter: 'blur(10px)' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Unsynced Lyrics
              </span>
            </div>
          )
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', justifyContent: 'center' }}>
        
        {/* Centered Lyrics */}
        <div ref={containerRef} style={{ width: '100%', maxWidth: '1000px', overflowY: 'auto', padding: '100px 40px 200px 40px', scrollBehavior: 'smooth', msOverflowStyle: 'none', scrollbarWidth: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
              <Loader className="spin" size={48} style={{ marginBottom: '16px' }} />
              <p>Finding lyrics...</p>
            </div>
          ) : error ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <Music size={32} color="rgba(255,255,255,0.5)" />
              </div>
              <h3 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '16px' }}>Instrumental or Unknown</h3>
              <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>{error}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', alignItems: 'center', width: '100%' }}>
              {lyrics.map((line, index) => {
                const isActive = index === activeLineIndex;
                const isPast = index < activeLineIndex;
                const isPlain = line.time === -1;
                return (
                  <p 
                    id={`lyric-${index}`}
                    key={index}
                    onClick={() => {
                      if (line.time !== -1 && duration > 0) {
                        seekTo((line.time / duration) * 100);
                      }
                    }}
                    className={isActive ? 'lyric-line-active' : ''}
                    style={{ 
                      fontSize: '2.5rem', 
                      fontWeight: isActive ? 800 : 600,
                      color: isActive ? '#ffffff' : (isPlain ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)'),
                      margin: 0,
                      textAlign: 'center',
                      transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                      lineHeight: 1.4,
                      filter: !isActive && !isPlain ? (isPast ? 'blur(1.5px)' : 'none') : 'none',
                      transform: isActive ? 'scale(1.15)' : 'scale(1)',
                      transformOrigin: 'center center',
                      textShadow: isActive ? '0 0 40px rgba(255,255,255,0.4)' : 'none',
                      opacity: isActive ? 1 : (isPast ? 0.4 : 0.6),
                      cursor: isPlain ? 'default' : 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      if (!isPlain) e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      if (!isPlain && !isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                    }}
                  >
                    {line.text}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes gradientBG {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>,
    document.body
  );
}
