import React, { useEffect, useState } from 'react';
import YouTube from 'react-youtube';
import { usePlayer } from '../contexts/PlayerContext';

export default function YouTubePlayer() {
  const { currentTrack, setIsPlaying, ytPlayerRef, playNext } = usePlayer();
  const [isReady, setIsReady] = useState(false);

  const onReady = (event) => {
    ytPlayerRef.current = event.target;
    setIsReady(true);
  };

  useEffect(() => {
    if (isReady && ytPlayerRef.current && currentTrack?.youtubeId) {
      ytPlayerRef.current.loadVideoById(currentTrack.youtubeId);
      // Force play specifically to overcome some browser autoplay quirks
      setTimeout(() => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
          ytPlayerRef.current.playVideo();
        }
      }, 500);
      setIsPlaying(true);
    }
  }, [currentTrack?.youtubeId, isReady, setIsPlaying, ytPlayerRef]);

  const onStateChange = (event) => {
    // 1 is PLAYING, 2 is PAUSED, 0 is ENDED
    if (event.data === 1) {
      setIsPlaying(true);
    } else if (event.data === 2) {
      setIsPlaying(false);
    } else if (event.data === 0) {
      playNext();
    }
  };

  const opts = {
    height: '0',
    width: '0',
    playerVars: {
      autoplay: 0, // Disable auto-play so the dummy preload video doesn't play
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      origin: window.location.origin,
      vq: 'highres',
    },
  };

  // ALWAYS render the YouTube component so it pre-loads the iframe and never unmounts.
  // This drastically reduces playback latency.

  return (
    <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -100 }}>
      <YouTube 
        videoId="dQw4w9WgXcQ" // Dummy ID to preload the massive YouTube iframe instantly
        opts={opts} 
        onReady={onReady} 
        onStateChange={onStateChange} 
      />
    </div>
  );
}
