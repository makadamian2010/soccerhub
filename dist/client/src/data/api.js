export async function fetchJson(url) {
  const response = await fetch(url);
  const type = response.headers.get('content-type') || '';
  const body = type.includes('application/json') ? await response.json() : null;
  if (!response.ok || !body) throw new Error(body?.error || 'No data available.');
  return body;
}

export function getLeagues() {
  return fetchJson('/api/leagues');
}

export function getMatches(league) {
  const query = league ? `?league=${encodeURIComponent(league)}` : '';
  return fetchJson(`/api/matches${query}`);
}

export function getPlayers(league) {
  const query = league ? `?league=${encodeURIComponent(league)}` : '';
  return fetchJson(`/api/players${query}`);
}

export function getMatch(id) {
  return fetchJson(`/api/matches/${id}`);
}
