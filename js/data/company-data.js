// js/data/company-data.js
// export a single function: fetchCompanyData(letterOrUrl)
// Returns: Promise<Array<{ title: string, rows: Array<{title,link}> }>>

/* eslint-disable no-console */

/**
 * Detect GitHub Pages repo base path
 * - https://username.github.io/repo/...  -> /repo
 * - custom domain or localhost          -> ''
 */
function getBasePath() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  // if hosted on github.io with repo name
  if (window.location.hostname.endsWith('github.io') && parts.length > 0) {
    return `/${parts[0]}`;
  }
  return '';
}

const BASE_PATH = getBasePath();

/**
 * Fetch and parse company data
 * @param {string} input Either:
 *   - 'A' (letter)
 *   - 'A.txt'
 *   - full/relative URL
 */
export async function fetchCompanyData(input = 'A') {
  let txtUrl = input;

  // Normalize input
  if (typeof input === 'string' && !input.includes('.txt')) {
    txtUrl = `${BASE_PATH}/js/data/${input}.txt`;
  } else if (typeof input === 'string' && !input.startsWith('http')) {
    txtUrl = input.startsWith('/')
      ? `${BASE_PATH}${input}`
      : `${BASE_PATH}/js/data/${input}`;
  }

  // ------------------------
  // Fetch text file
  // ------------------------
  const res = await fetch(txtUrl, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${txtUrl}: ${res.status} ${res.statusText}`);
  }

  const txt = await res.text();

  // Normalize line endings
  const normalized = txt.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split into sections (blank lines)
  const rawSections = normalized
    .split(/\n{2,}/g)
    .map(s => s.trim())
    .filter(Boolean);

  const urlRe = /https?:\/\/[^\s)"]+/gi;
  const companies = [];

  // ------------------------
  // Helpers
  // ------------------------
  function parseRowsFromSectionText(sectionText) {
    const lines = sectionText.split('\n').map(l => l.trim()).filter(Boolean);
    const rows = [];

    for (const line of lines) {
      if (!line.match(urlRe)) continue;

      const urls = Array.from(line.matchAll(urlRe)).map(m => m[0]);

      let title = line.replace(urlRe, '').trim();
      title = title.replace(/^[\-\•\*\s]+/, '').trim();
      const left = title.split(/[-|—:]+/)[0].trim();
      const finalTitle = left || title || urls[0];

      for (const u of urls) {
        rows.push({ title: finalTitle, link: u });
      }
    }

    return rows;
  }

  // ------------------------
  // Main parsing
  // ------------------------
  for (const sec of rawSections) {
    const lines = sec.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    let companyTitle = lines[0];

    if (companyTitle.match(urlRe)) {
      companyTitle = 'Unknown';
    } else {
      const m = companyTitle.match(/^(.{1,80}?)(?:[:\-–—]\s*.*)?$/);
      if (m && m[1]) companyTitle = m[1].trim();
    }

    const rows = parseRowsFromSectionText(sec);

    companies.push({
      title: companyTitle || 'Unknown',
      rows
    });
  }

  // ------------------------
  // Fallback parser (line-by-line)
  // ------------------------
  if (!companies.length || companies.every(c => c.rows.length === 0)) {
    const byCompany = new Map();
    const allLines = normalized.split('\n').map(l => l.trim()).filter(Boolean);

    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      const urls = Array.from(line.matchAll(urlRe)).map(m => m[0]);
      if (!urls.length) continue;

      let company = 'Unknown';
      let rest = line;

      const m = line.match(/^([A-Z0-9][^:\-]{1,60})[:\-\—]\s*(.*)/i);
      if (m) {
        company = m[1].trim();
        rest = m[2];
      } else if (i > 0 && !allLines[i - 1].match(urlRe)) {
        company = allLines[i - 1];
      }

      const title = rest
        .replace(urlRe, '')
        .replace(/^[\-\•\*\s]+/, '')
        .split(/[-|—:]+/)[0]
        .trim() || urls[0];

      if (!byCompany.has(company)) byCompany.set(company, []);
      byCompany.get(company).push({ title, link: urls[0] });
    }

    return Array.from(byCompany.entries()).map(([title, rows]) => ({ title, rows }));
  }

  return companies;
}
