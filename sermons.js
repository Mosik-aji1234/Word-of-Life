const popularTags = ['T.D. Jakes', 'Joyce Meyer', 'Apostle Joshua Selman', 'Prayer', 'Faith', 'Purpose', 'Healing', 'Leadership'];

let curatedSermons = window.sermonsData || [];
let searchTimeout = null;

const searchInput = document.getElementById('search-input');
const suggestionsContainer = document.getElementById('suggestions');
const tagsRow = document.getElementById('tags-row');
const sermonList = document.getElementById('sermon-list');

// Player bar
const audioPlayer = document.getElementById('audio-player');
const playerBar = document.getElementById('player-bar');
const playerBarThumb = document.getElementById('player-bar-thumb');
const playerBarTitle = document.getElementById('player-bar-title');
const playerBarPreacher = document.getElementById('player-bar-preacher');
const playerBarPlay = document.getElementById('player-bar-play');
const playerBarIcon = document.getElementById('player-bar-icon');
const playerBarSeek = document.getElementById('player-bar-seek');
const playerBarCurrent = document.getElementById('player-bar-current');
const playerBarDuration = document.getElementById('player-bar-duration');
const playerBarDownload = document.getElementById('player-bar-download');
const playerBarClose = document.getElementById('player-bar-close');

function formatTime(secs) {
  if (!isFinite(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

if (audioPlayer) {
  audioPlayer.addEventListener('timeupdate', () => {
    if (audioPlayer.duration) {
      if (playerBarSeek) playerBarSeek.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
      if (playerBarCurrent) playerBarCurrent.innerText = formatTime(audioPlayer.currentTime);
    }
  });
  audioPlayer.addEventListener('durationchange', () => {
    if (playerBarDuration) playerBarDuration.innerText = formatTime(audioPlayer.duration);
  });
  audioPlayer.addEventListener('play', () => {
    if (playerBarIcon) playerBarIcon.className = 'fa-solid fa-pause';
  });
  audioPlayer.addEventListener('pause', () => {
    if (playerBarIcon) playerBarIcon.className = 'fa-solid fa-play';
  });
  audioPlayer.addEventListener('ended', () => {
    if (playerBarIcon) playerBarIcon.className = 'fa-solid fa-play';
    if (playerBarSeek) playerBarSeek.value = 0;
    if (playerBarCurrent) playerBarCurrent.innerText = '0:00';
  });
}

if (playerBarPlay) {
  playerBarPlay.addEventListener('click', () => {
    if (!audioPlayer) return;
    if (audioPlayer.paused) audioPlayer.play().catch(() => {});
    else audioPlayer.pause();
  });
}

if (playerBarSeek) {
  playerBarSeek.addEventListener('input', () => {
    if (audioPlayer && audioPlayer.duration) {
      audioPlayer.currentTime = (playerBarSeek.value / 100) * audioPlayer.duration;
    }
  });
}

if (playerBarClose) {
  playerBarClose.addEventListener('click', () => {
    if (audioPlayer) { audioPlayer.pause(); audioPlayer.src = ''; }
    if (playerBar) playerBar.hidden = true;
    document.body.classList.remove('player-active');
  });
}

function canPlay(sermon) {
  return Boolean(sermon.available && sermon.sourceType === 'audio' && sermon.audioUrl);
}

function sourceLabel(sermon) {
  if (sermon.sourceType === 'audio') return 'Audio';
  if (sermon.sourceType === 'embed') return 'Podcast';
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
          </div>
        </div>
        <div class="sermon-actions">
          <button class="button${playable ? '' : ' disabled'}" type="button"${playable ? '' : ' disabled'}>
            <i class="fa-solid fa-headphones"></i> Listen
          </button>
          ${sermon.externalUrl ? `<a class="button-secondary" href="${sermon.externalUrl}" target="_blank" rel="noopener">Source</a>` : ''}
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
  if (playerBarThumb) {
    if (sermon.thumbnail) {
      playerBarThumb.src = sermon.thumbnail;
      playerBarThumb.removeAttribute('hidden');
    } else {
      playerBarThumb.setAttribute('hidden', '');
    }
  }
  if (playerBarTitle) playerBarTitle.innerText = sermon.title;
  if (playerBarPreacher) playerBarPreacher.innerText = sermon.preacher;
  if (playerBarDownload) {
    if (sermon.downloadUrl) {
      playerBarDownload.href = sermon.downloadUrl;
      playerBarDownload.removeAttribute('hidden');
    } else {
      playerBarDownload.setAttribute('hidden', '');
    }
  }
  if (playerBarSeek) playerBarSeek.value = 0;
  if (playerBarCurrent) playerBarCurrent.innerText = '0:00';
  if (playerBarDuration) playerBarDuration.innerText = '–:––';
  if (playerBarIcon) playerBarIcon.className = 'fa-solid fa-play';

  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.src = sermon.audioUrl || '';
    audioPlayer.load();
    if (sermon.audioUrl) audioPlayer.play().catch(() => {});
  }
  if (playerBar) playerBar.hidden = false;
  document.body.classList.add('player-active');
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
