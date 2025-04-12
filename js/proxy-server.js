const http = require('http');
const https = require('https');
const url = require('url');

// Configuration
const PORT = 3000;
const OLLAMA_API = 'http://localhost:11434/api';

// Create the server
const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse the request URL
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  // Only proxy requests to /api/*
  if (!path.startsWith('/api/')) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }
  
  // Extract the Ollama API endpoint from the path
  const ollamaEndpoint = path.replace('/api', '');
  const ollamaUrl = `${OLLAMA_API}${ollamaEndpoint}`;
  
  console.log(`Proxying request to: ${ollamaUrl}`);
  
  // Collect request body data
  let body = [];
  req.on('data', (chunk) => {
    body.push(chunk);
  }).on('end', () => {
    body = Buffer.concat(body).toString();
    
    // Prepare the options for the Ollama API request
    const options = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    // Create the request to the Ollama API
    const proxyReq = http.request(ollamaUrl, options, (proxyRes) => {
      // Set the status code and headers
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      
      // Pipe the response from Ollama to the client
      proxyRes.pipe(res);
    });
    
    // Handle errors
    proxyReq.on('error', (error) => {
      console.error('Error proxying request:', error);
      res.writeHead(500);
      res.end(`Proxy Error: ${error.message}`);
    });
    
    // Send the request body to Ollama
    if (body) {
      proxyReq.write(body);
    }
    
    proxyReq.end();
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}`);
  console.log(`Proxying requests to Ollama API at ${OLLAMA_API}`);
  console.log('Make sure Ollama is running!');
});
