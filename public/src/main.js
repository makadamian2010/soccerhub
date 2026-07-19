import { React, ReactDOM, html } from './lib/deps.js';
import { App } from './App.js';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(html`<${React.StrictMode}><${App} /><//>`);
