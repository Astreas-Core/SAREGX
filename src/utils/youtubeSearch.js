// Highly reliable CORS-enabled public Invidious & Piped instances as FALLBACKS
const API_INSTANCES = [
  { url: 'https://iv.ggtyler.dev', type: 'invidious' },
  { url: 'https://vid.puffyan.us', type: 'invidious' },
  { url: 'https://pipedapi.kavin.rocks', type: 'piped' },
  { url: 'https://pipedapi.smnz.de', type: 'piped' }
];

export async function searchYouTubeTrack(query) {
  // FIRST PRIORITY: Vercel Serverless Backend (uses yt-search, incredibly fast, no CORS issues)
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query + ' audio')}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        return {
          id: item.videoId,
          title: item.title,
          artist: item.author,
          thumb: item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`
        };
      }
    }
  } catch (e) {
    console.warn("Backend /api/search failed, falling back to public APIs...");
  }

  // FALLBACK: Public proxy instances (for local dev without vercel CLI)
  for (const instance of API_INSTANCES) {
    try {
      if (instance.type === 'invidious') {
        const res = await fetch(`${instance.url}/api/v1/search?q=${encodeURIComponent(query + ' audio')}&type=video`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const item = data[0];
            return {
              id: item.videoId,
              title: item.title,
              artist: item.author,
              thumb: item.videoThumbnails?.find(t => t.quality === 'medium')?.url || item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`
            };
          }
        }
      } else if (instance.type === 'piped') {
        const res = await fetch(`${instance.url}/search?q=${encodeURIComponent(query + ' audio')}&filter=music_songs`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.items && data.items.length > 0) {
            const item = data.items[0];
            const videoId = item.url.replace('/watch?v=', '');
            return {
              id: videoId,
              title: item.title,
              artist: item.uploaderName,
              thumb: item.thumbnail || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
            };
          }
        }
      }
    } catch (e) {
      console.warn(`Instance ${instance.url} failed, trying next...`);
    }
  }
  return null;
}

export async function searchYouTubeMultiple(query) {
  // FIRST PRIORITY: Vercel Serverless Backend
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        return data.map(item => ({
          videoId: item.videoId,
          title: item.title,
          author: item.author,
          lengthSeconds: item.lengthSeconds,
          videoThumbnails: [{ url: item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg` }]
        }));
      }
    }
  } catch (e) {
    console.warn("Backend /api/search failed for multiple search, falling back...");
  }

  // FALLBACK
  for (const instance of API_INSTANCES) {
    try {
      if (instance.type === 'invidious') {
        const res = await fetch(`${instance.url}/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            return data.map(item => ({
              videoId: item.videoId,
              title: item.title,
              author: item.author,
              lengthSeconds: item.lengthSeconds,
              videoThumbnails: [{ url: item.videoThumbnails?.find(t => t.quality === 'medium')?.url || item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg` }]
            }));
          }
        }
      } else if (instance.type === 'piped') {
        const res = await fetch(`${instance.url}/search?q=${encodeURIComponent(query)}&filter=music_songs`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.items && data.items.length > 0) {
            return data.items.map(item => {
              const videoId = item.url.replace('/watch?v=', '');
              return {
                videoId: videoId,
                title: item.title,
                author: item.uploaderName,
                lengthSeconds: item.duration,
                videoThumbnails: [{ url: item.thumbnail || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` }]
              };
            });
          }
        }
      }
    } catch (e) {
      console.warn(`Instance ${instance.url} failed for multiple search, trying next...`);
    }
  }
  return [];
}
