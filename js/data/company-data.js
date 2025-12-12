// js/data/company-data.js
// export a single function: fetchCompanyData(txtUrl)
// Returns: Promise<Array<{ title: string, rows: Array<{title,link}> }>>

/* eslint-disable no-console */
export async function fetchCompanyData(txtUrl = '../js/data/A.txt') {
  // fetch text file
  const res = await fetch(txtUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${txtUrl}: ${res.status} ${res.statusText}`);
  const txt = await res.text();

  // Normalize line endings
  const normalized = txt.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Heuristics to split into company sections:
  // - If file already looks like "CompanyName:" markers, split on blank lines OR "CompanyName:" lines
  // - Otherwise try to split on blank lines (two newlines)
  // We'll produce an array of sections where first non-empty line is company title.
  const rawSections = normalized
    .split(/\n{2,}/g) // split on 2+ newlines (blank lines) as first choice
    .map(s => s.trim())
    .filter(Boolean);

  // Helper: find URLs in a string
  const urlRe = /https?:\/\/[^\s)"]+/gi;

  // Try to detect company blocks more wisely: if there are sections but the first section contains many different companies
  // we'll fallback to a fallback simple parser (all lines that look like "Company - url" or "Company: url")
  const sections = [];
  rawSections.forEach(section => {
    // If the section is short and contains a line like "CompanyName:" or starts with something uppercase followed by '-', treat as block
    const lines = section.split('\n').map(l => l.trim()).filter(Boolean);

    // if the section itself contains multiple top-level company markers (like "Company:") -> split by those markers
    if (lines.length > 1 && lines.every(l => l.match(/^[^\s].{0,80}$/))) {
      // keep as-is (company block)
      sections.push(lines.join('\n'));
    } else {
      sections.push(section);
    }
  });

  // Final parse result
  const companies = [];

  // Utility: parse lines inside a section and extract list of {title,link}
  function parseRowsFromSectionText(sectionText) {
    const lines = sectionText.split('\n').map(l => l.trim()).filter(Boolean);

    const rows = [];

    for (const line of lines) {
      // If line itself looks like a "Company title" (no url) skip for rows
      if (!line.match(urlRe)) {
        // some lines include "CompanyName" only (will be used as title)
        continue;
      }

      // extract urls
      const urls = Array.from(line.matchAll(urlRe)).map(m => m[0]);

      // title heuristics:
      // - If line contains " - " before the url, take text before url or before "-" as title.
      // - If line contains '|' or '—' or ':' before url, use left side
      // - else use the URL's pathname or the whole URL as title
      let title = line;
      // remove urls from title candidate
      title = title.replace(urlRe, '').trim();
      // remove leading bullets like '-' or '•'
      title = title.replace(/^[\-\•\*\s]+/, '').trim();

      // if it still long and contains separators, split
      const left = title.split(/[-|—:]+/)[0].trim();
      const chosenTitle = left || title || urls[0] || '';

      // for each URL found on the line, add a row
      for (const u of urls) {
        rows.push({ title: chosenTitle || u, link: u });
      }
    }

    return rows;
  }

  // Try parsing sections as: first line is company, rest are lines with links
  for (const sec of sections) {
    const lines = sec.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    // determine company title: prefer a single-line that looks like company (no URL)
    let companyTitle = lines[0];
    if (companyTitle.match(urlRe) && lines.length > 1) {
      // first line contains a url -> fallback: attempt to infer company from previous line(s)
      // In that case we'll set title to "Unknown" and parse rows from whole section
      companyTitle = 'Unknown';
    } else {
      // if first line looks like "Company: something" or "Company - something", use first chunk left of ':' or '-' as company
      const m = companyTitle.match(/^(.{1,80}?)(?:[:\-–—]\s*.*)?$/);
      if (m && m[1]) companyTitle = m[1].trim();
    }

    // Gather rows from entire section (not only from lines[1..]) to be robust
    const rows = parseRowsFromSectionText(sec);

    companies.push({
      title: companyTitle || 'Unknown',
      rows
    });
  }

  // If we parsed nothing, try line-by-line scan: lines that contain a URL -> group by prefix "Company" if present
  if (!companies.length || companies.every(c => c.rows.length === 0)) {
    const byCompany = new Map();
    const allLines = normalized.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of allLines) {
      const urls = Array.from(line.matchAll(urlRe)).map(m => m[0]);
      if (!urls.length) continue;
      // try to see if line starts with "CompanyName - " or "CompanyName:" pattern
      const prefixMatch = line.match(/^([A-Z0-9][^:\-]{1,60})[:\-\—]\s*(.*)/i);
      let company = 'Unknown';
      let rest = line;
      if (prefixMatch) {
        company = prefixMatch[1].trim();
        rest = prefixMatch[2];
      } else {
        // check if earlier line looks like company name
        // naive: previous line (if exists) that has no url and not too long
        const idx = allLines.indexOf(line);
        if (idx > 0) {
          const prev = allLines[idx - 1];
          if (prev && !prev.match(urlRe) && prev.length < 60) company = prev;
        }
      }
      const titleCandidate = rest.replace(urlRe, '').trim().replace(/^[\-\•\*\s]+/, '').split(/[-|—:]+/)[0].trim();
      const title = titleCandidate || urls[0];
      if (!byCompany.has(company)) byCompany.set(company, []);
      byCompany.get(company).push({ title, link: urls[0] });
    }
    // convert to array
    const arr = Array.from(byCompany.entries()).map(([title, rows]) => ({ title, rows }));
    if (arr.length) return arr;
  }

  // Return only companies with at least one row; but keep companies even if empty so UI can show counts
  return companies;
}
