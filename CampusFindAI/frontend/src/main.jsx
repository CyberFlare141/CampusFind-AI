import React from 'react';
import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import App from './App';
import AppErrorBoundary from './components/AppErrorBoundary';
import './styles.css';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <AppErrorBoundary><App /></AppErrorBoundary>
    </MotionConfig>
  </React.StrictMode>
);
