import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { exec } from 'child_process'
import util from 'util'

const execPromise = util.promisify(exec)

function ytDlpPlugin() {
  return {
    name: 'yt-dlp-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url.startsWith('/api/search')) {
          const urlObj = new URL(req.url, `http://${req.headers.host}`);
          const q = urlObj.searchParams.get('q');
          if (!q) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: 'Missing query' }));
          }
          
          try {
            // ytsearch10 to get top 10 results. --flat-playlist ensures blazing fast metadata-only extraction.
            const cmd = `yt-dlp "ytsearch10:${q.replace(/"/g, '')}" --dump-json --no-warnings --flat-playlist`;
            const { stdout } = await execPromise(cmd);
            
            // yt-dlp returns multiple JSON objects separated by newlines
            const results = stdout.trim().split('\n').map(line => {
              try {
                return JSON.parse(line);
              } catch(e) { return null; }
            }).filter(Boolean).map(item => ({
              videoId: item.id,
              title: item.title,
              author: item.channel || item.uploader,
              lengthSeconds: item.duration,
              videoThumbnails: [{ url: `https://i.ytimg.com/vi/${item.id}/mqdefault.jpg` }]
            }));
            
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(results));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        if (req.url.startsWith('/api/spotify-import')) {
          try {
            const urlObj = new URL(req.url, `http://${req.headers.host}`);
            const type = urlObj.searchParams.get('type') || 'playlist';
            const id = urlObj.searchParams.get('id');
            
            if (!id) throw new Error("Missing ID");

            const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;
            const fetchRes = await fetch(embedUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
              }
            });
            
            const html = await fetchRes.text();
            
            // Extract the __NEXT_DATA__ JSON block from the embed page, exactly like TuneBridge
            const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">\s*({.+?})\s*<\/script>/s);
            if (!nextDataMatch) throw new Error("No __NEXT_DATA__ found in embed page");
            
            const nextData = JSON.parse(nextDataMatch[1]);
            const entity = nextData?.props?.pageProps?.state?.data?.entity;
            
            if (!entity) throw new Error("No entity found in embed page JSON");

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(entity));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        next();
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), ytDlpPlugin()],
})
