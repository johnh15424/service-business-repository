// Provider-neutral conversion hook for the free dog-grooming checklist.
// No cookies, personal data or network requests are created here.
function trackLeadMagnetClick(link) {
  const detail = {
    event: 'free_checklist_clicked',
    funnel: 'dog_grooming',
    placement: link.dataset.freeCta || 'unknown'
  };
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(detail);
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent('funnel:conversion', { detail }));
  } catch {}
}

document.querySelectorAll('[data-free-cta]').forEach(link => {
  link.addEventListener('click', () => trackLeadMagnetClick(link));
});
