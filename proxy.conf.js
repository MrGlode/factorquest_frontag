const PROXY_CONFIG = [
  {
    context: [
      '/oauth2/**',  // ✅ Toutes les routes sous /oauth2
    ],
    target: 'https://localhost:9443',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    bypass: function (req, res, proxyOptions) {
      // ✅ Ne pas proxy les fichiers statiques
      if (req.url.endsWith('.js') || 
          req.url.endsWith('.css') || 
          req.url.endsWith('.html') || 
          req.url.endsWith('.map') ||
          req.url.includes('@vite') ||
          req.url.includes('@fs')) {
        return req.url;
      }
    }
  },
  {
    context: [
      '/auth/**',
      '/game/**',
      '/main/**',
      '/market/**',
      '/player/**',
      '/research/**'
    ],
    target: 'https://localhost:8243',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    bypass: function (req, res, proxyOptions) {
      // ✅ Ne pas proxy les fichiers statiques
      if (req.url.endsWith('.js') || 
          req.url.endsWith('.css') || 
          req.url.endsWith('.html') || 
          req.url.endsWith('.map') ||
          req.url.includes('@vite') ||
          req.url.includes('@fs')) {
        return req.url;
      }
    }
  }
];

module.exports = PROXY_CONFIG;