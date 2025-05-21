import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Mount the main app into the root div (defined in public/index.html)
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
