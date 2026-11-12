/** Lightweight transport activity tracker for requests outside TanStack Query.
 * Never stores tokens, response bodies, or other sensitive data.
 */
let pending = 0;
const listeners = new Set<() => void>();
export function subscribeAppRequests(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function getPendingAppRequests() { return pending; }
function notify() { listeners.forEach(listener => listener()); }
export function trackAppRequest(): () => void {
  pending += 1;
  notify();
  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    pending = Math.max(0, pending - 1);
    notify();
  };
}
