import React from 'react';
import ReactDOM from 'react-dom/client';
import EmailVerification from './pages/email-verification';
import './index.css';

// This is a completely separate entry point for the email verification page
// It doesn't include any auth-related components or contexts
// To be used directly from app.moogship.com/verify-email/TOKEN

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <EmailVerification />
  </React.StrictMode>
);