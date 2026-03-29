const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.argv[2] || '3333', 10);
const ROOT = path.resolve(__dirname, '..');
const STATUS_FILE = path.join(__dirname, 'implementation-artifacts', 'sprint-status.yaml');
const EPICS_FILE = path.join(__dirname, 'planning-artifacts', 'epics.md');

// Colors for epics
const EPIC_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#14b8a6',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e'
];

function parseStatusYaml(content) {
  const statuses = {};
  let inDevStatus = false;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === 'development_status:') {
      inDevStatus = true;
      continue;
    }
    if (inDevStatus) {
      if (!trimmed || trimmed.startsWith('#')) continue;
      // Stop if we hit another top-level key (no indentation)
      if (!line.startsWith(' ') && !line.startsWith('\t') && trimmed.includes(':') && !trimmed.startsWith('#')) {
        // Check it's not indented
        if (line === trimmed) {
          inDevStatus = false;
          continue;
        }
      }
      const match = trimmed.match(/^([a-z0-9\-]+):\s*(.+)$/);
      if (match) {
        statuses[match[1]] = match[2].trim();
      }
    }
  }
  return statuses;
}

function parseEpicsMd(content) {
  const epics = [];
  // Match the detailed epic sections (## Epic N : Title) not the overview (### Epic N)
  const epicRegex = /^## Epic (\d+)\s*:\s*(.+)$/gm;
  const storyRegex = /^### Story (\d+)\.(\d+)\s*:\s*(.+)$/gm;

  let match;
  while ((match = epicRegex.exec(content)) !== null) {
    epics.push({
      number: parseInt(match[1], 10),
      title: match[2].trim(),
      stories: [],
      offset: match.index
    });
  }

  while ((match = storyRegex.exec(content)) !== null) {
    const epicNum = parseInt(match[1], 10);
    const storyNum = parseInt(match[2], 10);
    const title = match[3].trim();
    const epic = epics.find(e => e.number === epicNum);
    if (epic) {
      epic.stories.push({ epicNum, storyNum, title, id: `${epicNum}.${storyNum}` });
    }
  }

  return epics;
}

function slugify(epicNum, storyNum, title) {
  // Build possible slug from the sprint-status.yaml format: N-M-slug
  // We need to match keys like "2-1-liste-des-fichiers-modifies-avec-fondation-git-cli"
  return `${epicNum}-${storyNum}-`;
}

function getStoryStatus(statuses, epicNum, storyNum) {
  // Find key starting with "N-M-"
  const prefix = `${epicNum}-${storyNum}-`;
  for (const [key, value] of Object.entries(statuses)) {
    if (key.startsWith(prefix)) return value;
  }
  return 'backlog';
}

function getEpicStatus(statuses, epicNum) {
  return statuses[`epic-${epicNum}`] || 'backlog';
}

function getRetroStatus(statuses, epicNum) {
  return statuses[`epic-${epicNum}-retrospective`] || null;
}

// Column assignment based on story status
function getColumn(status) {
  switch (status) {
    case 'backlog': return 0;
    case 'ready-for-dev': return 1;
    case 'in-progress':
    case 'review': return 2;
    case 'done': return 3;
    default: return 0;
  }
}

const COLUMNS = [
  { name: 'Epics & Stories', commands: 'create-epics / check-readiness', color: '#7c3aed', icon: '📋' },
  { name: 'Sprint Planning', commands: 'sprint-planning / create-story', color: '#f59e0b', icon: '🗓️' },
  { name: 'Développement', commands: 'dev-story / code-review', color: '#3b82f6', icon: '⚡' },
  { name: 'Rétro / Done', commands: 'retrospective', color: '#10b981', icon: '✅' },
];

