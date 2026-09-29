'use strict';
const form = document.getElementById('article-search');
if (form) {
  const input = document.getElementById('query');
  const status = document.getElementById('search-status');
  const results = document.getElementById('search-results');
  const scriptUrl = document.currentScript?.src || Array.from(document.scripts).find(s => s.src.endsWith('/editorial.js')).src;
  const base = new URL('.', scriptUrl);
  let docsPromise;
  const normalize = s => s.toLocaleLowerCase('de').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss');
  let revision = 0;
  async function search() {
    const current = ++revision;
    const query = input.value.trim();
    const terms = normalize(query).split(/\s+/).filter(t => t.length > 1);
    results.replaceChildren();
    const address = new URL(location.href);
    if (query) address.searchParams.set('q', query); else address.searchParams.delete('q');
    history.replaceState(null, '', address);
    if (!terms.length) { status.textContent = 'Bitte einen Suchbegriff mit mindestens zwei Zeichen eingeben.'; return; }
    status.textContent = 'Artikel werden durchsucht …';
    try {
      docsPromise ||= fetch(new URL('search-index.json', base)).then(r => { if (!r.ok) throw Error('Search index unavailable'); return r.json(); });
      const docs = await docsPromise;
      if (current !== revision) return;
      const hits = docs.map(d => {
        const title = normalize(d.title), authors = normalize(d.authors), text = normalize(d.text);
        return {d, matches: terms.every(t => (title + ' ' + authors + ' ' + text).includes(t)),
          score: terms.reduce((s, t) => s + (title.includes(t) ? 8 : 0) + (authors.includes(t) ? 6 : 0) + (text.includes(t) ? 1 : 0), 0)};
      }).filter(h => h.matches).sort((a, b) => b.score - a.score || a.d.title.localeCompare(b.d.title, 'de'));
      status.textContent = `${hits.length} Artikel gefunden für „${query}“.`;
      for (const {d} of hits) {
        const section = document.createElement('section'); section.className = 'search-hit';
        const meta = document.createElement('small'); meta.textContent = d.kind + (d.authors ? ' · ' + d.authors : '');
        const heading = document.createElement('h2'), link = document.createElement('a'); link.href = d.url; link.textContent = d.title; heading.append(link);
        const description = document.createElement('p'); description.textContent = d.description;
        section.append(meta, heading, description); results.append(section);
      }
    } catch (error) {
      docsPromise = null;
      status.textContent = 'Die Suche konnte nicht geladen werden. Die Literaturübersicht bleibt erreichbar.';
    }
  }
  form.addEventListener('submit', event => { event.preventDefault(); search(); });
  input.value = new URLSearchParams(location.search).get('q') || '';
  if (input.value) search(); else status.textContent = 'Die Suche umfasst die Einzelartikel, Themen und den Bericht.';
}
