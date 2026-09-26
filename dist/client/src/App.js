import { Navigate, Route, Routes, html } from './lib/deps.js';
import { Layout } from './components/Layout.js';
import { createPageUrl } from './lib/routes.js';
import { HomePage } from './pages/HomePage.js';
import { MatchDetailsPage } from './pages/MatchDetailsPage.js';
import { StandingsPage } from './pages/StandingsPage.js';
import { TopScorersPage } from './pages/TopScorersPage.js';

export function App() {
  return html`<${Layout}><${Routes}>
    <${Route} path="/" element=${html`<${Navigate} to=${createPageUrl('Home')} replace=${true} />`} />
    <${Route} path=${createPageUrl('Home')} element=${html`<${HomePage} />`} />
    <${Route} path=${createPageUrl('Standings')} element=${html`<${StandingsPage} />`} />
    <${Route} path=${createPageUrl('TopScorers')} element=${html`<${TopScorersPage} />`} />
    <${Route} path=${createPageUrl('MatchDetails')} element=${html`<${MatchDetailsPage} />`} />
  <//><//>`;
}
