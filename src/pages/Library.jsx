import React, { useState, useEffect } from 'react';
import { Play, Heart, Music, Plus, DownloadCloud, Loader, ListVideo, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { scrapeSpotifyPlaylist } from '../utils/spotifyScraper';
import { searchYouTubeTrack } from '../utils/youtubeSearch';

export default function Library() {
  const { currentUser } = useAuth();
  const { playTrack, toggleLike, likedSongs, playlists, createPlaylist } = usePlayer();
  
  const [likes, setLikes] = useState([]);
  const [loadingLikes, setLoadingLikes] = useState(true);
  
  const [activeTab, setActiveTab] = useState('liked'); // 'liked', 'playlists', 'import'
  const [activePlaylist, setActivePlaylist] = useState(null);
  
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [importPercent, setImportPercent] = useState(0);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'users', currentUser.uid, 'likes'),
      orderBy('likedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tracks = [];
      snapshot.forEach(doc => {
        tracks.push(doc.data());
      });
      setLikes(tracks);
      setLoadingLikes(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleImport = async (e) => {
    e.preventDefault();
    if (!spotifyUrl) return;
    
    setImporting(true);
    setImportProgress('Scraping Spotify...');
    setImportPercent(5);
    
    try {
      const data = await scrapeSpotifyPlaylist(spotifyUrl);
      
      setImportProgress(`Found ${data.tracks.length} tracks. Searching audio sources...`);
      const resolvedTracks = [];
      
      let count = 0;
      const batchSize = 5;
      for (let i = 0; i < data.tracks.length; i += batchSize) {
        const batch = data.tracks.slice(i, i + batchSize);
        const promises = batch.map(async (track) => {
          const ytTrack = await searchYouTubeTrack(`${track.title} ${track.artist}`);
          return ytTrack;
        });
        
        const results = await Promise.all(promises);
        results.forEach(res => {
          if (res) resolvedTracks.push(res);
        });
        
        count += batch.length;
        setImportProgress(`Matched ${count} of ${data.tracks.length} tracks...`);
        setImportPercent(10 + Math.floor((count / data.tracks.length) * 80));
      }
      
      setImportProgress('Saving Playlist...');
      setImportPercent(95);
      await createPlaylist(data.name, resolvedTracks, 'spotify', data.coverUrl);
      
      setSpotifyUrl('');
      setActiveTab('playlists');
    } catch (err) {
      alert("Import failed: " + err.message);
    } finally {
      setImporting(false);
      setImportProgress('');
      setImportPercent(0);
    }
  };

  const handleDeletePlaylist = async (playlistId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this playlist?')) {
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'playlists', playlistId));
        if (activePlaylist?.id === playlistId) setActivePlaylist(null);
      } catch (err) {
        console.error('Error deleting playlist:', err);
      }
    }
  };

  if (loadingLikes) {
    return <div style={{ padding: '40px 4vw', color: 'var(--text-muted)' }}>Loading your library...</div>;
  }

  return (
    <div style={{ width: '100%', padding: '40px 4vw', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px', flex: 1 }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 16px 0' }}>
          Your Library
        </h1>
        
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button 
            onClick={() => { setActiveTab('liked'); setActivePlaylist(null); }}
            style={{ padding: '10px 20px', borderRadius: '999px', border: 'none', background: activeTab === 'liked' ? 'white' : 'rgba(255,255,255,0.1)', color: activeTab === 'liked' ? 'black' : 'white', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Heart size={18} /> Liked Songs
          </button>
          <button 
            onClick={() => { setActiveTab('playlists'); setActivePlaylist(null); }}
            style={{ padding: '10px 20px', borderRadius: '999px', border: 'none', background: activeTab === 'playlists' ? 'white' : 'rgba(255,255,255,0.1)', color: activeTab === 'playlists' ? 'black' : 'white', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <ListVideo size={18} /> Playlists
          </button>
          <button 
            onClick={() => { setActiveTab('import'); setActivePlaylist(null); }}
            style={{ padding: '10px 20px', borderRadius: '999px', border: 'none', background: activeTab === 'import' ? 'var(--accent-hex, var(--accent-pink))' : 'rgba(255,255,255,0.1)', color: activeTab === 'import' ? 'black' : 'white', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <DownloadCloud size={18} /> Import Spotify
          </button>
        </div>
      </div>

      {/* Content Areas */}
      <div style={{ minHeight: '50vh' }}>
        
        {/* LIKED SONGS */}
        {activeTab === 'liked' && (
          likes.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {likes.map((track, i) => (
                <TrackListItem key={track.id} track={track} index={i+1} playTrack={playTrack} toggleLike={toggleLike} isLiked={likedSongs[track.id]} />
              ))}
            </div>
          ) : (
            <EmptyState icon={<Heart size={40} color="var(--accent)" />} title="No liked songs" desc="Click the heart icon on any track to save it here." />
          )
        )}

        {/* PLAYLISTS */}
        {activeTab === 'playlists' && (
          activePlaylist ? (
            <div>
              <button 
                onClick={() => setActivePlaylist(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1rem', cursor: 'pointer', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                ← Back to Playlists
              </button>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '32px' }}>{activePlaylist.name}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activePlaylist.tracks.map((track, i) => (
                  <TrackListItem key={`${track.id}-${i}`} track={track} index={i+1} playTrack={playTrack} toggleLike={toggleLike} isLiked={likedSongs[track.id]} />
                ))}
              </div>
            </div>
          ) : playlists && playlists.length > 0 ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '24px' }}>
                {playlists.map(pl => (
                  <div 
                    key={pl.id} 
                    className="playlist-grid-card"
                    onClick={() => setActivePlaylist(pl)}
                    style={{ 
                      background: 'rgba(255,255,255,0.03)', 
                      borderRadius: '12px', 
                      padding: '16px', 
                      cursor: 'pointer', 
                      transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ width: '100%', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      {pl.coverUrl ? (
                        <img src={pl.coverUrl} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="cover" />
                      ) : (
                        <Music size={48} color="rgba(255,255,255,0.2)" />
                      )}
                      
                      {/* Hover Play Overlay */}
                      <div className="play-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-pink)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(0,0,0,0.3)' }}>
                          <Play size={24} fill="white" style={{ marginLeft: '4px' }} />
                        </div>
                      </div>
                    </div>
                    
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pl.name}</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>{pl.tracks?.length || 0} tracks</p>
                      
                      <button 
                        onClick={(e) => handleDeletePlaylist(pl.id, e)}
                        className="delete-btn"
                        style={{ background: 'none', border: 'none', color: 'rgba(255,0,0,0.7)', cursor: 'pointer', padding: '4px', opacity: 0, transition: 'opacity 0.2s, transform 0.2s' }}
                        title="Delete Playlist"
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <style>{`
                .playlist-grid-card:hover {
                  background: rgba(255,255,255,0.08) !important;
                  transform: translateY(-4px);
                }
                .playlist-grid-card:hover .play-overlay {
                  opacity: 1 !important;
                }
                .playlist-grid-card:hover .delete-btn {
                  opacity: 1 !important;
                }
              `}</style>
            </>
          ) : (
            <EmptyState icon={<ListVideo size={40} color="var(--accent)" />} title="No playlists yet" desc="Import a playlist from Spotify to get started." />
          )
        )}

        {/* IMPORT SPOTIFY */}
        {activeTab === 'import' && (
          <div style={{ maxWidth: '640px', margin: '0 auto', background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '32px', padding: '48px', boxShadow: '0 24px 64px rgba(0,0,0,0.4)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '250px', height: '250px', background: 'var(--accent-hex, var(--accent-pink))', opacity: '0.1', filter: 'blur(80px)', borderRadius: '50%' }}></div>
            
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px', letterSpacing: '-0.03em' }}>
              <div style={{ background: 'rgba(29, 185, 84, 0.1)', padding: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DownloadCloud size={28} color="#1DB954" />
              </div>
              Import from Spotify
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '40px', fontSize: '1.05rem', lineHeight: 1.6 }}>
              Paste a public Spotify playlist URL below. We will extract the tracks and find the highest quality audio sources automatically.
            </p>
            
            <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ position: 'relative' }}>
                <input 
                  type="url" 
                  placeholder="https://open.spotify.com/playlist/..."
                  value={spotifyUrl}
                  onChange={e => setSpotifyUrl(e.target.value)}
                  disabled={importing}
                  style={{ width: '100%', padding: '20px 24px', borderRadius: '20px', background: 'rgba(0,0,0,0.4)', border: '2px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '1.1rem', outline: 'none', transition: 'all 0.3s ease', boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.2)' }}
                  onFocus={(e) => e.target.style.borderColor = '#1DB954'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={importing}
                style={{ padding: '20px', borderRadius: '20px', background: importing ? 'rgba(255,255,255,0.1)' : '#1DB954', color: importing ? 'rgba(255,255,255,0.5)' : 'black', fontSize: '1.15rem', fontWeight: 800, border: 'none', cursor: importing ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', transition: 'all 0.3s', boxShadow: importing ? 'none' : '0 12px 32px rgba(29, 185, 84, 0.3)' }}
                onMouseEnter={(e) => { if(!importing) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(29, 185, 84, 0.4)'; } }}
                onMouseLeave={(e) => { if(!importing) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(29, 185, 84, 0.3)'; } }}
              >
                {importing ? <><Loader className="spin" size={24} /> Processing Magic...</> : 'Import Playlist'}
              </button>
            </form>

            {importing && (
              <div style={{ marginTop: '32px', padding: '24px', background: 'rgba(0,0,0,0.3)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{importProgress}</span>
                  <span style={{ fontSize: '1rem', color: '#1DB954', fontWeight: 800 }}>{importPercent}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${importPercent}%`, background: 'linear-gradient(90deg, #1DB954, #1ed760)', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 0 20px rgba(29, 185, 84, 0.8)' }}></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .track-list-item:hover {
          background: rgba(255,255,255,0.08) !important;
        }
        .track-list-item:hover .track-index {
          display: none;
        }
        .track-list-item:hover .play-icon {
          display: block !important;
        }
        .track-list-item .play-icon {
          display: none;
        }
        .playlist-card:hover {
          background: rgba(255,255,255,0.05) !important;
          transform: translateY(-4px);
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

function TrackListItem({ track, index, playTrack, toggleLike, isLiked }) {
  return (
    <div 
      className="track-list-item"
      onClick={() => playTrack(track)}
      style={{ 
        display: 'flex', alignItems: 'center', padding: '12px 16px', borderRadius: '8px', 
        background: 'transparent', cursor: 'pointer', transition: 'background 0.2s', gap: '16px' 
      }}
    >
      <div style={{ width: '32px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500, display: 'flex', justifyContent: 'center' }}>
        <span className="track-index">{index}</span>
        <Play className="play-icon" size={18} fill="white" color="white" />
      </div>
      
      <div style={{ width: '48px', height: '48px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {track.thumb || track.albumArtUrl ? (
          <img src={track.thumb || track.albumArtUrl} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Music size={20} color="rgba(255,255,255,0.2)" />
        )}
      </div>
      
      <div style={{ flex: 1, minWidth: 0, paddingRight: '24px' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isLiked ? 'var(--accent-pink)' : 'white' }}>
          {track.title}
        </h4>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {track.artist}
        </p>
      </div>
      
      <button 
        onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
        style={{ background: 'none', border: 'none', color: isLiked ? 'var(--accent-pink)' : 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: '8px', transition: 'transform 0.1s, color 0.2s', opacity: 1 }}
        className={isLiked ? "" : "like-btn-hover"}
        onMouseEnter={(e) => { if (!isLiked) e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
        onMouseLeave={(e) => { if (!isLiked) e.currentTarget.style.color = 'rgba(255,255,255,0.2)' }}
      >
        <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
      </button>
      
      <style>{`
        .track-list-item:hover .like-btn-hover { color: var(--text-muted) !important; }
      `}</style>
    </div>
  );
}

function EmptyState({ icon, title, desc }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.05)' }}>
      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(var(--accent-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
        {icon}
      </div>
      <h3 style={{ fontSize: '2rem', marginBottom: '16px' }}>{title}</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '400px' }}>{desc}</p>
    </div>
  );
}
