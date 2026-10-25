import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CrmApp } from '@/components/crm/crm-app';
import '../app/globals.css';
import './theme.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing demo root.');

createRoot(root).render(
  <StrictMode>
    <CrmApp />
  </StrictMode>,
);
