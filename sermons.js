let sermons = window.sermonsData || [];

const popularTags = ['T.D. Jakes', 'Joyce Meyer', 'Prayer', 'Faith', 'Purpose', 'Leadership'];

const searchInput = document.getElementById('search-input');
const suggestionsContainer = document.getElementById('suggestions');
const tagsRow = document.getElementById('tags-row');
const sermonList = document.getElementById('sermon-list');
const playerPanel = document.getElementById('player-panel');
const audioPlayer = document.getElementById('audio-player');
const playerTitle = document.getElementById('player-title');
const playerPreacher = document.getElementById('player-preacher');
const playerDownload = document.getElementById('player-download');
const embedPlayer = document.getElementById('embed-player');
const playerNote = document.getElementById('player-note');

function canPlaySermon(sermon) {
  return Boolean(
    sermon.available &&
    ((sermon.sourceType === 'audio' && sermon.audioUrl) ||
      (sermon.sourceType === 'embed' && sermon.embedUrl))
  );
}

function getSourceLabel(sermon) {
  if (sermon.sourceType === 'embed') return 'Podcast embed';
  if (sermon.sourceType === 'audio') return 'Audio stream';
  return 'Coming soon';
}

function createPill(text) {
  const pill = document.createElement('button');
  pill.type = 'button';
  pill.className = 'suggestion-pill';
  pill.innerText = text;
  pill.addEventListener('click', () => {
    searchInput.value = text;
    renderSermons(text);
  });
  return pill;
}

function renderSuggestions() {
  if (!suggestionsContainer) return;
  suggestionsContainer.innerHTML = '';
  popularTags.slice(0, 4).forEach(tag => {
    suggestionsContainer.appendChild(createPill(tag));
  });
}

function renderTags() {
  if (!tagsRow) return;
  tagsRow.innerHTML = '';
  popularTags.forEach(tag => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'tag-pill';
    pill.innerText = tag;
    pill.addEventListener('click', () => {
      searchInput.value = tag;
      renderSermons(tag);
    });
    tagsRow.appendChild(pill);
  });
}

function renderSermons(query = '') {
  if (!sermonList) return;
  const normalized = query.trim().toLowerCase();
  const filtered = sermons.filter(sermon => {
    if (!normalized) return true;
    return [sermon.title, sermon.preacher, sermon.category, sermon.description]
      .some(value => value?.toLowerCase().includes(normalized));
  });

  sermonList.innerHTML = '';

  if (!filtered.length) {
    const noResults = document.createElement('div');
    noResults.className = 'no-results';
    noResults.innerText = 'No sermons found. Try another preacher, topic, or keyword.';
    sermonList.appendChild(noResults);
    return;
  }

  filtered.forEach(sermon => {
    const playable = canPlaySermon(sermon);
    const hasDownload = Boolean(sermon.downloadUrl);
    const hasExternalLink = Boolean(sermon.externalUrl);
    const card = document.createElement('article');
    card.className = 'sermon-card';

    card.innerHTML = `
      <div class="sermon-card-header">
        <div>
          <p class="sermon-label">${sermon.category}</p>
          <h3>${sermon.title}</h3>
          <p>${sermon.description}</p>
        </div>
        <div class="sermon-meta">
          <span>${sermon.preacher}</span>
          <span>${sermon.duration}</span>
          <span>${getSourceLabel(sermon)}</span>
        </div>
      </div>
      <div class="sermon-actions">
        <button class="button ${playable ? '' : 'disabled'}" ${playable ? '' : 'disabled'} type="button">Listen</button>
        <a class="button-secondary ${hasExternalLink ? '' : 'disabled'}" ${hasExternalLink ? `href="${sermon.externalUrl}" target="_blank" rel="noopener"` : ''}>Open source</a>
        <a class="button-secondary ${hasDownload ? '' : 'disabled'}" ${hasDownload ? `href="${sermon.downloadUrl}" download` : ''}>Download</a>
      </div>
    `;

    const listenButton = card.querySelector('.button');
    if (listenButton && playable) {
      listenButton.addEventListener('click', () => {
        setPlayer(sermon);
    }   ); }
    sermonList.appendChild(card);
  });
}

function setPlayer(sermon) {
  playerTitle.innerText = sermon.title;
  playerPreacher.innerText = sermon.preacher;

  if (sermon.downloadUrl) {
    playerDownload.href = sermon.downloadUrl;
    playerDownload.setAttribute('download', '');
    playerDownload.classList.remove('disabled');
  } else {
    playerDownload.href = '#';
    playerDownload.removeAttribute('download');
    playerDownload.classList.add('disabled');
  }

  audioPlayer.pause();
  audioPlayer.removeAttribute('src');
  audioPlayer.load();
  audioPlayer.hidden = true;
  embedPlayer.innerHTML = '';
  embedPlayer.hidden = true;

  if (sermon.sourceType === 'embed') {
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
      </iframe>
    `;
    playerNote.innerText = 'Embedded episodes play through the original provider.';
    return;
  }

  audioPlayer.hidden = false;
  audioPlayer.src = sermon.audioUrl;
  audioPlayer.load();
  audioPlayer.play().catch(() => {
    /* Some browsers wait for the user to press play inside the audio control. */
  });
  playerNote.innerText = 'Streaming from a direct audio URL.';
}

if (searchInput) {
  searchInput.addEventListener('input', () => renderSermons(searchInput.value));
}

async function loadSermons() {
  try {
    const response = await fetch('/api/sermons');
    if (!response.ok) throw new Error('Sermons API is unavailable');

    sermons = await response.json();
  } catch (error) {
    sermons = window.sermonsData || sermons;
  }

  renderSermons(searchInput?.value || '');
}

renderSuggestions();
renderTags();
loadSermons();
