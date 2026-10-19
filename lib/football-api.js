const API_URL = 'https://v3.football.api-sports.io';
const cache = new Map();
const COMPETITIONS = [
  { id: 39, name: 'Premier League', country: 'England', type: 'League', gender: 'men' }, { id: 140, name: 'La Liga', country: 'Spain', type: 'League', gender: 'men' }, { id: 135, name: 'Serie A', country: 'Italy', type: 'League', gender: 'men' }, { id: 78, name: 'Bundesliga', country: 'Germany', type: 'League', gender: 'men' }, { id: 61, name: 'Ligue 1', country: 'France', type: 'League', gender: 'men' }, { id: 2, name: 'Champions League', country: 'Europe', type: 'Cup', gender: 'men' }, { id: 3, name: 'Europa League', country: 'Europe', type: 'Cup', gender: 'men' }, { id: 253, name: 'Major League Soccer', country: 'USA', type: 'League', gender: 'men' }, { id: 307, name: 'Saudi Pro League', country: 'Saudi Arabia', type: 'League', gender: 'men' },
  { search: "Women's Champions League", name: "Women's Champions League", country: 'Europe', type: 'Cup', gender: 'women' }, { search: "Women's Super League", name: "Women's Super League", country: 'England', type: 'League', gender: 'women' }, { search: 'Liga F', name: 'Liga F', country: 'Spain', type: 'League', gender: 'women' }, { search: 'Frauen Bundesliga', name: 'Frauen-Bundesliga', country: 'Germany', type: 'League', gender: 'women' }, { search: 'NWSL', name: 'NWSL', country: 'USA', type: 'League', gender: 'women' },
];

function noData(message) { const error = new Error(message); error.code = 'no_data'; return error; }
function season() { const now = new Date(); return now.getUTCMonth() < 6 ? now.getUTCFullYear() - 1 : now.getUTCFullYear(); }
function day(value) { return value.toISOString().slice(0, 10); }

async function request(endpoint, ttl = 60_000) {
  if (!process.env.API_FOOTBALL_KEY) throw noData('API-Football is not configured.');
  const cached = cache.get(endpoint);
  if (cached?.expires > Date.now()) return cached.value;
  const result = await fetch(`${API_URL}${endpoint}`, { headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY } });
  if (!result.ok) throw noData(`API-Football returned ${result.status}.`);
  const body = await result.json();
  if (body.errors && Object.keys(body.errors).length) throw noData(Object.values(body.errors).join(' '));
  const value = body.response || [];
  cache.set(endpoint, { value, expires: Date.now() + ttl });
  return value;
}

async function resolveCompetition(item) {
  if (item.id) return item;
  const matches = await request(`/leagues?search=${encodeURIComponent(item.search)}`, 86_400_000);
  const match = matches.find((entry) => entry.league?.type === item.type && entry.country?.name === item.country) || matches.find((entry) => entry.league?.type === item.type);
  if (!match) throw noData(`No provider record found for ${item.name}.`);
  return { ...item, id: match.league.id, name: match.league.name, country: match.country.name };
}

function normalizedFixture(item) {
  const code = item.fixture?.status?.short || '';
  const live = ['1H', '2H', 'HT', 'ET', 'BT', 'P'].includes(code);
  const finished = ['FT', 'AET', 'PEN'].includes(code);
  const league = item.league || {};
  return { id: String(item.fixture.id), date: item.fixture.date, timestamp: item.fixture.timestamp, status: finished ? 'finished' : live ? 'live' : 'scheduled', minute: item.fixture.status?.elapsed ?? null, statusLabel: item.fixture.status?.long || 'Scheduled', venue: item.fixture.venue?.name || 'Venue unavailable', league: { id: league.id, name: league.name, country: league.country, logo: league.logo || '', type: league.type }, home: { id: item.teams?.home?.id, name: item.teams?.home?.name || 'Home', logo: item.teams?.home?.logo || '', score: item.goals?.home ?? null }, away: { id: item.teams?.away?.id, name: item.teams?.away?.name || 'Away', logo: item.teams?.away?.logo || '', score: item.goals?.away ?? null } };
}

