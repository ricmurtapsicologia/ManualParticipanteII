const manifest = require('../book/manifest.json');

module.exports = (_request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.status(200).json({
    status: 'ok',
    app: manifest.title,
    format: 'web-native',
    viewer: 'interactive-book',
    release: manifest.release,
    complete: manifest.complete,
    availablePages: manifest.availablePages,
    targetPages: manifest.targetPages,
  });
};
