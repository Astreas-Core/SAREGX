const fallbackInstances = [
  'https://invidious.jing.rocks',
  'https://vid.puffyan.us',
  'https://invidious.nerdvpn.de',
  'https://inv.tux.pizza'
];

let cachedInstances = null;

export async function getInvidiousInstances() {
  if (cachedInstances) return cachedInstances;
  try {
    const res = await fetch('https://api.invidious.io/instances.json?sort_by=health');
    const data = await res.json();
    const workingInstances = data
      .filter(item => {
        const config = item[1];
        return config.api === true && config.cors === true && config.type === 'https';
      })
      .map(item => item[1].uri);
    
    if (workingInstances.length > 0) {
      cachedInstances = workingInstances;
      return workingInstances;
    }
  } catch (err) {
    console.warn("Could not fetch instance list, using defaults.");
  }
  return fallbackInstances;
}

export async function searchYouTubeTrack(query) {
  try {
    const searchUrl = `/api/search?q=${encodeURIComponent(query + ' audio')}`;
    const response = await fetch(searchUrl);
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        const item = data[0]; // Take the top result
        return {
          id: item.videoId,
          title: item.title,
          artist: item.author,
          thumb: item.videoThumbnails?.find(t => t.quality === 'medium')?.url || item.videoThumbnails?.[0]?.url || ''
        };
      }
    }
  } catch (e) {
    // Ignore and return null
  }
  return null;
}
