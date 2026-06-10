// Highly reliable CORS-enabled public Invidious & Piped instances
const API_INSTANCES = [
  { url: 'https://iv.ggtyler.dev', type: 'invidious' },
  { url: 'https://vid.puffyan.us', type: 'invidious' },
  { url: 'https://invidious.jing.rocks', type: 'invidious' },
  { url: 'https://pipedapi.kavin.rocks', type: 'piped' },
  { url: 'https://pipedapi.smnz.de', type: 'piped' }
];

export async function searchYouTubeTrack(query) {
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
            // Piped URLs are like /watch?v=ID
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
