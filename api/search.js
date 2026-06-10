import yts from 'yt-search';

export default async function handler(req, res) {
  try {
    const q = req.query.q;
    if (!q) {
      return res.status(400).json({ error: 'Missing query' });
    }

    const r = await yts(q);
    const videos = r.videos.slice(0, 15);

    const results = videos.map(item => ({
      videoId: item.videoId,
      title: item.title,
      author: item.author.name,
      lengthSeconds: item.seconds,
      videoThumbnails: [{ url: item.thumbnail }]
    }));

    return res.status(200).json(results);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
