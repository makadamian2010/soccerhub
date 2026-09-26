const API_URL = 'https://api.sportmonks.com/v3/football';
const cache = new Map();

function response(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) };
}

async function provider(endpoint, ttl = 60_000) {
  const token = process.env.SPORTMONKS_API_TOKEN;
  if (!token) throw new Error('Sportmonks is not configured.');
  const cached = cache.get(endpoint);
  if (cached?.expires > Date.now()) return cached.value;
  const separator = endpoint.includes('?') ? '&' : '?';
  const result = await fetch(`${API_URL}${endpoint}${separator}api_token=${encodeURIComponent(token)}`);
  if (!result.ok) throw new Error(`Sportmonks returned ${result.status}.`);
  const payload = await result.json();
  if (payload?.message || payload?.error) throw new Error(payload.message || payload.error);
  const value = Array.isArray(payload?.data) ? payload.data : payload?.data ? [payload.data] : [];
  cache.set(endpoint, { value, expires: Date.now() + ttl });
  return value;
}

function getTeams(record) {
  const participants = record.participants || [];
  return {
    home: participants.find((team) => team.meta?.location === 'home') || participants[0] || {},
    away: participants.find((team) => team.meta?.location === 'away') || participants[1] || {},
  };
}

function getScore(record, side) {
  const scores = record.scores || [];
  const value = scores.find((entry) => (entry.description === 'CURRENT' || entry.description === 'CURRENT_SCORE') && entry.score?.participant === side) || scores.find((entry) => entry.score?.participant === side);
  return value?.score?.goals ?? null;
}

function getStatus(state) {
  const name = String(state?.name || '').toLowerCase();
  const code = String(state?.short_name || '').toUpperCase();
  if (['FT', 'AET', 'PEN'].includes(code) || /finished|full time/.test(name)) return 'finished';
  if (['HT', 'LIVE', '1H', '2H', 'ET', 'BT', 'P'].includes(code) || /live|half time/.test(name)) return 'live';
  return 'scheduled';
}

function getGender(league) {
  return /women|female|ladies/.test(`${league?.gender || ''} ${league?.name || ''}`.toLowerCase()) ? 'women' : 'men';
}

function normalizeFixture(record) {
  const teams = getTeams(record);
  const league = record.league || {};
  return {
    id: String(record.id), date: record.starting_at, timestamp: record.starting_at_timestamp || Math.floor(new Date(record.starting_at).getTime() / 1000), seasonId: record.season_id,
    status: getStatus(record.state), statusLabel: record.state?.name || 'Scheduled', minute: record.state?.minute ?? null, venue: record.venue?.name || 'Venue unavailable',
    league: { id: league.id || record.league_id, name: league.name || 'Competition', country: league.country?.name || league.country_name || 'International', logo: league.image_path || '', gender: getGender(league) },
    home: { id: teams.home.id, name: teams.home.name || 'Home', logo: teams.home.image_path || '', score: getScore(record, 'home') },
    away: { id: teams.away.id, name: teams.away.name || 'Away', logo: teams.away.image_path || '', score: getScore(record, 'away') },
  };
}

function date(value) { return value.toISOString().slice(0, 10); }

function standingValue(entry, key) {
  return (entry.details || []).find((detail) => String(detail.type?.code || detail.type?.name || '').toLowerCase().includes(key))?.value ?? null;
}

function normalizeStanding(entry) {
  const team = entry.participant || {};
  return { rank: entry.position, team: { id: team.id, name: team.name || 'Team', logo: team.image_path || '' }, played: standingValue(entry, 'overall-matches-played'), wins: standingValue(entry, 'overall-won'), draws: standingValue(entry, 'overall-draw'), losses: standingValue(entry, 'overall-lost'), goalsFor: standingValue(entry, 'overall-goals-for'), goalsAgainst: standingValue(entry, 'overall-goals-against'), goalDifference: standingValue(entry, 'overall-goal-difference'), points: entry.points, form: (entry.form || []).map((item) => item.form || item.result || '').join(''), home: null, away: null };
}

