import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CrmApp } from '@/components/crm/crm-app';
import { publicReleaseRedirect } from '@/lib/public-release';
import '../app/globals.css';
import './theme.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing demo root.');

async function start() {
  const redirect = await publicReleaseRedirect({
    currentUrl: window.location.href,
    manifestUrl: new URL('/KidsfitCRM/version.json', window.location.origin)
      .href,
    currentVersion: __KIDSFIT_PUBLIC_RELEASE__,
  });
  if (redirect) {
    window.location.replace(redirect);
    return;
  }
  createRoot(root!).render(
    <StrictMode>
      <CrmApp />
    </StrictMode>,
  );
}

void start();
