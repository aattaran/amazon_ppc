/* API configuration — persisted in localStorage */
const API_BASE = (() => {
  const stored = localStorage.getItem('ppc_api_base');
  return stored || 'https://amazonppc-production.up.railway.app';
})();

function setApiBase(url) {
  localStorage.setItem('ppc_api_base', url.replace(/\/$/, ''));
  location.reload();
}

async function checkApiConnection() {
  try {
    const r = await fetch(API_BASE + '/health', { signal: AbortSignal.timeout(3000) });
    return r.ok;
  } catch {
    return false;
  }
}
