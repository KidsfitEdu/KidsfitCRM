import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DemoCrmApp } from './demo-crm-app';
import '../src/app/globals.css';
import './theme.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing demo root.');

createRoot(root).render(
  <StrictMode>
    <DemoCrmApp />
  </StrictMode>,
);