function buildPage(epics, statuses) {
  // Build column data: each column has epic cards
  // An epic can appear in multiple columns if its stories span different statuses
  const columns = [[], [], [], []];

  for (const epic of epics) {
    const epicStatus = getEpicStatus(statuses, epic.number);
    const retroStatus = getRetroStatus(statuses, epic.number);
    const color = EPIC_COLORS[(epic.number - 1) % EPIC_COLORS.length];

    // Group stories by column
    const storiesByCol = [[], [], [], []];
    let doneCount = 0;

    for (const story of epic.stories) {
      const status = getStoryStatus(statuses, story.epicNum, story.storyNum);
      const col = getColumn(status);
      storiesByCol[col].push({ ...story, status });
      if (status === 'done') doneCount++;
    }

    // Create a card for each column that has stories
    for (let col = 0; col < 4; col++) {
      if (storiesByCol[col].length === 0) continue;

      const isPartial = epicStatus !== 'done' && col === 3;
      columns[col].push({
        epicNumber: epic.number,
        epicTitle: epic.title,
        epicStatus,
        retroStatus,
        color,
        stories: storiesByCol[col],
        totalStories: epic.stories.length,
        doneCount,
        isPartial
      });
    }

    // If epic has no stories in any column (shouldn't happen), put it in col 0
    if (epic.stories.length === 0) {
      columns[0].push({
        epicNumber: epic.number,
        epicTitle: epic.title,
        epicStatus,
        retroStatus,
        color,
        stories: [],
        totalStories: 0,
        doneCount: 0,
        isPartial: false
      });
    }
  }

  // Generate HTML
  let html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GitGud — BMad Board</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0f0f1a;
    color: #e2e8f0;
    min-height: 100vh;
    padding: 24px;
  }
  h1 {
    font-size: 22px;
    margin-bottom: 4px;
    color: #f1f5f9;
  }
  .subtitle {
    color: #64748b;
    font-size: 13px;
    margin-bottom: 24px;
  }
  .board {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    min-width: 900px;
  }
  .board-wrapper {
    overflow-x: auto;
  }
  .col-header {
    background: #1e1e2e;
    border-radius: 8px 8px 0 0;
    padding: 14px 12px;
    text-align: center;
  }
  .col-header h2 {
    font-size: 14px;
    font-weight: 700;
    color: #e2e8f0;
  }
  .col-header .commands {
    color: #64748b;
    font-size: 11px;
    margin-top: 4px;
    font-family: monospace;
  }
  .col-body {
    background: #141420;
    border-radius: 0 0 8px 8px;
    padding: 10px;
    min-height: 300px;
  }
  .epic-card {
    background: #1e1e2e;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 10px;
    transition: background 0.15s;
  }
  .epic-card:hover { background: #252538; }
  .epic-card.partial { opacity: 0.65; }
  .epic-title {
    font-weight: 700;
    font-size: 13px;
    color: #f1f5f9;
    margin-bottom: 6px;
  }
  .epic-num {
    color: #94a3b8;
    font-weight: 400;
  }
  .story-list {
    margin-top: 6px;
  }
  .story-item {
    font-size: 12px;
    padding: 3px 0;
    color: #94a3b8;
    display: flex;
    align-items: baseline;
    gap: 6px;
  }
  .story-item .dot {
    flex-shrink: 0;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
    margin-top: 5px;
  }
  .story-item.status-done { color: #10b981; }
  .story-item.status-done .dot { background: #10b981; }
  .story-item.status-in-progress { color: #3b82f6; }
  .story-item.status-in-progress .dot { background: #3b82f6; }
  .story-item.status-review { color: #f59e0b; }
  .story-item.status-review .dot { background: #f59e0b; }
  .story-item.status-ready-for-dev { color: #a78bfa; }
  .story-item.status-ready-for-dev .dot { background: #a78bfa; }
  .story-item.status-backlog { color: #64748b; }
  .story-item.status-backlog .dot { background: #475569; }
  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 8px;
  }
  .badge {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 500;
  }
  .badge-progress { background: #374151; color: #9ca3af; }
  .badge-done { background: #10b98122; color: #6ee7b7; }
  .badge-in-progress { background: #3b82f622; color: #93c5fd; }
  .badge-backlog { background: #37415122; color: #6b7280; }
  .badge-retro { background: #10b98122; color: #6ee7b7; }
  .empty-col {
    color: #4b5563;
    font-size: 12px;
    text-align: center;
    padding: 40px 10px;
  }
  .legend {
    margin-top: 20px;
    padding: 14px 16px;
    background: #1e1e2e;
    border-radius: 8px;
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    font-size: 12px;
    color: #94a3b8;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .next-cmd {
    margin-top: 16px;
    padding: 14px 16px;
    background: #1a1a2e;
    border: 1px solid #2a2a4e;
    border-radius: 8px;
    font-size: 13px;
  }
  .next-cmd code {
    background: #2a2a4e;
    padding: 2px 6px;
    border-radius: 4px;
    color: #a78bfa;
    font-size: 12px;
  }
</style>
</head>
<body>
<h1>GitGud — BMad Board</h1>
<p class="subtitle">Progression du projet à travers le workflow BMad • Rafraîchir (F5) pour mettre à jour</p>

<div class="board-wrapper">
<div class="board">
`;

  // Column headers
  for (let i = 0; i < 4; i++) {
    const col = COLUMNS[i];
    const count = columns[i].reduce((sum, c) => sum + c.stories.length, 0);
    html += `<div class="col-header" style="border-bottom: 3px solid ${col.color}">
  <h2>${col.icon} ${col.name}</h2>
  <div class="commands">${col.commands}</div>
</div>\n`;
  }

  // Column bodies
  for (let i = 0; i < 4; i++) {
    html += `<div class="col-body">\n`;
    if (columns[i].length === 0) {
      html += `<div class="empty-col">Aucune story ici</div>\n`;
    } else {
      for (const card of columns[i]) {
        const partialClass = card.isPartial ? ' partial' : '';
        html += `<div class="epic-card${partialClass}" style="border-left: 4px solid ${card.color}">
  <div class="epic-title"><span class="epic-num">Epic ${card.epicNumber}:</span> ${escapeHtml(card.epicTitle)}</div>
  <div class="story-list">\n`;
        for (const story of card.stories) {
          const statusClass = `status-${story.status}`;
          const icon = story.status === 'done' ? '✓' : story.status === 'in-progress' ? '▶' : story.status === 'review' ? '⏳' : '•';
          html += `    <div class="story-item ${statusClass}"><span class="dot"></span>${story.id} ${escapeHtml(story.title)}</div>\n`;
        }
        html += `  </div>\n  <div class="badges">
    <span class="badge badge-progress">${card.doneCount}/${card.totalStories} done</span>`;
        if (card.epicStatus === 'done') {
          html += `\n    <span class="badge badge-done">epic done</span>`;
        } else if (card.epicStatus === 'in-progress') {
          html += `\n    <span class="badge badge-in-progress">in-progress</span>`;
        }
        if (card.retroStatus === 'done') {
          html += `\n    <span class="badge badge-retro">rétro ✓</span>`;
        }
        html += `\n  </div>\n</div>\n`;
      }
    }
    html += `</div>\n`;
  }

  html += `</div></div>\n`;

  // Legend
  html += `<div class="legend">
  <div class="legend-item"><span class="legend-dot" style="background:#475569"></span> backlog</div>
  <div class="legend-item"><span class="legend-dot" style="background:#a78bfa"></span> ready-for-dev</div>
  <div class="legend-item"><span class="legend-dot" style="background:#3b82f6"></span> in-progress</div>
  <div class="legend-item"><span class="legend-dot" style="background:#f59e0b"></span> review</div>
  <div class="legend-item"><span class="legend-dot" style="background:#10b981"></span> done</div>
</div>\n`;

  // Next action suggestion
  const nextAction = suggestNextAction(epics, statuses);
  if (nextAction) {
    html += `<div class="next-cmd">
  <strong>Prochaine action suggérée :</strong> ${nextAction}
</div>\n`;
  }

  html += `</body></html>`;
  return html;
}

function suggestNextAction(epics, statuses) {
  // Find the first epic that is in-progress
  for (const epic of epics) {
    const epicStatus = getEpicStatus(statuses, epic.number);
    if (epicStatus === 'in-progress') {
      // Find first story not done
      for (const story of epic.stories) {
        const status = getStoryStatus(statuses, story.epicNum, story.storyNum);
        if (status === 'backlog') {
          return `Story ${story.id} est en backlog → lancez <code>bmad-create-story</code> pour la préparer`;
        }
        if (status === 'ready-for-dev') {
          return `Story ${story.id} est prête → lancez <code>bmad-dev-story</code> pour l'implémenter`;
        }
        if (status === 'in-progress') {
          return `Story ${story.id} est en cours de dev → continuez le développement ou lancez <code>bmad-code-review</code>`;
        }
        if (status === 'review') {
          return `Story ${story.id} est en review → finalisez la review puis passez au statut done`;
        }
      }
      // All stories done but epic still in-progress
      const retroStatus = getRetroStatus(statuses, epic.number);
      if (retroStatus !== 'done') {
        return `Epic ${epic.number} terminée → lancez <code>bmad-retrospective</code>`;
      }
    }
  }

  // No epic in progress, suggest sprint planning
  for (const epic of epics) {
    const epicStatus = getEpicStatus(statuses, epic.number);
    if (epicStatus === 'backlog') {
      return `Epic ${epic.number} est en backlog → lancez <code>bmad-sprint-planning</code> pour planifier le prochain sprint`;
    }
  }

  return null;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '')) {
    try {
      const statusContent = fs.readFileSync(STATUS_FILE, 'utf8');
      const epicsContent = fs.readFileSync(EPICS_FILE, 'utf8');
      const statuses = parseStatusYaml(statusContent);
      const epics = parseEpicsMd(epicsContent);
      const html = buildPage(epics, statuses);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Erreur: ${err.message}\n\nVérifiez que les fichiers existent:\n- ${STATUS_FILE}\n- ${EPICS_FILE}`);
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`BMad Board → http://localhost:${PORT}`);
  console.log(`Sources: sprint-status.yaml + epics.md`);
  console.log(`Ctrl+C pour arrêter`);
});
