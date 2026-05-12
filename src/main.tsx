import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './i18n';
import './styles/global.css';

const tree = (
  <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
    <App />
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  import.meta.env.DEV ? <React.StrictMode>{tree}</React.StrictMode> : tree,
);
