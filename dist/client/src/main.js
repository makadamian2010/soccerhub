import { BrowserRouter, QueryClient, QueryClientProvider, React, ReactDOM, html } from './lib/deps.js';
import { App } from './App.js';

const root = ReactDOM.createRoot(document.getElementById('root'));
const queryClient = new QueryClient();
root.render(html`<${React.StrictMode}><${QueryClientProvider} client=${queryClient}><${BrowserRouter}><${App} /><//><//><//>`);
