const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function createMockResponse(res) {
  return {
    setHeader: (key, value) => res.setHeader(key, value),
    status(code) {
      res.statusCode = code;
      return this;
    },
    json(payload) {
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(payload));
    },
  };
}

async function serveApi(req, res, pathname, searchParams) {
  const routes = {
    '/api/sen-auto': './api/sen-auto.js',
    '/api/sen-find': './api/sen-find.js',
    '/api/sen-browser': './api/sen-browser.js',
  };
  const route = routes[pathname];
  if (!route) return false;
  try {
    const handler = require(route);
    const query = Object.fromEntries(searchParams.entries());
    await handler({ query, method: req.method, headers: req.headers }, createMockResponse(res));
  } catch (error) {
    res.writeHead(500, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ ok: false, message: error.message || 'API 처리 중 오류가 발생했어요.' }));
  }
  return true;
}

function serveStatic(req, res, pathname) {
  let safePath = decodeURIComponent(pathname);
  if (safePath === '/') safePath = '/index.html';
  const filePath = path.join(ROOT, safePath);
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

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (await serveApi(req, res, url.pathname, url.searchParams)) return;
  serveStatic(req, res, url.pathname);
}).listen(PORT, () => {
  console.log(`교육청 법카맵 로컬 서버: http://localhost:${PORT}`);
});
