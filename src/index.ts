import http from 'http';

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  console.log('Request received:', req.url);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
});

server.listen(PORT, () => {
  console.log(`Minimal server listening on port ${PORT}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});
