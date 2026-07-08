const http = require('http');
const fs = require('fs');
const path = require('path');
const { autoDownload } = require('./lib/sen-scraper');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function sendJson(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(payload));
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.join(ROOT, pathname);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === '/api/sen-auto') {
    try {
      const result = await autoDownload(Object.fromEntries(url.searchParams.entries()));
      sendJson(res, 200, {
        ok: true,
        fileName: result.fileName,
        contentType: result.contentType,
        base64: result.buffer.toString('base64'),
        title: result.title || '',
        agency: result.agency || url.searchParams.get('agency') || '',
        detailUrl: result.detailUrl || '',
        attachmentUrl: result.attachmentUrl || result.finalUrl || '',
        candidates: (result.candidates || []).slice(0, 10).map(item => ({
          title: item.title,
          date: item.date,
          detailUrl: item.detailUrl,
          board: item.board,
          agency: item.agency,
        })),
        notices: result.notices || [],
      });
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        message: error.message || '공개자료를 불러오지 못했어요.',
        candidates: (error.candidates || []).slice(0, 10).map(item => ({
          title: item.title,
          date: item.date,
          detailUrl: item.detailUrl,
          board: item.board,
          agency: item.agency,
        })),
        notices: error.notices || [],
      });
    }
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`교육청 법카맵 v2.0 로컬 서버: http://localhost:${PORT}`);
});
