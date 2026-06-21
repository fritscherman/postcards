import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import App from './App';
import { PostcardProvider } from './store/PostcardStore';
import { AuthProvider } from './auth/AuthContext';
import { InstallProvider } from './components/InstallContext';
import { FeedbackProvider } from './components/Feedback';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <FeedbackProvider>
        <AuthProvider>
          <PostcardProvider>
            <InstallProvider>
              <App />
            </InstallProvider>
          </PostcardProvider>
        </AuthProvider>
      </FeedbackProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
