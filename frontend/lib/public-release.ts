type ReleaseFetcher = (
  url: string,
  options: RequestInit,
) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

export async function publicReleaseRedirect({
  currentUrl,
  manifestUrl,
  currentVersion,
  fetchRelease = fetch,
}: {
  currentUrl: string;
  manifestUrl: string;
  currentVersion: string;
  fetchRelease?: ReleaseFetcher;
}): Promise<string | null> {
  if (!/^[a-f0-9]{40}$/.test(currentVersion)) return null;
  try {
    const page = new URL(currentUrl);
    const manifest = new URL(manifestUrl, page);
    if (manifest.origin !== page.origin) return null;
    // Bypass both browser cache and a previously cached CDN manifest URL.
    manifest.searchParams.set('_fresh', String(Date.now()));
    const response = await fetchRelease(manifest.href, {
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('version' in payload)
    )
      return null;
    const latest = payload.version;
    if (typeof latest !== 'string' || !/^[a-f0-9]{40}$/.test(latest))
      return null;
    if (
      latest === currentVersion ||
      page.searchParams.get('_release') === latest
    )
      return null;
    // The destination always remains the current page, never a manifest-supplied URL.
    page.searchParams.set('_release', latest);
    return page.href;
  } catch {
    // A slow/offline version check must not make the existing app unavailable.
    return null;
  }
}
