import React, { createContext, useState, useContext, useRef, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { searchYouTubeTrack } from '../utils/youtubeSearch';

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null); // { id: 'yt-id', title: 'Song', artist: 'Artist', thumb: 'url' }
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(100);
  const [likedSongs, setLikedSongs] = useState({}); // Map of id -> track object for instant lookup
  const [playlists, setPlaylists] = useState([]); // Array of playlist objects
  
  
  // This will hold the actual YouTube player instance from react-youtube
  const ytPlayerRef = useRef(null);

  // Clear player state when user logs out
  useEffect(() => {
    import('firebase/auth').then(({ onAuthStateChanged }) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (!user) {
          setCurrentTrack(null);
          setIsPlaying(false);
          setProgress(0);
          setDuration(0);
          setLikedSongs({});
          setPlaylists([]);
          if (ytPlayerRef.current) {
            try { ytPlayerRef.current.stopVideo(); } catch (e) {}
          }
        }
      });
      return () => unsubscribe();
    });
  }, []);

  // Listen to User's Liked Songs in Real-time
  useEffect(() => {
    if (!auth.currentUser) return;
    
    const unsubscribeLikes = onSnapshot(collection(db, 'users', auth.currentUser.uid, 'likes'), (snapshot) => {
      const likesMap = {};
      snapshot.forEach(doc => {
        likesMap[doc.id] = doc.data();
      });
      setLikedSongs(likesMap);
    });

    const unsubscribePlaylists = onSnapshot(collection(db, 'users', auth.currentUser.uid, 'playlists'), (snapshot) => {
      const p = [];
      snapshot.forEach(doc => {
        p.push({ id: doc.id, ...doc.data() });
      });
      // Sort by creation time descending (newest first)
      p.sort((a, b) => {
        const getMs = (t) => t ? (typeof t.toMillis === 'function' ? t.toMillis() : (typeof t === 'number' ? t : 0)) : 0;
        return getMs(b.createdAt) - getMs(a.createdAt);
      });
      setPlaylists(p);
    });

    return () => {
      unsubscribeLikes();
      unsubscribePlaylists();
    };
  }, [auth.currentUser]);

  // Poll for progress
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(async () => {
        if (ytPlayerRef.current) {
          try {
            const currentTime = await ytPlayerRef.current.getCurrentTime();
            const totalTime = await ytPlayerRef.current.getDuration();
            if (totalTime > 0) {
              setProgress((currentTime / totalTime) * 100);
              setDuration(totalTime);
            }
          } catch (e) {
            // Player might not be ready
          }
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const toggleLike = async (track) => {
    if (!auth.currentUser || !track) return;
    
    const likeRef = doc(db, 'users', auth.currentUser.uid, 'likes', track.id);
    
    try {
      if (likedSongs[track.id]) {
        await deleteDoc(likeRef);
      } else {
        await setDoc(likeRef, {
          ...track,
          likedAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.error("Failed to toggle like", e);
    }
  };

  const createPlaylist = async (name, tracks = [], source = 'custom', coverUrl = '') => {
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'playlists'), {
        name,
        tracks,
        source, // e.g., 'spotify', 'custom'
        coverUrl,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Failed to create playlist", e);
    }
  };

  const playTrack = async (track) => {
    console.log("Playing track:", track);
    let playTarget = { ...track };
    
    // Check if the id is a valid YouTube ID (11 chars)
    const isYouTubeId = playTarget.id && typeof playTarget.id === 'string' && playTarget.id.length === 11;
    
    // If we don't have a valid YouTube ID in either field
    if (!playTarget.youtubeId && !isYouTubeId) {
      console.log("Resolving YouTube ID for:", playTarget);
      const resolved = await searchYouTubeTrack(`${track.title} ${track.artist}`);
      if (resolved && resolved.id) {
        playTarget.youtubeId = resolved.id;
        console.log("Resolved to:", playTarget.youtubeId);
        
        // Cache the resolved YouTube ID to Firestore if it's a liked song
        if (auth.currentUser && likedSongs[playTarget.id]) {
          try {
            await setDoc(doc(db, 'users', auth.currentUser.uid, 'likes', playTarget.id), { 
              id: playTarget.youtubeId 
            }, { merge: true });
            console.log("Cached YouTube ID to Firestore Likes");
          } catch (e) { 
            console.error("Error caching ID to Firestore", e); 
          }
        }
      } else {
        console.error("Could not resolve YouTube ID for track");
        return; // Cannot play
      }
    } else if (isYouTubeId) {
      playTarget.youtubeId = playTarget.id;
    }

    setCurrentTrack(playTarget);
    setIsPlaying(true);
    
    // Save to Firestore History
    if (auth.currentUser) {
      try {
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'history'), {
          ...track,
          playedAt: serverTimestamp()
        });
      } catch (e) {
        console.error("Error saving history to Firestore", e);
      }
    }
  };

  const togglePlay = () => {
    if (!ytPlayerRef.current) return;
    
    if (isPlaying) {
      ytPlayerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      ytPlayerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  const seekTo = (percent) => {
    if (!ytPlayerRef.current || duration === 0) return;
    const seekTime = (percent / 100) * duration;
    ytPlayerRef.current.seekTo(seekTime, true);
    setProgress(percent);
  };

  const setVolume = (val) => {
    setVolumeState(val);
    if (ytPlayerRef.current) {
      ytPlayerRef.current.setVolume(val);
    }
  };

  return (
    <PlayerContext.Provider value={{ 
      currentTrack, 
      isPlaying, 
      setIsPlaying,
      progress,
      duration,
      volume,
      ytPlayerRef,
      likedSongs,
      playlists,
      toggleLike,
      createPlaylist,
      playTrack,
      togglePlay,
      seekTo,
      setVolume
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
