const popularTags = ['T.D. Jakes', 'Joyce Meyer', 'Apostle Joshua Selman', 'Prayer', 'Faith', 'Purpose', 'Healing', 'Leadership'];

let curatedSermons = window.sermonsData || [];
let searchTimeout = null;

const searchInput = document.getElementById('search-input');
const suggestionsContainer = document.getElementById('suggestions');
const tagsRow = document.getElementById('tags-row');
const sermonList = document.getElementById('sermon-list');
const audioPlayer = document.getElementById('audio-player');
const playerTitle = document.getElementById('player-title');
const playerPreacher = document.getElementById('player-preacher');
const playerDownload = document.getElementById('player-download');
const embedPlayer = document.getElementById('embed-player');
const playerNote = document.getElementById('player-note');

function canPlay(sermon) {
  return Boolean(
    sermon.available &&
    ((sermon.sourceType === 'audio' && sermon.audioUrl) ||
      (sermon.sourceType === 'embed' && sermon.embedUrl) ||
      (sermon.sourceType === 'youtube' && sermon.embedUrl))
  );
}

function sourceLabel(sermon) {
  if (sermon.sourceType === 'embed') return 'Podcast';
  if (sermon.sourceType === 'audio') return 'Audio';
  return 'Coming soon';
}

function watchOrListen() {
  return 'Listen';
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
    const hasDownload = Boolean(sermon.downloadUrl);
    const hasExternal = Boolean(sermon.externalUrl);
    const card = document.createElement('article');
    card.className = 'sermon-card';

    card.innerHTML = `
      ${sermon.thumbnail ? `<img class="sermon-thumbnail" src="${sermon.thumbnail}" alt="${sermon.title}" loading="lazy">` : ''}
      <div class="sermon-card-header">
        <div>
          <p class="sermon-label">${sermon.category}</p>
          <h3>${sermon.title}</h3>
          <p>${sermon.description}</p>
        </div>
        <div class="sermon-meta">
          <span>${sermon.preacher}</span>
          ${sermon.duration ? `<span>${sermon.duration}</span>` : ''}
          <span>${sourceLabel(sermon)}</span>
        </div>
      </div>
      <div class="sermon-actions">
        <button class="button${playable ? '' : ' disabled'}" type="button"${playable ? '' : ' disabled'}>
          <i class="fa-solid fa-headphones"></i> ${watchOrListen()}
        </button>
        <a class="button-secondary${hasExternal ? '' : ' disabled'}"${hasExternal ? ` href="${sermon.externalUrl}" target="_blank" rel="noopener"` : ''}>Open source</a>
        <a class="button-secondary${hasDownload ? '' : ' disabled'}"${hasDownload ? ` href="${sermon.downloadUrl}" download` : ''}>Download</a>
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

  if (playerDownload) {
    if (sermon.downloadUrl) {
      playerDownload.href = sermon.downloadUrl;
      playerDownload.setAttribute('download', '');
      playerDownload.classList.remove('disabled');
    } else {
      playerDownload.href = '#';
      playerDownload.removeAttribute('download');
      playerDownload.classList.add('disabled');
    }
  }

  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.removeAttribute('src');
    audioPlayer.load();
    audioPlayer.hidden = true;
  }

  if (embedPlayer) {
    embedPlayer.innerHTML = '';
    embedPlayer.hidden = true;
  }

  if (sermon.sourceType === 'embed') {
    if (embedPlayer) {
      embedPlayer.hidden = false;
      embedPlayer.innerHTML = `
        <iframe
          title="${sermon.title}"
          src="${sermon.embedUrl}"
          width="100%"
          height="${sermon.embedHeight || 152}"
          frameborder="0"
          allowfullscreen
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy">
        </iframe>`;
    }
    if (playerNote) playerNote.innerText = 'Embedded episode plays through the original provider.';
    return;
  }

  if (audioPlayer) {
    audioPlayer.hidden = false;
    audioPlayer.src = sermon.audioUrl;
    audioPlayer.load();
    audioPlayer.play().catch(() => {});
  }
  if (playerNote) playerNote.innerText = 'Streaming from a direct audio URL.';
}

async function triggerSearch(query) {
  const q = query.trim();

  if (!q) {
    renderCards(curatedSermons);
    return;
  }

  renderLoading();

  try {
    const res = await fetch(`/api/sermons/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Search failed');

    renderCards(data.length ? data : []);
  } catch {
    // Fall back to filtering the curated list locally
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
    if (!q) {
      renderCards(curatedSermons);
      return;
    }
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
