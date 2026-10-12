// render.js — parses the plain-text legal files into styled HTML.
// The .txt files remain the single source of truth; this script only
// converts their plain-text structure (headings, bullets, paragraphs)
// into semantic HTML for human readers.

(function () {
  'use strict';

  // Scroll to the section referenced by the URL hash, if any.
  function scrollToHash() {
    const hash = window.location.hash;
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ block: 'start' });
    }
  }

  // Fetch a .txt file and render it into the target container.
  async function renderLegalText(txtUrl, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      // Append a cache-busting query string so browsers and intermediate
      // caches always fetch the latest version of the legal text. GitHub
      // Pages serves these files with `Cache-Control: max-age=600`, which
      // would otherwise delay updates by up to 10 minutes (or longer if a
      // browser or the consuming site caches the response).
      const cacheBustedUrl =
        txtUrl + (txtUrl.indexOf('?') === -1 ? '?' : '&') + 'v=' + Date.now();
      const response = await fetch(cacheBustedUrl);
      if (!response.ok) {
        throw new Error('Failed to load ' + txtUrl + ' (' + response.status + ')');
      }
      const text = await response.text();
      container.innerHTML = '';
      container.appendChild(parseToNodes(text));

      // Deep-link support: if the URL has a section hash (for example
      // privacy-policy.html#data-deletion), scroll to that section now that
      // the fetched text is present in the DOM.
      scrollToHash();
      // Re-scroll after layout settles (fonts/images can shift the page).
      setTimeout(scrollToHash, 150);
    } catch (error) {
      // Fallback: show a friendly message with a link to the raw text file,
      // so the content is still reachable even if the fetch fails.
      const message = document.createElement('p');
      message.className = 'text-muted';
      message.textContent = 'Unable to load this document automatically.';

      const link = document.createElement('a');
      link.className = 'btn btn-ghost';
      link.href = txtUrl;
      link.textContent = 'Open the text file directly';

      container.innerHTML = '';
      container.appendChild(message);
      container.appendChild(link);
      console.error(error);
    }
  }

  // Build a stable, human-readable anchor id from a heading, e.g.
  // "5. Data Deletion (AppLovin)" -> "data-deletion".
  function headingId(text) {
    return String(text)
      .replace(/^\d+(\.\d+)*\.\s*/, '')
      .toLowerCase()
      .replace(/\([^)]*\)/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Convert the plain-text document into a document fragment of semantic nodes.
  function parseToNodes(text) {
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const fragment = document.createDocumentFragment();
    let list = null;

    const closeList = () => {
      list = null;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Blank line: close any open list.
      if (line === '') {
        closeList();
        continue;
      }

      // Bullet list item.
      if (line.startsWith('- ')) {
        if (!list) {
          list = document.createElement('ul');
          fragment.appendChild(list);
        }
        const item = document.createElement('li');
        item.textContent = line.slice(2);
        list.appendChild(item);
        continue;
      }

      // Close list if we hit a non-list line.
      closeList();

      // Title (first non-empty line).
      if (fragment.childNodes.length === 0) {
        const heading = document.createElement('h1');
        heading.textContent = line;
        fragment.appendChild(heading);
        continue;
      }

      // "Last updated" line.
      if (/^last updated:/i.test(line)) {
        const updated = document.createElement('p');
        updated.className = 'text-muted';
        updated.textContent = line;
        fragment.appendChild(updated);
        continue;
      }

      // Numbered section heading (e.g. "1.", "1.1", "2.").
      if (/^\d+(\.\d+)*\.\s/.test(line)) {
        const level = (line.match(/\./g) || []).length;
        const tag = level <= 1 ? 'h2' : 'h3';
        const heading = document.createElement(tag);
        heading.textContent = line;
        const id = headingId(line);
        if (id) {
          heading.id = id;
        }
        fragment.appendChild(heading);
        continue;
      }

      // Plain paragraph.
      const paragraph = document.createElement('p');
      paragraph.textContent = line;
      fragment.appendChild(paragraph);
    }

    return fragment;
  }

  // Re-run the hash scroll if the user changes the hash or the page finishes
  // loading (covers cases where the content was still being fetched).
  window.addEventListener('hashchange', scrollToHash);
  window.addEventListener('load', scrollToHash);

  // Expose for use by individual pages.
  window.renderLegalText = renderLegalText;
})();