function normalizedStanding(entry) { const all = entry.all || {}; return { rank: entry.rank, team: { id: entry.team?.id, name: entry.team?.name || 'Team', logo: entry.team?.logo || '' }, played: all.played ?? null, wins: all.win ?? null, draws: all.draw ?? null, losses: all.lose ?? null, goalsFor: all.goals?.for ?? null, goalsAgainst: all.goals?.against ?? null, goalDifference: entry.goalsDiff ?? null, points: entry.points ?? null, form: entry.form || '', home: entry.home || null, away: entry.away || null }; }
function normalizedPlayer(item) { const player = item.player || {}; const stats = item.statistics?.[0] || {}; return { id: player.id, name: player.name || 'Player', photo: player.photo || '', team: stats.team?.name || 'Team unavailable', teamLogo: stats.team?.logo || '', position: stats.games?.position || 'Player', appearances: stats.games?.appearences ?? null, minutes: stats.games?.minutes ?? null, goals: stats.goals?.total ?? null, penalties: stats.penalty?.scored ?? null, assists: stats.goals?.assists ?? null, keyPasses: stats.passes?.key ?? null }; }

async function competitionData(competition, currentSeason) {
  const [fixtures, standings, scorers] = await Promise.allSettled([
    request(`/fixtures?league=${competition.id}&season=${currentSeason}&from=${competition.from}&to=${competition.to}`, 30_000),
    request(`/standings?league=${competition.id}&season=${currentSeason}`, 120_000),
    request(`/players/topscorers?league=${competition.id}&season=${currentSeason}`, 120_000),
  ]);
  return { fixtures: fixtures.status === 'fulfilled' ? fixtures.value : [], standings: standings.status === 'fulfilled' ? (standings.value[0]?.league?.standings?.[0] || []).map(normalizedStanding) : [], players: scorers.status === 'fulfilled' ? scorers.value.map(normalizedPlayer) : [], errors: [fixtures, standings, scorers].filter((result) => result.status === 'rejected').map((result) => result.reason.message) };
}

async function dashboard(params) {
  const gender = params.get('gender') === 'women' ? 'women' : 'men';
  const now = new Date(); const from = new Date(now); from.setUTCDate(now.getUTCDate() - 7); const to = new Date(now); to.setUTCDate(now.getUTCDate() + 7);
  const configured = COMPETITIONS.filter((item) => item.gender === gender).map((item) => ({ ...item, from: day(from), to: day(to) }));
  const resolved = await Promise.allSettled(configured.map(resolveCompetition));
  const available = resolved.filter((result) => result.status === 'fulfilled').map((result) => result.value);
  const selectedId = params.get('league'); const requested = selectedId ? available.filter((item) => String(item.id) === String(selectedId)) : available;
  const results = await Promise.allSettled(requested.map((item) => competitionData(item, season()))); const valid = results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
  const competitions = available.map(({ from: _from, to: _to, ...item }) => item);
  return { source: 'API-Football', updatedAt: new Date().toISOString(), gender, competitions, fixtures: valid.flatMap((item) => item.fixtures.map(normalizedFixture)).sort((a, b) => a.timestamp - b.timestamp), standings: valid.flatMap((item) => item.standings), players: valid.flatMap((item) => item.players), errors: [...resolved.filter((result) => result.status === 'rejected').map((result) => result.reason.message), ...valid.flatMap((item) => item.errors)] };
}

function normalizedPrediction(item) { const prediction = item.predictions; const percent = prediction?.percent; return percent ? { home: Number.parseFloat(percent.home), draw: Number.parseFloat(percent.draw), away: Number.parseFloat(percent.away), confidence: prediction.advice || 'API-Football prediction' } : null; }
async function match(id) {
  const base = await request(`/fixtures?id=${encodeURIComponent(id)}`, 20_000); if (!base[0]) return null;
  const [events, statistics, lineups, predictions] = await Promise.allSettled([request(`/fixtures/events?fixture=${id}`, 20_000), request(`/fixtures/statistics?fixture=${id}`, 20_000), request(`/fixtures/lineups?fixture=${id}`, 20_000), request(`/predictions?fixture=${id}`, 120_000)]);
  return { fixture: normalizedFixture(base[0]), events: events.status === 'fulfilled' ? events.value : [], statistics: statistics.status === 'fulfilled' ? statistics.value : [], lineups: lineups.status === 'fulfilled' ? lineups.value : [], prediction: predictions.status === 'fulfilled' ? normalizedPrediction(predictions.value[0]) : null, updatedAt: new Date().toISOString(), source: 'API-Football' };
}

module.exports = { dashboard, match, configured: () => Boolean(process.env.API_FOOTBALL_KEY) };
