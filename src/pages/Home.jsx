import React, { useState, useEffect, useRef } from 'react';
import { Play, Heart, Sparkles, Search as SearchIcon, Zap, Music } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { searchYouTubeMultiple } from '../utils/youtubeSearch';

let cachedRecommendations = [];
let cachedMood = 'All';
let hasLoadedRecommendations = false;

export default function Home() {
  const { currentUser } = useAuth();
  const { playTrack, toggleLike, likedSongs, isPlaying, currentTrack } = usePlayer();
  const { currentTheme } = useTheme();
  const navigate = useNavigate();

  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Music Lover';

  const [recentTracks, setRecentTracks] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [recommendations, setRecommendations] = useState(cachedRecommendations);
  const [loadingRecommendations, setLoadingRecommendations] = useState(!hasLoadedRecommendations);
  const [selectedMood, setSelectedMood] = useState(cachedMood);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const barsRef = useRef([]);
  const animationRef = useRef(null);
  
  const moods = ['All', 'Chill', 'Focus', 'Workout', 'Late Night'];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 22) return 'Good evening';
    return 'Good night';
  };

  useEffect(() => {
    if (!currentUser) return;

    // Listen to Play History
    const historyQ = query(collection(db, 'users', currentUser.uid, 'history'), orderBy('playedAt', 'desc'), limit(50));
    const unsubscribeHistory = onSnapshot(historyQ, (snapshot) => {
      const tracks = [];
      const seenIds = new Set();
      snapshot.forEach(doc => {
        const data = doc.data();
        if (!seenIds.has(data.id)) {
          seenIds.add(data.id);
          tracks.push(data);
        }
      });
      setRecentTracks(tracks);
    });

    // Listen to Search History
    const searchesQ = query(collection(db, 'users', currentUser.uid, 'searches'), orderBy('searchedAt', 'desc'), limit(20));
    const unsubscribeSearches = onSnapshot(searchesQ, (snapshot) => {
      const searches = [];
      const seenQueries = new Set();
      snapshot.forEach(doc => {
        const data = doc.data();
        const q = data.query.toLowerCase();
        if (!seenQueries.has(q)) {
          seenQueries.add(q);
          searches.push(data.query);
        }
      });
      setRecentSearches(searches);
      setLoading(false);
    });

    return () => {
      unsubscribeHistory();
      unsubscribeSearches();
    };
  }, [currentUser]);

  // --- Recommendation Engine ---
  useEffect(() => {
    if (loading) return;

    // Fast-path: Skip fetching if we already have valid cached recommendations
    // unless the user explicitly changed the mood or clicked the Refresh button
    if (hasLoadedRecommendations && selectedMood === cachedMood && refreshTrigger === 0) {
      setRecommendations(cachedRecommendations);
      setLoadingRecommendations(false);
      return;
    }

    if (recentTracks.length === 0 && Object.keys(likedSongs || {}).length === 0 && selectedMood === 'All') {
      setLoadingRecommendations(false);
      return;
    }

    let mounted = true;
    
    const fetchRecommendations = async () => {
      setLoadingRecommendations(true);
      try {
        let uniqueRecs = [];
        const seenRecIds = new Set();
        const historyIds = new Set(recentTracks.map(t => t.id));

        if (selectedMood !== 'All') {
          // Fetch via search based on mood
          const query = `${selectedMood} music playlist 2024`.trim();
          let success = false;
          
          try {
            const data = await searchYouTubeMultiple(query);
            if (data && data.length > 0) {
                for (const rec of data) {
                  if (!historyIds.has(rec.videoId) && !seenRecIds.has(rec.videoId)) {
                    // Music Filter Heuristic
                    const t = rec.title.toLowerCase();
                    const a = rec.author.toLowerCase();
                    const isBad = t.includes('vlog') || t.includes('podcast') || t.includes('interview') || t.includes('reaction') || t.includes('review') || t.includes('investigat') || t.includes('show') || t.includes('comedy') || t.includes('funny') || t.includes('prank') || t.includes('stand up') || t.includes('unboxing') || t.includes('tutorial') || t.includes('how to') || a.includes('comedy') || a.includes('vlog') || a.includes('mrwhosetheboss') || a.includes('tanmay');
                    
                    if (!isBad) {
                      seenRecIds.add(rec.videoId);
                      uniqueRecs.push({
                        id: rec.videoId,
                        title: rec.title,
                        artist: rec.author,
                        thumb: rec.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${rec.videoId}/mqdefault.jpg`
                      });
                    }
                  }
                }
                success = true;
              }
            }
          } catch(e) {
            console.warn("Recommendation search failed", e);
          }
        } else {
          // 1. Shuffled Liked & History Seeds
          const likedTracks = Object.values(likedSongs || {});
          const historyTracks = [...recentTracks];
          const allPotentialSeedTracks = [];
          const seenSeedIds = new Set();
          for (const t of [...likedTracks, ...historyTracks]) {
            if (!seenSeedIds.has(t.id)) {
              seenSeedIds.add(t.id);
              allPotentialSeedTracks.push(t);
            }
          }
          const shuffledSeedTracks = allPotentialSeedTracks.sort(() => 0.5 - Math.random());
          const seeds = shuffledSeedTracks.slice(0, 2);

          // 2. Shuffled Search Queries
          const shuffledSearches = [...recentSearches].sort(() => 0.5 - Math.random());
          const searchSeeds = shuffledSearches.slice(0, 1);
          
          let allRecs = [];
          
          // Fetch related videos for the random track seeds via yt-dlp search
          for (const seedTrack of seeds) {
            try {
              const q = `${seedTrack.title} ${seedTrack.artist} similar music playlist`;
              const data = await searchYouTubeMultiple(q);
              if (data && data.length > 0) {
                allRecs = [...allRecs, ...data.slice(0, 6)]; // Take top 6
              }
            } catch(e) {}
          }

          // Fetch search results for the random search seeds via yt-dlp search
          for (const queryStr of searchSeeds) {
            const musicQuery = `${queryStr} song audio`; // bias towards music
            try {
              const data = await searchYouTubeMultiple(musicQuery);
              if (data && data.length > 0) {
                allRecs = [...allRecs, ...data.slice(0, 6)]; // Take top 6 from search
              }
            } catch(e) {}
          }
          
          for (const rec of allRecs) {
            if (!historyIds.has(rec.videoId) && !seenRecIds.has(rec.videoId)) {
              // Music Filter Heuristic
              const t = rec.title.toLowerCase();
              const a = rec.author.toLowerCase();
              const isBad = t.includes('vlog') || t.includes('podcast') || t.includes('interview') || t.includes('reaction') || t.includes('review') || t.includes('investigat') || t.includes('show') || t.includes('comedy') || t.includes('funny') || t.includes('prank') || t.includes('stand up') || t.includes('unboxing') || t.includes('tutorial') || t.includes('how to') || a.includes('comedy') || a.includes('vlog') || a.includes('mrwhosetheboss') || a.includes('tanmay');
              
              if (!isBad) {
                seenRecIds.add(rec.videoId);
                uniqueRecs.push({
                  id: rec.videoId,
                  title: rec.title,
                  artist: rec.author,
                  thumb: rec.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${rec.videoId}/mqdefault.jpg`
                });
              }
            }
          }
        }
        
        const shuffled = uniqueRecs.sort(() => 0.5 - Math.random());
        const finalRecs = shuffled.slice(0, 12);
        
        if (mounted) {
          // Update global cache so they persist across unmounts
          cachedRecommendations = finalRecs;
          cachedMood = selectedMood;
          hasLoadedRecommendations = true;
          
          setRecommendations(finalRecs);
          setLoadingRecommendations(false);
        }
      } catch (err) {
        if (mounted) setLoadingRecommendations(false);
      }
    };
    
    fetchRecommendations();
    return () => { mounted = false; };
  }, [loading, selectedMood, refreshTrigger]);

  // --- Pseudo-Random Beat Reactive Visualizer ---
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      // Reset bars to idle state smoothly
      barsRef.current.forEach(bar => {
        if (bar) bar.style.height = '10%';
      });
      return;
    }

    let targets = Array(15).fill(10);
    let currents = Array(15).fill(10);
    let lastUpdate = 0;

    const animate = (time) => {
      // Every 120ms, pick new target heights to simulate beat hits
      if (time - lastUpdate > 120) {
        for (let i = 0; i < 15; i++) {
          // Bass bars (edges) jump higher, treble (middle) jumps less
          const distFromCenter = Math.abs((15 / 2) - i);
          const isBass = distFromCenter > 4;
          
          const baseHeight = isBass ? 30 : 15;
          const randomSpike = Math.random() * (isBass ? 70 : 50);
          
          targets[i] = baseHeight + randomSpike;
          if (targets[i] > 100) targets[i] = 100;
        }
        lastUpdate = time;
      }

      // Smoothly interpolate (lerp) current heights toward target heights
      for (let i = 0; i < 15; i++) {
        currents[i] += (targets[i] - currents[i]) * 0.25; 
        const bar = barsRef.current[i];
        if (bar) {
          bar.style.height = `${currents[i]}%`;
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying]);

  if (loading) {
    return <div style={{ padding: '40px 4vw', color: 'var(--text-muted)' }}>Loading your dashboard...</div>;
  }

  return (
    <div style={{ width: '100%', padding: '40px 4vw', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Vibe Hero Section */}
      <div 
        className="vibe-hero"
        style={{
          height: 'auto',
          minHeight: '200px',
          borderRadius: '24px',
          padding: '40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 24px 48px rgba(var(--accent-rgb), 0.15)',
          background: isPlaying ? 'linear-gradient(135deg, rgba(var(--accent-rgb),0.3) 0%, rgba(45,34,82,0.6) 100%)' : 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
          border: '1px solid rgba(255,255,255,0.05)',
          transition: 'background 1s ease'
        }}
      >
        {/* Animated Background Mesh */}
        <div className="mesh-bg" style={{ position: 'absolute', inset: -50, zIndex: 0, opacity: isPlaying ? 0.8 : 0.2 }}></div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: 'clamp(1.6rem, 5vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            {getGreeting()}, <span style={{ color: isPlaying ? '#fff' : 'var(--accent-pink)' }}>{userName}</span>
          </h1>
          <p style={{ fontSize: 'clamp(0.85rem, 2vw, 1.2rem)', color: 'rgba(255,255,255,0.7)', marginTop: '8px', wordBreak: 'break-word' }}>
            {isPlaying ? `Currently vibe-ing to ${currentTrack?.title}` : 'Ready to start your session?'}
          </p>
        </div>

        {/* Audio Visualizer */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-end', gap: '6px', height: '60px', opacity: isPlaying ? 1 : 0, transition: 'opacity 0.4s ease' }}>
          {[...Array(15)].map((_, i) => (
            <div 
              key={i} 
              ref={el => barsRef.current[i] = el}
              style={{
                width: '8px',
                background: isPlaying ? 'var(--accent-pink)' : 'rgba(255,255,255,0.1)',
                borderRadius: '4px',
                height: '10%',
                transition: isPlaying ? 'none' : 'height 0.5s ease',
                willChange: 'height'
              }}
            ></div>
          ))}
        </div>
      </div>

      {/* Mood Selector & Recommendations */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={24} color="var(--accent-pink)" />
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Recommended for You</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {/* Interactive Mood Pills */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }} className="hide-scrollbar">
              {moods.map(mood => (
                <button
                  key={mood}
                  onClick={() => setSelectedMood(mood)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '999px',
                    border: 'none',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: selectedMood === mood ? 'var(--accent-pink)' : 'rgba(255,255,255,0.05)',
                    color: selectedMood === mood ? (currentTheme === 'elclasico' ? 'black' : 'white') : 'var(--text-muted)',
                    transition: 'all 0.2s',
                    boxShadow: selectedMood === mood ? '0 4px 16px rgba(var(--accent-rgb), 0.4)' : 'none'
                  }}
                >
                  {mood}
                </button>
              ))}
            </div>

            {/* Refresh Feed Button */}
            <button 
              onClick={() => setRefreshTrigger(t => t + 1)}
              style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '999px', color: 'white', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              <Zap size={16} /> Refresh Feed
            </button>
          </div>
        </div>
        
        {loadingRecommendations ? (
          <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
            <Sparkles size={24} style={{ marginBottom: '12px', opacity: 0.5 }} className="spin-slow" />
            <p style={{ fontSize: '0.9rem' }}>{selectedMood === 'All' ? 'Analyzing your taste profile...' : `Finding the best ${selectedMood} tracks...`}</p>
          </div>
        ) : recommendations.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
            {recommendations.map((track, i) => (
              <div 
                key={i} 
                className="track-card"
                onClick={() => playTrack(track, recommendations)}
                style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)', position: 'relative' }}
              >
                <div style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
                  <img src={track.thumb} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div className="play-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-hex, var(--accent-pink))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(var(--accent-rgb), 0.5)' }}>
                      <Play fill="white" size={24} style={{ marginLeft: '4px' }} />
                    </div>
                  </div>
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '28px' }}>{track.title}</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>{track.artist}</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
                  style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'none', border: 'none', color: likedSongs[track.id] ? 'var(--accent-pink)' : 'var(--text-muted)', cursor: 'pointer', transition: 'transform 0.1s' }}
                  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.85)'}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Heart size={20} fill={likedSongs[track.id] ? "currentColor" : "none"} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '40px', color: 'var(--text-muted)' }}>
            Play a few songs to get personalized recommendations!
          </div>
        )}
      </div>

      {/* Recently Played Songs */}
      {recentTracks.length > 0 && (
        <div style={{ width: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <Music size={24} color="var(--accent-pink)" />
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Recently Played</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentTracks.slice(0, 10).map((track, i) => (
              <div 
                key={i} 
                className="recent-track-row"
                onClick={() => playTrack(track, recentTracks.slice(0, 10))}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', 
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', 
                  borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
                  width: '100%', overflow: 'hidden', boxSizing: 'border-box'
                }}
              >
                <div style={{ position: 'relative', width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                  <img src={track.thumb || track.albumArtUrl} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div className="play-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                    <Play fill="white" size={20} style={{ marginLeft: '2px' }} />
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 600, margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>{track.artist}</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
                  style={{ background: 'none', border: 'none', padding: '8px', color: likedSongs[track.id] ? 'var(--accent-pink)' : 'var(--text-muted)', cursor: 'pointer', transition: 'transform 0.1s' }}
                  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.85)'}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Heart size={20} fill={likedSongs[track.id] ? "currentColor" : "none"} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Your Recent Searches */}
      {recentSearches.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '20px' }}>Your Recent Searches</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingBottom: '20px' }}>
            {recentSearches.map((query, i) => (
              <div 
                key={i} 
                onClick={() => navigate('/search?q=' + encodeURIComponent(query))}
                className="search-pill"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '999px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500, transition: 'background 0.2s, transform 0.2s' }}
              >
                <SearchIcon size={16} color="var(--text-muted)" />
                {query}
              </div>
            ))}
          </div>
        </div>
      )}

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
        .recent-track-row:hover {
          background: rgba(255,255,255,0.06) !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
        .recent-track-row:hover .play-overlay {
          opacity: 1 !important;
        }
        .search-pill:hover {
          background: rgba(255,255,255,0.1) !important;
          transform: translateY(-2px);
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-slow {
          animation: spinSlow 4s linear infinite;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Vibe Hero Animations */
        @keyframes meshMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .mesh-bg {
          background: radial-gradient(circle at 15% 50%, rgba(176, 48, 136, 0.4), transparent 50%),
                      radial-gradient(circle at 85% 30%, rgba(65, 34, 132, 0.4), transparent 50%),
                      radial-gradient(circle at 50% 80%, rgba(45, 120, 230, 0.2), transparent 50%);
          background-size: 200% 200%;
          animation: meshMove 15s ease infinite;
          filter: blur(40px);
        }
      `}</style>
    </div>
  );
}
