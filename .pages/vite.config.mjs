import { fileURLToPath } from 'node:url';
import base from '../frontend/vite.pages.config.ts';

const sourceCommit = 'bddb6aae02e935a9fcea431c699c59c4793d398e';
const release = process.env.KIDSFIT_PAGES_RELEASE || sourceCommit;
if (!/^[a-f0-9]{40}$/.test(release)) throw new Error('A full release SHA is required.');
const loginFile = fileURLToPath(new URL('../frontend/src/screens/Auth/Login/LoginPage.tsx', import.meta.url));
const adapter = fileURLToPath(new URL('./DemoAccess.jsx', import.meta.url));

// Compare only same-origin HTML, with a fresh URL and no stored response. Never
// redirect to a server-supplied address, or loop while different CDN edges update.
const freshnessCheck = `(() => {
  const current = document.querySelector('meta[name="kidsfit-release"]')?.content;
  if (!current) return;
  async function check() {
    try {
      const url = new URL('./', location.href);
      url.searchParams.set('_fresh', String(Date.now()));
      const response = await fetch(url, {cache:'no-store', credentials:'omit', redirect:'error', signal:AbortSignal.timeout(5000)});
      if (!response.ok) return;
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const next = doc.querySelector('meta[name="kidsfit-release"]')?.content;
      const target = new URL(location.href);
      if (!/^[a-f0-9]{40}$/.test(next || '') || next === current || target.searchParams.get('_release') === next) return;
      target.searchParams.set('_release', next);
      location.replace(target.href);
    } catch { /* Offline checks must not prevent using the app. */ }
  }
  check();
  addEventListener('pageshow', event => {if (event.persisted) check();});
  addEventListener('focus', check);
  setInterval(check, 60000);
})();`;

export default {
  ...base,
  resolve: {
    ...base.resolve,
    dedupe: ['react', 'react-dom'],
    alias: {
      '@/components/crm/demo-access': adapter,
      ...base.resolve.alias,
    },
  },
  plugins: [
    ...base.plugins,
    {
      name: 'public-login-presentation',
      enforce: 'pre',
      transform(code, id) {
        if (id.split('?')[0] !== loginFile) return;
        const email = 'defaultValue="admin@kidsfit.vn"';
        const password = "defaultValue={developmentDemo ? 'Kidsfit@2026' : ''}";
        if (code.split(email).length !== 2 || code.split(password).length !== 2)
          throw new Error('Login presentation changed; review the release adapter before publishing.');
        // Build-only substitutions reuse PUBLIC fixture defaults. No source file
        // is edited and no real API login/password is shipped to the public page.
        return {
          code: "import { demoAccounts, demoLoginEmail, DEMO_PASSWORD } from '@/lib/demo-auth';\n" +
            code.replace(email, 'defaultValue={demoLoginEmail(demoAccounts[0])}')
              .replace(password, 'defaultValue={DEMO_PASSWORD}'),
          map: null,
        };
      },
      transformIndexHtml() {
        return [
          {tag: 'meta', attrs: {name: 'kidsfit-release', content: release}, injectTo: 'head'},
          {tag: 'meta', attrs: {name: 'kidsfit-source', content: sourceCommit}, injectTo: 'head'},
          {tag: 'meta', attrs: {'http-equiv': 'Cache-Control', content: 'no-store, no-cache, must-revalidate'}, injectTo: 'head'},
          {tag: 'script', children: freshnessCheck, injectTo: 'head'},
        ];
      },
    },
  ],
};
