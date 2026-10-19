const { dashboard, match, configured } = require('../../lib/football-api');

function response(statusCode, body) { return { statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) }; }

exports.handler = async (event) => {
  const route = event.path.replace(/^\/(?:\.netlify\/functions\/api|api)/, '') || '/';
  const query = new URLSearchParams(event.rawQuery || '');
  try {
    if (route === '/dashboard') return response(200, await dashboard(query));
    if (route.startsWith('/match/')) { const data = await match(route.slice('/match/'.length)); return data ? response(200, data) : response(404, { error: 'No data available.' }); }
    if (route === '/health') return response(200, { configured: configured(), source: 'API-Football' });
    return response(404, { error: 'No data available.' });
  } catch (error) { return response(503, { error: 'No data available.', detail: error.message }); }
};
