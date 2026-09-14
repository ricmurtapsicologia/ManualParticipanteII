const manifest = require('../book/manifest.json');
const meta = require('../book/meta.json');

module.exports = (_request, response) => {
  response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
  response.status(200).json({ ...manifest, meta });
};
