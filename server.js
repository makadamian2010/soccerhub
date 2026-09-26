const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC_DIR = path.join(__dirname, 'public');
const SPORTMONKS_URL = 'https://api.sportmonks.com/v3/football';
const cache = new Map();

function loadEnv() {
  const file = path.join(__dirname, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

loadEnv();

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
}

function date(value) {
  return value.toISOString().slice(0, 10);
}

function noData(message) {
  const error = new Error(message);
  error.code = 'no_data';
  return error;
}

async function sportmonks(endpoint, ttl = 60_000) {
  if (!process.env.SPORTMONKS_API_TOKEN) throw noData('Sportmonks is not configured.');
  const cached = cache.get(endpoint);
  if (cached?.expires > Date.now()) return cached.value;

  const separator = endpoint.includes('?') ? '&' : '?';
  const response = await fetch(`${SPORTMONKS_URL}${endpoint}${separator}api_token=${encodeURIComponent(process.env.SPORTMONKS_API_TOKEN)}`);
  if (!response.ok) throw noData(`Sportmonks returned ${response.status}.`);
  const body = await response.json();
  if (body?.message || body?.error) throw noData(body.message || body.error);
  const value = Array.isArray(body?.data) ? body.data : body?.data ? [body.data] : [];
  cache.set(endpoint, { value, expires: Date.now() + ttl });
  return value;
}

function itemById(items, id) {
  return (items || []).find((item) => String(item.id) === String(id));
}

function participants(record) {
  const all = record.participants || [];
  return {
    home: all.find((item) => item.meta?.location === 'home') || all[0] || {},
    away: all.find((item) => item.meta?.location === 'away') || all[1] || {},
  };
}

function score(record, location) {
  const scores = record.scores || [];
  const current = scores.filter((item) => item.description === 'CURRENT' || item.description === 'CURRENT_SCORE');
  const result = current.find((item) => item.score?.participant === location) || scores.find((item) => item.score?.participant === location);
  return result?.score?.goals ?? null;
}

function status(state) {
  const code = String(state?.short_name || state?.name || '').toUpperCase();
  if (['FT', 'AET', 'PEN'].includes(code) || /finished|full time/.test(String(state?.name || '').toLowerCase())) return 'finished';
  if (['HT', 'LIVE', '1H', '2H', 'ET', 'BT', 'P'].includes(code) || /live|half time/.test(String(state?.name || '').toLowerCase())) return 'live';
  return 'scheduled';
}

function gender(league) {
  const value = String(league?.gender || league?.name || '').toLowerCase();
  return /women|female|ladies/.test(value) ? 'women' : 'men';
}

function fixture(record) {
  const teams = participants(record);
  const league = record.league || {};
  return {
    id: String(record.id),
    date: record.starting_at,
    timestamp: record.starting_at_timestamp || Math.floor(new Date(record.starting_at).getTime() / 1000),
    seasonId: record.season_id,
    status: status(record.state),
    statusLabel: record.state?.name || 'Scheduled',
    minute: record.state?.minute ?? null,
    venue: record.venue?.name || 'Venue unavailable',
    league: { id: league.id || record.league_id, name: league.name || 'Competition', country: league.country?.name || league.country_name || 'International', logo: league.image_path || league.logo_path || '', gender: gender(league) },
    home: { id: teams.home.id, name: teams.home.name || 'Home', logo: teams.home.image_path || '', score: score(record, 'home') },
    away: { id: teams.away.id, name: teams.away.name || 'Away', logo: teams.away.image_path || '', score: score(record, 'away') },
  };
}

function competitionFromFixture(record) {
  const normalized = fixture(record);
  return { id: normalized.league.id, seasonId: normalized.seasonId, name: normalized.league.name, country: normalized.league.country, type: record.league?.type || 'Competition', gender: normalized.league.gender, logo: normalized.league.logo };
}

function detailValue(entry, type) {
  const detail = (entry.details || []).find((item) => String(item.type?.code || item.type?.name || '').toLowerCase().includes(type));
  return detail?.value ?? null;
}

function standing(entry) {
  const participant = entry.participant || {};
  return {
    rank: entry.position,
    team: { id: participant.id, name: participant.name || 'Team', logo: participant.image_path || '' },
    played: detailValue(entry, 'overall-matches-played'),
    wins: detailValue(entry, 'overall-won'),
    draws: detailValue(entry, 'overall-draw'),
    losses: detailValue(entry, 'overall-lost'),
    goalsFor: detailValue(entry, 'overall-goals-for'),
    goalsAgainst: detailValue(entry, 'overall-goals-against'),
    goalDifference: detailValue(entry, 'overall-goal-difference'),
    points: entry.points,
    form: (entry.form || []).map((item) => item.form || item.result || '').filter(Boolean).join(''),
    home: null,
    away: null,
  };
}

function player(entry) {
  const playerRecord = entry.player || {};
  const team = entry.team || {};
  const type = String(entry.type?.name || entry.type?.code || '').toLowerCase();
  return {
    id: playerRecord.id || entry.player_id,
    name: playerRecord.display_name || playerRecord.common_name || playerRecord.name || 'Player',
    photo: playerRecord.image_path || '',
    team: team.name || 'Team unavailable',
    teamLogo: team.image_path || '',
    position: playerRecord.position?.name || 'Player',
    appearances: null,
    minutes: null,
    goals: type.includes('goal') ? entry.total : null,
    penalties: null,
    assists: type.includes('assist') ? entry.total : null,
    keyPasses: null,
  };
}

async function selectedData(competition) {
  if (!competition?.seasonId) return { standings: [], players: [], errors: ['No verified season is available for this competition.'] };
  const [standingsResult, scorersResult] = await Promise.allSettled([
    sportmonks(`/standings/seasons/${competition.seasonId}?include=participant;details;form`, 120_000),
    sportmonks(`/topscorers/seasons/${competition.seasonId}?include=player;team;type`, 120_000),
  ]);
  return {
    standings: standingsResult.status === 'fulfilled' ? standingsResult.value.map(standing) : [],
    players: scorersResult.status === 'fulfilled' ? scorersResult.value.map(player) : [],
    errors: [standingsResult, scorersResult].filter((result) => result.status === 'rejected').map((result) => result.reason.message),
  };
}

async function dashboard(params) {
  const now = new Date();
  const from = new Date(now); from.setUTCDate(now.getUTCDate() - 7);
  const until = new Date(now); until.setUTCDate(now.getUTCDate() + 7);
  const includes = 'participants;league;venue;state;scores';
  const [rangeResult, liveResult] = await Promise.allSettled([
    sportmonks(`/fixtures/between/${date(from)}/${date(until)}?include=${includes}&per_page=100`, 30_000),
    sportmonks(`/livescores/inplay?include=${includes}&per_page=100`, 15_000),
  ]);
  const raw = [...(rangeResult.status === 'fulfilled' ? rangeResult.value : []), ...(liveResult.status === 'fulfilled' ? liveResult.value : [])];
  const fixtures = [...new Map(raw.map((record) => [record.id, fixture(record)])).values()].sort((a, b) => a.timestamp - b.timestamp);
  const selectedGender = params.get('gender') === 'women' ? 'women' : 'men';
  const genderFixtures = fixtures.filter((record) => record.league.gender === selectedGender);
  const competitions = [...new Map(genderFixtures.map((record) => [record.league.id, competitionFromFixture(raw.find((item) => String(item.id) === record.id) || {})])).values()];
  const selectedId = params.get('league');
  const selected = competitions.find((item) => String(item.id) === String(selectedId)) || null;
  const competitionData = selected ? await selectedData(selected) : { standings: [], players: [], errors: [] };
  const errors = [rangeResult, liveResult].filter((result) => result.status === 'rejected').map((result) => result.reason.message).concat(competitionData.errors);
  return { source: 'Sportmonks Football API', updatedAt: new Date().toISOString(), gender: selectedGender, competitions, fixtures: selected ? genderFixtures.filter((record) => String(record.league.id) === String(selected.id)) : genderFixtures, standings: competitionData.standings, players: competitionData.players, errors };
}

async function detail(id) {
  const [records] = await sportmonks(`/fixtures/${encodeURIComponent(id)}?include=participants;league;venue;state;scores;events;statistics;lineups;metadata`, 20_000);
  if (!records) return null;
  let probability = null;
  if (process.env.SPORTMONKS_PREDICTIONS_ENABLED === 'true') {
    try {
      const probabilities = await sportmonks(`/predictions/probabilities/fixtures/${encodeURIComponent(id)}?include=type`, 120_000);
      const match = probabilities.find((item) => item.type?.code === 'fulltime-result-probability' || item.type?.name === 'Fulltime Result Probability');
      if (match?.predictions) probability = { home: match.predictions.home, draw: match.predictions.draw, away: match.predictions.away, confidence: 'Sportmonks model probability' };
    } catch (_) {
      // Predictions are an optional paid add-on; normal match data remains usable without it.
    }
  }
  return { fixture: fixture(records), events: records.events || [], statistics: records.statistics || [], lineups: records.lineups || [], prediction: probability, updatedAt: new Date().toISOString(), source: 'Sportmonks Football API' };
}

function serveStatic(reqPath, res) {
  const clean = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
  const target = path.join(PUBLIC_DIR, clean === '/' ? 'index.html' : clean);
  if (!target.startsWith(PUBLIC_DIR)) return json(res, 403, { error: 'Forbidden' });
  fs.readFile(target, (error, file) => {
    if (error) return fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (indexError, index) => {
      if (indexError) return json(res, 404, { error: 'Not found' });
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(index);
    });
    const types = { '.css': 'text/css', '.js': 'application/javascript', '.svg': 'image/svg+xml', '.html': 'text/html' };
    res.writeHead(200, { 'Content-Type': `${types[path.extname(target)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': /\.(css|js|html)$/.test(target) ? 'no-cache' : 'public, max-age=3600' });
    res.end(file);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname === '/api/dashboard') return json(res, 200, await dashboard(url.searchParams));
    if (url.pathname.startsWith('/api/match/')) {
      const data = await detail(url.pathname.replace('/api/match/', ''));
      return data ? json(res, 200, data) : json(res, 404, { error: 'No data available.' });
    }
    if (url.pathname === '/api/health') return json(res, 200, { configured: Boolean(process.env.SPORTMONKS_API_TOKEN), source: 'Sportmonks Football API', predictions: process.env.SPORTMONKS_PREDICTIONS_ENABLED === 'true' });
    return serveStatic(url.pathname, res);
  } catch (error) {
    return json(res, error.code === 'no_data' ? 503 : 502, { error: 'No data available.', detail: error.message });
  }
});

server.listen(PORT, HOST, () => console.log(`ScoreHub running at http://${HOST}:${PORT}`));
