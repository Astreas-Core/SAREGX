export async function scrapeSpotifyPlaylist(url) {
  try {
    // Parse URL (like TuneBridge does)
    const urlMatch = url.match(/open\.spotify\.com\/(track|album|playlist)\/([A-Za-z0-9]+)/);
    const uriMatch = url.match(/spotify:(track|album|playlist):([A-Za-z0-9]+)/);
    
    let type = 'playlist';
    let id = '';

    if (urlMatch) {
      type = urlMatch[1];
      id = urlMatch[2];
    } else if (uriMatch) {
      type = uriMatch[1];
      id = uriMatch[2];
    } else {
      throw new Error("Invalid Spotify URL. Must be a track, album, or playlist.");
    }

    // Call our new local backend endpoint
    const apiUrl = `/api/spotify-import?type=${type}&id=${id}`;
    const res = await fetch(apiUrl);
    
    if (!res.ok) {
      throw new Error(`Import failed: ${res.statusText}`);
    }

    const entity = await res.json();
    if (!entity || !entity.name) {
      throw new Error("Failed to parse Spotify entity data.");
    }

    const name = entity.name || entity.title || "Unknown Playlist";
    
    // Extract cover art
    let coverUrl = "";
    if (entity.coverArt?.sources && entity.coverArt.sources.length > 0) {
      coverUrl = entity.coverArt.sources[0].url;
    } else if (entity.visuals?.avatarImage?.sources && entity.visuals.avatarImage.sources.length > 0) {
      coverUrl = entity.visuals.avatarImage.sources[0].url;
    }

    const tracks = [];

    // Depending on type, extract tracks from the embed entity
    if (type === 'track') {
      const artist = entity.subtitle || extractArtistFromEntity(entity);
      tracks.push({ title: name, artist });
    } else {
      const trackList = entity.trackList || [];
      for (const t of trackList) {
        const title = t.title || t.name || 'Unknown';
        const artist = t.subtitle || 'Unknown';
        tracks.push({ title, artist });
      }
    }

    if (tracks.length === 0) {
      throw new Error("No playable tracks found in this Spotify link.");
    }

    return { name, coverUrl, tracks };
  } catch (error) {
    console.error("Scraping failed:", error);
    throw new Error(error.message || "Failed to import Spotify playlist.");
  }
}

function extractArtistFromEntity(entity) {
  if (entity.authors && entity.authors.length > 0) return entity.authors[0].name;
  if (entity.artists && entity.artists.length > 0) {
    return typeof entity.artists[0] === 'object' ? entity.artists[0].name : String(entity.artists[0]);
  }
  return 'Unknown';
}
