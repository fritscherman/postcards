import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import App from './App';
import { PostcardProvider } from './store/PostcardStore';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <PostcardProvider>
        <App />
      </PostcardProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
