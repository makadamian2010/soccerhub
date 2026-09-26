import { React, Target, html, motion } from '../lib/deps.js';
import { cn } from '../lib/cn.js';

function predictionKey(matchId) {
  return `scorehub-prediction-${matchId}`;
}

export function PredictionPanel({ match }) {
  const [pick, setPick] = React.useState(() => window.localStorage.getItem(predictionKey(match.id)) || '');
  const [submitted, setSubmitted] = React.useState(Boolean(pick));
  const choices = [
    { id: 'home', label: match.home_team },
    { id: 'draw', label: 'Draw' },
    { id: 'away', label: match.away_team }
  ];
  const canPredict = match.status === 'scheduled' || match.status === 'live' || match.status === 'halftime';

  function choose(id) {
    setPick(id);
    setSubmitted(false);
  }

  function save() {
    if (!pick) return;
    window.localStorage.setItem(predictionKey(match.id), pick);
    setSubmitted(true);
  }

  if (!canPredict) return null;

  return html`
    <${motion.section}
      initial=${{ opacity: 0, y: 12 }}
      animate=${{ opacity: 1, y: 0 }}
      className="mt-6 overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
          <${Target} className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display text-lg font-black text-white">Make your prediction</h2>
          <p className="mt-1 text-sm text-gray-400">Who do you think will win this match?</p>
        </div>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        ${choices.map((choice) => html`
          <button
            key=${choice.id}
            type="button"
            onClick=${() => choose(choice.id)}
            className=${cn(
              'rounded-xl border px-3 py-3 text-sm font-bold transition',
              pick === choice.id ? 'border-emerald-400 bg-emerald-500 text-white shadow-glow' : 'border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/[0.07] hover:text-white'
            )}
          >
            ${choice.label}
          </button>
        `)}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled=${!pick}
          onClick=${save}
          className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ${submitted ? 'Prediction saved' : 'Save prediction'}
        </button>
        ${submitted && html`<span className="text-sm font-medium text-emerald-400">Your pick is saved on this device.</span>`}
      </div>
    <//>
  `;
}
