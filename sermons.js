const popularTags = ['T.D. Jakes', 'Joyce Meyer', 'Apostle Joshua Selman', 'Prayer', 'Faith', 'Purpose', 'Healing', 'Leadership'];

let curatedSermons = window.sermonsData || [];
let searchTimeout = null;

const searchInput = document.getElementById('search-input');
const suggestionsContainer = document.getElementById('suggestions');
const tagsRow = document.getElementById('tags-row');
const sermonList = document.getElementById('sermon-list');

const playerPanel = document.getElementById('player-panel');
const playerTitle = document.getElementById('player-title');
const playerPreacher = document.getElementById('player-preacher');
const audioPlayer = document.getElementById('audio-player');
const embedPlayer = document.getElementById('embed-player');
const playerDownload = document.getElementById('player-download');

function canPlay(sermon) {
  return Boolean(
    sermon.available &&
    ((sermon.sourceType === 'audio' && sermon.audioUrl) ||
      (sermon.sourceType === 'embed' && sermon.embedUrl))
  );
}

function sourceLabel(sermon) {
  if (sermon.sourceType === 'embed') return 'Spotify';
  if (sermon.sourceType === 'audio') return 'Audio';
  return 'Coming soon';
}

function createQuickPill(text, container, className) {
  const pill = document.createElement('button');
  pill.type = 'button';
  pill.className = className;
  pill.innerText = text;
  pill.addEventListener('click', () => {
    if (searchInput) searchInput.value = text;
    triggerSearch(text);
  });
  container.appendChild(pill);
}

function renderSuggestions() {
  if (!suggestionsContainer) return;
  suggestionsContainer.innerHTML = '';
  popularTags.slice(0, 4).forEach(tag => createQuickPill(tag, suggestionsContainer, 'suggestion-pill'));
}

function renderTags() {
  if (!tagsRow) return;
  tagsRow.innerHTML = '';
  popularTags.forEach(tag => createQuickPill(tag, tagsRow, 'tag-pill'));
}

function renderLoading(message = 'Searching messages worldwide…') {
  if (!sermonList) return;
  sermonList.innerHTML = `
    <div class="search-loading">
      <i class="fa-solid fa-circle-notch fa-spin"></i>
      ${message}
    </div>`;
}

function renderCards(sermons) {
  if (!sermonList) return;
  sermonList.innerHTML = '';

  if (!sermons.length) {
    sermonList.innerHTML = '<div class="no-results">No sermons found. Try another preacher, topic, or keyword.</div>';
    return;
  }

  sermons.forEach(sermon => {
    const playable = canPlay(sermon);
    const card = document.createElement('article');
    card.className = 'sermon-card';

    card.innerHTML = `
      ${sermon.thumbnail ? `<img class="sermon-thumbnail" src="${sermon.thumbnail}" alt="" loading="lazy">` : ''}
      <div class="sermon-card-body">
        <div class="sermon-card-text">
          <p class="sermon-label">${sermon.category}</p>
          <h3>${sermon.title}</h3>
          ${sermon.description ? `<p class="sermon-desc">${sermon.description}</p>` : ''}
          <div class="sermon-meta">
            <span>${sermon.preacher}</span>
            ${sermon.duration ? `<span>${sermon.duration}</span>` : ''}
            ${sermon.releaseDate ? `<span>${sermon.releaseDate}</span>` : ''}
            <span>${sourceLabel(sermon)}</span>
          </div>
        </div>
        <div class="sermon-actions">
          <button class="button${playable ? '' : ' disabled'}" type="button"${playable ? '' : ' disabled'}>
            <i class="fa-solid fa-headphones"></i> Listen
          </button>
          ${sermon.externalUrl ? `<a class="button-secondary" href="${sermon.externalUrl}" target="_blank" rel="noopener">Open source</a>` : ''}
        </div>
      </div>`;

    const listenBtn = card.querySelector('button.button');
    if (listenBtn && playable) {
      listenBtn.addEventListener('click', () => setPlayer(sermon));
    }
    sermonList.appendChild(card);
  });
}

function setPlayer(sermon) {
  if (playerTitle) playerTitle.innerText = sermon.title;
  if (playerPreacher) playerPreacher.innerText = sermon.preacher;

  // Reset both players
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.src = '';
    audioPlayer.hidden = true;
  }
  if (embedPlayer) {
    embedPlayer.innerHTML = '';
    embedPlayer.hidden = true;
  }
  if (playerDownload) {
    playerDownload.href = '#';
    playerDownload.className = 'button-secondary disabled';
  }

  if (sermon.sourceType === 'embed' && sermon.embedUrl) {
    if (embedPlayer) {
      embedPlayer.hidden = false;
      embedPlayer.innerHTML = `<iframe
        src="${sermon.embedUrl}"
        title="${sermon.title}"
        width="100%"
        height="${sermon.embedHeight || 152}"
        frameborder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"></iframe>`;
    }
  } else if (sermon.sourceType === 'audio' && sermon.audioUrl) {
    if (audioPlayer) {
      audioPlayer.src = sermon.audioUrl;
      audioPlayer.hidden = false;
      audioPlayer.play().catch(() => {});
    }
    if (playerDownload && sermon.downloadUrl) {
      playerDownload.href = sermon.downloadUrl;
      playerDownload.className = 'button-secondary';
    }
  }

  if (playerPanel) {
    playerPanel.hidden = false;
    playerPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

async function triggerSearch(query) {
  const q = query.trim();
  if (!q) { renderCards(curatedSermons); return; }
  renderLoading();
  try {
    const res = await fetch(`/api/sermons/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Search failed');
    renderCards(data.length ? data : []);
  } catch {
    const lower = q.toLowerCase();
    const local = curatedSermons.filter(s =>
      [s.title, s.preacher, s.category, s.description].some(v => v?.toLowerCase().includes(lower))
    );
    renderCards(local);
  }
}

if (searchInput) {
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = searchInput.value.trim();
    if (!q) { renderCards(curatedSermons); return; }
    searchTimeout = setTimeout(() => triggerSearch(q), 420);
  });
}

async function loadCuratedSermons() {
  try {
    const res = await fetch('/api/sermons');
    if (!res.ok) throw new Error('API unavailable');
    curatedSermons = await res.json();
  } catch {
    curatedSermons = window.sermonsData || [];
  }
  renderCards(curatedSermons);
}

renderSuggestions();
renderTags();
loadCuratedSermons();
