// ═══ Agrivision Ad Loader ═══
// Loads ads from backend API. Zones hidden by default, shown only on success.
const AD_API = '/api/v1/ads/serve';
const AD_TIMEOUT = 3000;

async function loadAd(slotId, containerId, contentId) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AD_TIMEOUT);
    const res = await fetch(`${AD_API}/${slotId}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return;
    const ad = await res.json();
    if (ad && ad.html) {
      document.getElementById(contentId).innerHTML = ad.html;
      document.getElementById(containerId).style.display = 'block';
      // Track impression
      if (ad.id) fetch(`/api/v1/ads/${ad.id}/impression`, { method:'POST' }).catch(()=>{});
    }
  } catch(e) { /* Ad failed to load — zone stays hidden */ }
}

document.addEventListener('DOMContentLoaded', () => {
  loadAd('top-banner', 'adZoneTop', 'adContentTop');
  loadAd('mid-page', 'adZoneMid', 'adContentMid');
});
