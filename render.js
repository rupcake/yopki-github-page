// render.js — parses the plain-text legal files into styled HTML.
// The .txt files remain the single source of truth; this script only
// converts their plain-text structure (headings, bullets, paragraphs)
// into semantic HTML for human readers.

(function () {
  'use strict';

  // Fetch a .txt file and render it into the target container.
  async function renderLegalText(txtUrl, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const response = await fetch(txtUrl);
      if (!response.ok) {
        throw new Error('Failed to load ' + txtUrl + ' (' + response.status + ')');
      }
      const text = await response.text();
      container.innerHTML = parseToHtml(text);
    } catch (error) {
      container.innerHTML =
        '<p class="text-muted">Unable to load this document. Please try again later.</p>';
      console.error(error);
    }
  }

  // Convert the plain-text document into semantic HTML.
  function parseToHtml(text) {
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const html = [];
    let listOpen = false;

    const closeList = () => {
      if (listOpen) {
        html.push('</ul>');
        listOpen = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Blank line: close any open list and add spacing.
      if (line === '') {
        closeList();
        continue;
      }

      // Bullet list item.
      if (line.startsWith('- ')) {
        if (!listOpen) {
          html.push('<ul>');
          listOpen = true;
        }
        html.push('<li>' + escapeHtml(line.slice(2)) + '</li>');
        continue;
      }

      // Close list if we hit a non-list line.
      closeList();

      // Title (first non-empty line).
      if (html.length === 0) {
        html.push('<h1>' + escapeHtml(line) + '</h1>');
        continue;
      }

      // "Last updated" line.
      if (/^last updated:/i.test(line)) {
        html.push('<p class="text-muted">' + escapeHtml(line) + '</p>');
        continue;
      }

      // Numbered section heading (e.g. "1.", "1.1", "2.").
      if (/^\d+(\.\d+)*\.\s/.test(line)) {
        const level = (line.match(/\./g) || []).length;
        const tag = level <= 1 ? 'h2' : 'h3';
        html.push('<' + tag + '>' + escapeHtml(line) + '</' + tag + '>');
        continue;
      }

      // Plain paragraph.
      html.push('<p>' + escapeHtml(line) + '</p>');
    }

    closeList();
    return html.join('\n');
  }

  // Escape HTML special characters to keep the text safe.
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, ''');
  }

  // Expose for use by individual pages.
  window.renderLegalText = renderLegalText;
})();