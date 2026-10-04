// Progressive enhancement for /calculators/.
//
// Every calculator card is already in the static HTML. This script only toggles visibility on
// cards that exist; it never creates, fetches, reorders or removes them.
//
// The controls container ships empty and hidden. The search field and the category chips are
// both injected here and the container is revealed only once they are wired, so a visitor
// without JavaScript sees the complete static directory and no dead filter controls.
const grid = document.querySelector('[data-directory-grid]');
const controls = document.querySelector('[data-directory-controls]');
const empty = document.querySelector('[data-directory-empty]');

// Analytics only. Matches the event shape used by lead-magnet.js, which is the convention that
// goes with the data-funnel / data-paid-cta attributes these cards carry:
//   { event, funnel, placement } pushed to window.dataLayer and dispatched as funnel:conversion
// The directory is self-contained, so this binds its own listener rather than loading
// lead-magnet.js. It never alters links, markup or funnel order.
function trackPaidClick(link) {
  const card = link.closest('.directory-card');
  const detail = {
    event: 'paid_cta_clicked',
    funnel: (card && card.dataset.niche) || link.dataset.funnel || 'unknown',
    placement: link.dataset.paidCta || 'directory-card'
  };
  try { window.dataLayer = window.dataLayer || []; window.dataLayer.push(detail); } catch {}
  try { window.dispatchEvent(new CustomEvent('funnel:conversion', { detail })); } catch {}
}

if (grid) {
  // Delegated, so it survives cards being hidden and shown by the filter.
  grid.addEventListener('click', event => {
    const link = event.target.closest('[data-paid-cta="directory-card"]');
    if (link && grid.contains(link)) trackPaidClick(link);
  });
}

if (grid && controls) {
  const cards = [...grid.querySelectorAll('.directory-card')];
  const categories = [...new Set(cards.map(card => card.dataset.category).filter(Boolean))];

  const search = document.createElement('input');
  search.type = 'search';
  search.className = 'directory-search';
  search.id = 'directory-search';
  search.placeholder = 'Search by trade, for example window cleaning';
  search.autocomplete = 'off';
  const label = document.createElement('label');
  label.className = 'directory-search-label';
  label.htmlFor = 'directory-search';
  label.textContent = 'Search calculators';
  const field = document.createElement('div');
  field.className = 'directory-search-field';
  field.append(label, search);

  const chipRow = document.createElement('div');
  chipRow.className = 'directory-chips';
  const chip = (value, text, active) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = active ? 'directory-chip is-active' : 'directory-chip';
    button.dataset.filter = value;
    button.setAttribute('aria-pressed', String(active));
    button.textContent = text;
    return button;
  };
  chipRow.append(chip('all', 'All', true));
  for (const category of categories) chipRow.append(chip(category, category, false));

  const count = document.createElement('p');
  count.className = 'directory-count micro';
  count.setAttribute('role', 'status');
  count.setAttribute('aria-live', 'polite');

  controls.append(field, chipRow, count);

  let activeCategory = 'all';

  function apply() {
    const term = search.value.trim().toLowerCase();
    let visible = 0;
    for (const card of cards) {
      const matchesCategory = activeCategory === 'all' || card.dataset.category === activeCategory;
      const matchesTerm = !term
        || card.dataset.name.includes(term)
        || card.textContent.toLowerCase().includes(term);
      const show = matchesCategory && matchesTerm;
      card.hidden = !show;
      if (show) visible += 1;
    }
    if (empty) empty.hidden = visible !== 0;
    count.textContent = visible === cards.length
      ? `Showing all ${cards.length} calculators`
      : `Showing ${visible} of ${cards.length} calculators`;
  }

  search.addEventListener('input', apply);
  chipRow.addEventListener('click', event => {
    const button = event.target.closest('.directory-chip');
    if (!button) return;
    activeCategory = button.dataset.filter;
    for (const other of chipRow.querySelectorAll('.directory-chip')) {
      const isActive = other === button;
      other.classList.toggle('is-active', isActive);
      other.setAttribute('aria-pressed', String(isActive));
    }
    apply();
  });

  apply();
  controls.hidden = false;
}