function normalizePlayer(entry) {
  const player = entry.player || {};
  const team = entry.team || {};
  const type = String(entry.type?.name || entry.type?.code || '').toLowerCase();
  return { id: player.id || entry.player_id, name: player.display_name || player.common_name || player.name || 'Player', photo: player.image_path || '', team: team.name || 'Team unavailable', teamLogo: team.image_path || '', position: player.position?.name || 'Player', appearances: null, minutes: null, goals: type.includes('goal') ? entry.total : null, penalties: null, assists: type.includes('assist') ? entry.total : null, keyPasses: null };
}

async function dashboard(query) {
  const now = new Date();
  const from = new Date(now); from.setUTCDate(now.getUTCDate() - 7);
  const until = new Date(now); until.setUTCDate(now.getUTCDate() + 7);
  const include = 'participants;league;venue;state;scores';
  const [range, live] = await Promise.allSettled([provider(`/fixtures/between/${date(from)}/${date(until)}?include=${include}&per_page=100`, 30_000), provider(`/livescores/inplay?include=${include}&per_page=100`, 15_000)]);
  const raw = [...(range.status === 'fulfilled' ? range.value : []), ...(live.status === 'fulfilled' ? live.value : [])];
  const all = [...new Map(raw.map((record) => [record.id, { raw: record, fixture: normalizeFixture(record) }])).values()];
  const gender = query.get('gender') === 'women' ? 'women' : 'men';
  const records = all.filter((item) => item.fixture.league.gender === gender);
  const competitions = [...new Map(records.map((item) => [item.fixture.league.id, { id: item.fixture.league.id, seasonId: item.fixture.seasonId, name: item.fixture.league.name, country: item.fixture.league.country, type: item.raw.league?.type || 'Competition', gender, logo: item.fixture.league.logo }])).values()];
  const selected = competitions.find((competition) => String(competition.id) === query.get('league'));
  let standings = [], players = [];
  if (selected?.seasonId) {
    const [table, scorers] = await Promise.allSettled([provider(`/standings/seasons/${selected.seasonId}?include=participant;details;form`, 120_000), provider(`/topscorers/seasons/${selected.seasonId}?include=player;team;type`, 120_000)]);
    standings = table.status === 'fulfilled' ? table.value.map(normalizeStanding) : [];
    players = scorers.status === 'fulfilled' ? scorers.value.map(normalizePlayer) : [];
  }
  const errors = [range, live].filter((result) => result.status === 'rejected').map((result) => result.reason.message);
  return { source: 'Sportmonks Football API', updatedAt: new Date().toISOString(), gender, competitions, fixtures: (selected ? records.filter((item) => String(item.fixture.league.id) === String(selected.id)) : records).map((item) => item.fixture).sort((a, b) => a.timestamp - b.timestamp), standings, players, errors };
}

async function match(id) {
  const [record] = await provider(`/fixtures/${encodeURIComponent(id)}?include=participants;league;venue;state;scores;events;statistics;lineups;metadata`, 20_000);
  if (!record) return null;
  let prediction = null;
  if (process.env.SPORTMONKS_PREDICTIONS_ENABLED === 'true') {
    try {
      const probabilities = await provider(`/predictions/probabilities/fixtures/${encodeURIComponent(id)}?include=type`, 120_000);
      const result = probabilities.find((item) => item.type?.code === 'fulltime-result-probability' || item.type?.name === 'Fulltime Result Probability');
      if (result?.predictions) prediction = { home: result.predictions.home, draw: result.predictions.draw, away: result.predictions.away, confidence: 'Sportmonks model probability' };
    } catch (_) { /* Predictions are an optional provider add-on. */ }
  }
  return { fixture: normalizeFixture(record), events: record.events || [], statistics: record.statistics || [], lineups: record.lineups || [], prediction, updatedAt: new Date().toISOString(), source: 'Sportmonks Football API' };
}

exports.handler = async (event) => {
  const route = event.path.replace(/^\/.netlify\/functions\/api/, '') || '/';
  const query = new URLSearchParams(event.rawQuery || '');
  try {
    if (route === '/dashboard') return response(200, await dashboard(query));
    if (route.startsWith('/match/')) {
      const data = await match(route.slice('/match/'.length));
      return data ? response(200, data) : response(404, { error: 'No data available.' });
    }
    if (route === '/health') return response(200, { configured: Boolean(process.env.SPORTMONKS_API_TOKEN), source: 'Sportmonks Football API' });
    return response(404, { error: 'No data available.' });
  } catch (error) {
    return response(503, { error: 'No data available.', detail: error.message });
  }
};
