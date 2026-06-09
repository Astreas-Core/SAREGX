export default async function handler(req, res) {
  try {
    const type = req.query.type || 'playlist';
    const id = req.query.id;
    
    if (!id) {
      return res.status(400).json({ error: "Missing ID" });
    }

    const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;
    const fetchRes = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    
    const html = await fetchRes.text();
    
    const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">\s*({.+?})\s*<\/script>/s);
    if (!nextDataMatch) throw new Error("No __NEXT_DATA__ found in embed page");
    
    const nextData = JSON.parse(nextDataMatch[1]);
    const entity = nextData?.props?.pageProps?.state?.data?.entity;
    
    if (!entity) throw new Error("No entity found in embed page JSON");

    return res.status(200).json(entity);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
