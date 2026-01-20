const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = false;
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const startTime = Date.now();
      
      // Log da requisição
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Host: ${req.headers.host || 'no-host'} - IP: ${req.socket.remoteAddress || 'unknown'}`);
      
      // Garantir que os headers estão corretos
      res.setHeader('X-Powered-By', 'Next.js');
      
      await handle(req, res, parsedUrl);
      
      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Status: ${res.statusCode} - Duration: ${duration}ms`);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Error handling ${req.url}:`, err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain');
        res.end('internal server error');
      }
    }
  });
  
  server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });
  
  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Server listening on all interfaces (0.0.0.0)`);
    console.log(`> Accessible via: http://127.0.0.1:${port}, http://localhost:${port}, http://0.0.0.0:${port}`);
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});
