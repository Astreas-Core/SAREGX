import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Play } from 'lucide-react';
import { usePlayer } from '../contexts/PlayerContext';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Search() {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const { playTrack } = usePlayer();
  const lastSearchedRef = React.useRef('');

  const executeSearch = async (searchQuery, saveToHistory = false) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    
    // Skip if we already searched this exact query
    if (searchQuery.trim() === lastSearchedRef.current && !saveToHistory) return;
    lastSearchedRef.current = searchQuery.trim();

    setLoading(true);
    let success = false;

    try {
      const musicQuery = searchQuery.toLowerCase().includes('song') || searchQuery.toLowerCase().includes('music') 
        ? searchQuery 
        : `${searchQuery} song`;
        
      const response = await fetch(`/api/search?q=${encodeURIComponent(musicQuery)}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setResults(data);
          success = true;
          
          if (saveToHistory && auth.currentUser) {
            try {
              await addDoc(collection(db, 'users', auth.currentUser.uid, 'searches'), {
                query: searchQuery.trim(),
                searchedAt: serverTimestamp()
              });
            } catch(e) {
              console.error("Error saving search", e);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Search failed:`, error);
    }

    if (!success) {
      // Don't alert on live search, it's too annoying
      if (saveToHistory) alert("Search failed. Please try again in a few minutes!");
    }
    
    setLoading(false);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q) {
      setQuery(q);
      executeSearch(q, true); // save pill clicks to history
      navigate('/search', { replace: true });
    }
  }, [location.search]);

  // Debounced live search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      executeSearch(query, false);
    }, 400); // 400ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSearch = async (e) => {
    e.preventDefault();
    executeSearch(query, true); // Manual submit saves to history
  };

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return 'Unknown length';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div style={{ width: '100%', padding: '40px 4vw', margin: '0 auto' }}>
      <h2 style={{ fontSize: '2.5rem', marginBottom: '32px', fontWeight: 600, letterSpacing: '-0.02em' }}>Search Music</h2>
      
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '16px', marginBottom: '56px', maxWidth: '800px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <SearchIcon size={24} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search for songs, artists, or albums..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ 
              width: '100%',
              padding: '20px 20px 20px 56px', 
              borderRadius: '16px', 
              border: '1px solid rgba(255,255,255,0.08)', 
              background: 'rgba(255,255,255,0.03)', 
              color: 'white',
              fontSize: '1.1rem',
              outline: 'none',
              transition: 'background 0.2s, border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
            }}
          />
        </div>
        <button 
          type="submit" 
          className={loading ? "" : "btn-cta"}
          disabled={loading}
          style={loading ? {
            background: 'transparent',
            border: 'none',
            color: 'var(--accent-pink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '140px',
            cursor: 'default'
          } : { 
            borderRadius: '16px', 
            padding: '0 40px', 
            fontSize: '1.1rem', 
            minWidth: '140px', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center' 
          }}
        >
          {loading ? (
            <SearchIcon size={36} className="search-pulse" />
          ) : 'Search'}
        </button>
      </form>

      {/* Grid Layout for premium visual experience */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
        gap: '24px' 
      }}>
        {results.map((video) => (
          <div 
            key={video.videoId} 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              padding: '16px', 
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
              transition: 'transform 0.2s, background 0.2s, box-shadow 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            onClick={() => playTrack({
              id: video.videoId,
              title: video.title,
              artist: video.author,
              thumb: video.videoThumbnails?.[0]?.url || ''
            })}
          >
            {/* Large Cover Image */}
            <div style={{ 
              position: 'relative', 
              width: '100%', 
              aspectRatio: '16/9', 
              borderRadius: '12px', 
              overflow: 'hidden', 
              background: '#111',
              marginBottom: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
              <img 
                src={video.videoThumbnails?.[0]?.url} 
                alt={video.title} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ 
                position: 'absolute', inset: 0, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                background: 'rgba(0,0,0,0.5)', opacity: 0, transition: 'opacity 0.2s',
                backdropFilter: 'blur(2px)'
              }} className="play-overlay">
                <div style={{ 
                  width: '64px', height: '64px', 
                  borderRadius: '50%', 
                  background: 'var(--accent-hex, var(--accent-pink))', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(var(--accent-rgb), 0.4)'
                }}>
                  <Play fill="white" size={24} style={{ marginLeft: '3px' }} />
                </div>
              </div>
            </div>
            
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.3' }}>
                {video.title}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{video.author}</p>
            </div>
            
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'currentColor' }}></div>
              {formatDuration(video.lengthSeconds)}
            </div>
          </div>
        ))}
      </div>
      
      <style>{`
        .track-card:hover {
          background: rgba(255,255,255,0.06) !important;
          transform: translateY(-8px);
          box-shadow: 0 24px 48px rgba(0,0,0,0.4);
          border-color: rgba(255,255,255,0.1) !important;
        }
        .track-card:hover .play-overlay {
          opacity: 1 !important;
        }

        .search-pulse {
          animation: searchPulse 1.2s infinite cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes searchPulse {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.7; }
          50% { transform: scale(1.15) rotate(15deg); opacity: 1; filter: drop-shadow(0 0 12px var(--accent-pink)); }
        }
      `}</style>
    </div>
  );
}
