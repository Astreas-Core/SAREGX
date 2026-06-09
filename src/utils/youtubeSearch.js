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
  const instances = await getInvidiousInstances();
  
  for (const instance of instances) {
    try {
      const res = await fetch(`${instance}/api/v1/search?q=${encodeURIComponent(query + ' audio')}&type=video`);
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
    } catch (e) {
      console.warn(`Instance ${instance} failed, trying next...`);
    }
  }
  return null;
}
