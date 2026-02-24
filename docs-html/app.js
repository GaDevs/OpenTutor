const DOCS = [
  "README.md",
  "QUICKSTART.md",
  "ARCHITECTURE.md",
  "PEDAGOGY.md",
  "COMMANDS.md",
  "TROUBLESHOOTING.md",
  "SECURITY.md",
  "LICENSE_NOTES.md",
];

const docListEl = document.getElementById("doc-list");
const titleEl = document.getElementById("doc-title");
const rootEl = document.getElementById("markdown-root");

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderInline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

function markdownToHtml(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let html = "";
  let inCode = false;
  let inList = false;
  let inQuote = false;

  function closeList() {
    if (inList) {
      html += "</ul>";
      inList = false;
    }
  }
  function closeQuote() {
    if (inQuote) {
      html += "</blockquote>";
      inQuote = false;
    }
  }

  for (const line of lines) {
    if (line.startsWith("```")) {
      closeList();
      closeQuote();
      if (!inCode) {
        inCode = true;
        html += "<pre><code>";
      } else {
        inCode = false;
        html += "</code></pre>";
      }
      continue;
    }

    if (inCode) {
      html += `${escapeHtml(line)}\n`;
      continue;
    }

    if (/^\s*$/.test(line)) {
      closeList();
      closeQuote();
      html += "";
      continue;
    }

    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      closeList();
      closeQuote();
      const level = h[1].length;
      html += `<h${level}>${renderInline(h[2])}</h${level}>`;
      continue;
    }

    if (line.startsWith("> ")) {
      closeList();
      if (!inQuote) {
        inQuote = true;
        html += "<blockquote>";
      }
      html += `<p>${renderInline(line.slice(2))}</p>`;
      continue;
    }

    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li) {
      closeQuote();
      if (!inList) {
        inList = true;
        html += "<ul>";
      }
      html += `<li>${renderInline(li[1])}</li>`;
      continue;
    }

    const num = line.match(/^\s*\d+\.\s+(.*)$/);
    if (num) {
      closeQuote();
      if (!inList) {
        inList = true;
        html += "<ul>";
      }
      html += `<li>${renderInline(num[1])}</li>`;
      continue;
    }

    closeList();
    closeQuote();
    html += `<p>${renderInline(line)}</p>`;
  }

  if (inCode) html += "</code></pre>";
  closeList();
  closeQuote();
  return html;
}

async function loadDoc(name) {
  titleEl.textContent = name;
  rootEl.innerHTML = "<p>Loading…</p>";
  try {
    const res = await fetch(`../docs/${name}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const md = await res.text();
    rootEl.innerHTML = markdownToHtml(md);
    titleEl.textContent = name.replace(".md", "");
  } catch (err) {
    rootEl.innerHTML = `
      <h2>Failed to load document</h2>
      <p>${escapeHtml(String(err))}</p>
      <p>Tip: serve the repository with a local static server instead of opening from file://.</p>
    `;
  }
}

function buildNav() {
  const current = new URLSearchParams(window.location.search).get("doc") || DOCS[0];
  for (const name of DOCS) {
    const btn = document.createElement("button");
    btn.textContent = name.replace(".md", "");
    if (name === current) btn.classList.add("active");
    btn.addEventListener("click", () => {
      const url = new URL(window.location.href);
      url.searchParams.set("doc", name);
      window.history.pushState({}, "", url);
      [...docListEl.querySelectorAll("button")].forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      loadDoc(name);
    });
    docListEl.appendChild(btn);
  }
  loadDoc(current);
}

window.addEventListener("popstate", () => {
  const current = new URLSearchParams(window.location.search).get("doc") || DOCS[0];
  [...docListEl.querySelectorAll("button")].forEach((btn) => {
    btn.classList.toggle("active", btn.textContent === current.replace(".md", ""));
  });
  loadDoc(current);
});

buildNav();
