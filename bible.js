const bibleState = {
  version: 'kjv',
  testament: '',
  book: '',
  chapter: 1,
  verse: '',
  passage: null,
  supabase: null,
  user: null,
  noteReference: '',
  library: {
    favorites: [],
    notes: [],
    highlights: []
  }
};

const storageKeys = {
  favorites: 'wol_bible_favorites',
  notes: 'wol_bible_notes',
  highlights: 'wol_bible_highlights'
};

const versionSelect = document.getElementById('version-select');
const testamentSelect = document.getElementById('testament-select');
const bookSelect = document.getElementById('book-select');
const chapterInput = document.getElementById('chapter-input');
const verseInput = document.getElementById('verse-input');
const loadVerseBtn = document.getElementById('load-verse-btn');
const referenceSearch = document.getElementById('reference-search');
const searchReferenceBtn = document.getElementById('search-reference-btn');
const referenceSuggestions = document.getElementById('reference-suggestions');
const prevChapterBtn = document.getElementById('prev-chapter');
const nextChapterBtn = document.getElementById('next-chapter');
const currentRefDisplay = document.getElementById('current-reference');
const verseContentArea = document.getElementById('verse-content');
const saveFavoriteBtn = document.getElementById('save-favorite');
const addNoteBtn = document.getElementById('add-note');
const popularTagsContainer = document.getElementById('popular-tags');
const loginPrompt = document.getElementById('login-prompt');
const favoritesListContainer = document.getElementById('favorites-list');
const notesListContainer = document.getElementById('notes-list');
const highlightsListContainer = document.getElementById('highlights-list');
const libraryTabs = document.querySelectorAll('.library-tab');
const noteModal = document.getElementById('note-modal');
const noteTextarea = document.getElementById('note-textarea');
const charCounter = document.getElementById('char-counter');
const closeModalBtn = document.getElementById('close-modal');
const modalCancelBtn = document.getElementById('modal-cancel');
const modalSaveBtn = document.getElementById('modal-save');

function loadLocalList(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function saveLocalList(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeBookName(value) {
  const raw = String(value || '').trim().replace(/\s+/g, ' ');
  const lower = raw.toLowerCase();
  const exact = bibleBooks.find(book => book.name.toLowerCase() === lower);
  if (exact) return exact.name;
  return bookAliases[lower] || '';
}

function getBookMeta(bookName) {
  return bibleBooks.find(book => book.name === bookName);
}

function parseReference(input) {
  const value = String(input || '').trim().replace(/\s+/g, ' ');
  const match = value.match(/^((?:[1-3]\s*)?[A-Za-z]+(?:\s+of\s+[A-Za-z]+)?(?:\s+[A-Za-z]+)*)\s+(\d{1,3})(?::(\d{1,3}))?$/i);
  if (!match) return null;

  const book = normalizeBookName(match[1]);
  if (!book) return null;

  const chapter = Number(match[2]);
  const verse = match[3] ? Number(match[3]) : '';
  const meta = getBookMeta(book);
  if (!meta || chapter < 1 || chapter > meta.chapters) return null;

  return {
    testament: meta.testament,
    book,
    chapter,
    verse
  };
}

function formatReference(book, chapter, verse = '') {
  return `${book} ${chapter}${verse ? `:${verse}` : ''}`;
}

function setReaderMessage(icon, title, detail = '') {
  verseContentArea.innerHTML = '';
  const empty = document.createElement('div');
  empty.className = 'empty-state bible-reader-message';
  empty.innerHTML = `<i class="fa-solid ${icon}"></i>`;
  const titleEl = document.createElement('p');
  titleEl.innerText = title;
  empty.appendChild(titleEl);
  if (detail) {
    const detailEl = document.createElement('small');
    detailEl.innerText = detail;
    empty.appendChild(detailEl);
  }
  verseContentArea.appendChild(empty);
}

function setControlsFromState() {
  versionSelect.value = bibleState.version;
  testamentSelect.value = bibleState.testament;
  updateBookSelector();
  bookSelect.value = bibleState.book;
  chapterInput.disabled = !bibleState.book;
  verseInput.disabled = !bibleState.book;
  loadVerseBtn.disabled = !bibleState.book;
  chapterInput.value = bibleState.chapter || '';
  verseInput.value = bibleState.verse || '';

  const meta = getBookMeta(bibleState.book);
  if (meta) chapterInput.max = meta.chapters;
}

function populatePopularVerses() {
  popularTagsContainer.innerHTML = '';
  popularVerses.forEach(verse => {
    const button = document.createElement('button');
    button.className = 'popular-tag';
    button.type = 'button';
    button.innerHTML = '<i class="fa-solid fa-quote-left"></i>';
    button.append(` ${verse.ref}`);
    button.addEventListener('click', () => loadFromReference(verse.ref));
    popularTagsContainer.appendChild(button);
  });
}

function populateSuggestions(query = '') {
  referenceSuggestions.innerHTML = '';
  const lower = query.toLowerCase().trim();
  const suggestions = [];

  if (lower) {
    bibleBooks
      .filter(book => book.name.toLowerCase().includes(lower) || lower.includes(book.name.toLowerCase()))
      .slice(0, 5)
      .forEach(book => suggestions.push(`${book.name} 1`));
  }

  popularVerses
    .filter(item => !lower || item.ref.toLowerCase().includes(lower))
    .slice(0, 6)
    .forEach(item => suggestions.push(item.ref));

  [...new Set(suggestions)].slice(0, 8).forEach(ref => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'reference-suggestion';
    button.innerText = ref;
    button.addEventListener('click', () => {
      referenceSearch.value = ref;
      loadFromReference(ref);
    });
    referenceSuggestions.appendChild(button);
  });
}

function updateBookSelector() {
  bookSelect.innerHTML = '<option value="">Select Book...</option>';
  bookSelect.disabled = !bibleState.testament;

  if (!bibleState.testament) return;

  Object.keys(bibleStructure[bibleState.testament]).forEach(book => {
    const option = document.createElement('option');
    option.value = book;
    option.innerText = book;
    bookSelect.appendChild(option);
  });
}

function getCurrentReference() {
  return formatReference(bibleState.book, bibleState.chapter, bibleState.verse);
}

async function fetchPassage(reference) {
  const version = bibleVersions[bibleState.version]?.apiId || 'kjv';
  const url = `/api/bible/passage?reference=${encodeURIComponent(reference)}&translation=${encodeURIComponent(version)}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to load passage');
  return data;
}

function getFallback(reference) {
  const normalized = reference.replace(/^Psalm\s/i, 'Psalms ');
  return localVerseFallbacks[normalized] || null;
}

async function loadCurrentPassage() {
  if (!bibleState.book) {
    setReaderMessage('fa-book-open', 'Select a book and chapter to begin reading.');
    return;
  }

  const meta = getBookMeta(bibleState.book);
  bibleState.chapter = Math.min(Math.max(Number(chapterInput.value) || 1, 1), meta.chapters);
  bibleState.verse = verseInput.value ? Math.max(Number(verseInput.value), 1) : '';
  const reference = getCurrentReference();

  saveFavoriteBtn.disabled = true;
  addNoteBtn.disabled = true;
  setReaderMessage('fa-spinner fa-spin', 'Loading Scripture...');

  try {
    bibleState.passage = await fetchPassage(reference);
  } catch (error) {
    const fallback = bibleState.version === 'kjv' ? getFallback(reference) : null;
    if (!fallback) {
      bibleState.passage = null;
      currentRefDisplay.innerText = reference;
      setReaderMessage('fa-triangle-exclamation', 'Could not load this passage.', 'Check your internet connection or try another reference.');
      return;
    }
    bibleState.passage = fallback;
  }

  renderPassage();
  updateLibraryMarkers();
}

function renderPassage() {
  const passage = bibleState.passage;
  const version = bibleVersions[bibleState.version];
  currentRefDisplay.innerText = `${passage.reference} (${version.label})`;
  saveFavoriteBtn.disabled = false;
  addNoteBtn.disabled = false;

  verseContentArea.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'bible-verses-list';

  const badge = document.createElement('div');
  badge.className = 'version-badge';
  badge.innerText = version.name;
  wrap.appendChild(badge);

  passage.verses.forEach(verse => {
    const reference = formatReference(verse.book, verse.chapter, verse.verse);
    const card = document.createElement('article');
    card.className = 'scripture-verse';
    card.dataset.reference = reference;

    const header = document.createElement('div');
    header.className = 'scripture-verse-header';

    const ref = document.createElement('span');
    ref.className = 'scripture-ref';
    ref.innerText = reference;

    const actions = document.createElement('div');
    actions.className = 'scripture-actions';
    actions.append(
      createVerseButton('fa-regular fa-heart', 'Save favorite', () => saveFavorite(reference, verse.text)),
      createVerseButton('fa-solid fa-pen', 'Add note', () => openNoteModal(reference)),
      createVerseButton('fa-solid fa-highlighter', 'Highlight verse', () => toggleHighlight(reference, verse.text))
    );

    const text = document.createElement('p');
    text.className = 'scripture-text';
    text.innerText = verse.text;

    header.append(ref, actions);
    card.append(header, text);
    wrap.appendChild(card);
  });

  verseContentArea.appendChild(wrap);
}

function createVerseButton(iconClass, label, handler) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'quick-action';
  button.title = label;
  button.setAttribute('aria-label', label);
  button.innerHTML = `<i class="${iconClass}"></i>`;
  button.addEventListener('click', handler);
  return button;
}

function updateLibraryMarkers() {
  document.querySelectorAll('.scripture-verse').forEach(card => {
    const ref = card.dataset.reference;
    card.classList.toggle('is-favorite', bibleState.library.favorites.some(item => item.verse_reference === ref));
    card.classList.toggle('is-highlighted', bibleState.library.highlights.some(item => item.verse_reference === ref));
  });
}

async function loadFromReference(reference) {
  const parsed = parseReference(reference);
  if (!parsed) {
    setReaderMessage('fa-magnifying-glass', 'Reference not recognized.', 'Try a format like John 3:16 or Romans 8.');
    return;
  }

  bibleState.testament = parsed.testament;
  bibleState.book = parsed.book;
  bibleState.chapter = parsed.chapter;
  bibleState.verse = parsed.verse;
  setControlsFromState();
  await loadCurrentPassage();
}

async function initSupabase() {
  try {
    const response = await fetch('/api/config');
    const config = await response.json();
    if (!config.supabaseConfigured || !window.supabase) {
      loginPrompt.classList.remove('hidden');
      loadLocalLibrary();
      return;
    }

    bibleState.supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    const { data } = await bibleState.supabase.auth.getSession();
    bibleState.user = data.session?.user || null;
    await loadLibrary();

    bibleState.supabase.auth.onAuthStateChange(async (_event, session) => {
      bibleState.user = session?.user || null;
      await loadLibrary();
    });
  } catch {
    loginPrompt.classList.remove('hidden');
    loadLocalLibrary();
  }
}

function loadLocalLibrary() {
  bibleState.library.favorites = loadLocalList(storageKeys.favorites);
  bibleState.library.notes = loadLocalList(storageKeys.notes);
  bibleState.library.highlights = loadLocalList(storageKeys.highlights);
  renderLibrary();
}

async function loadLibrary() {
  if (!bibleState.user || !bibleState.supabase) {
    loginPrompt.classList.remove('hidden');
    loadLocalLibrary();
    return;
  }

  loginPrompt.classList.add('hidden');
  const [favoritesRes, notesRes, highlightsRes] = await Promise.all([
    bibleState.supabase.from('favorite_verses').select('*').eq('user_id', bibleState.user.id).order('created_at', { ascending: false }),
    bibleState.supabase.from('verse_notes').select('*').eq('user_id', bibleState.user.id).order('created_at', { ascending: false }),
    bibleState.supabase.from('verse_highlights').select('*').eq('user_id', bibleState.user.id).order('created_at', { ascending: false })
  ]);

  bibleState.library.favorites = favoritesRes.data || [];
  bibleState.library.notes = notesRes.data || [];
  bibleState.library.highlights = highlightsRes.data || [];

  const libraryError = favoritesRes.error || notesRes.error || highlightsRes.error;
  if (libraryError) {
    loginPrompt.classList.remove('hidden');
    loginPrompt.querySelector('a').innerText = 'Run bible-tables.sql in Supabase to enable cloud library sync';
  }

  renderLibrary();
  updateLibraryMarkers();
}

async function saveFavorite(reference = getCurrentReference(), text = '') {
  const verseText = text || bibleState.passage?.verses.map(verse => `${verse.verse}: ${verse.text}`).join(' ') || '';
  if (!verseText) return;

  if (bibleState.user && bibleState.supabase) {
    const { error } = await bibleState.supabase.from('favorite_verses').upsert({
      user_id: bibleState.user.id,
      verse_reference: reference,
      verse_text: verseText
    }, { onConflict: 'user_id,verse_reference' });
    if (error) {
      alert(error.message);
      return;
    }
    await loadLibrary();
  } else {
    const next = [
      { id: crypto.randomUUID(), verse_reference: reference, verse_text: verseText, created_at: new Date().toISOString() },
      ...bibleState.library.favorites.filter(item => item.verse_reference !== reference)
    ];
    bibleState.library.favorites = next;
    saveLocalList(storageKeys.favorites, next);
    renderLibrary();
    updateLibraryMarkers();
  }
}

function openNoteModal(reference = getCurrentReference()) {
  bibleState.noteReference = reference;
  noteTextarea.value = '';
  charCounter.innerText = '0';
  noteModal.classList.remove('hidden');
  noteTextarea.focus();
}

function closeNoteModal() {
  noteModal.classList.add('hidden');
}

async function saveNote() {
  const text = noteTextarea.value.trim();
  if (!text) return;

  if (bibleState.user && bibleState.supabase) {
    const { error } = await bibleState.supabase.from('verse_notes').insert({
      user_id: bibleState.user.id,
      verse_reference: bibleState.noteReference,
      note_text: text
    });
    if (error) {
      alert(error.message);
      return;
    }
    await loadLibrary();
  } else {
    const next = [
      { id: crypto.randomUUID(), verse_reference: bibleState.noteReference, note_text: text, created_at: new Date().toISOString() },
      ...bibleState.library.notes
    ];
    bibleState.library.notes = next;
    saveLocalList(storageKeys.notes, next);
    renderLibrary();
  }

  closeNoteModal();
}

async function toggleHighlight(reference, text) {
  const existing = bibleState.library.highlights.find(item => item.verse_reference === reference);

  if (bibleState.user && bibleState.supabase) {
    if (existing) {
      await bibleState.supabase.from('verse_highlights').delete().eq('id', existing.id);
    } else {
      const { error } = await bibleState.supabase.from('verse_highlights').insert({
        user_id: bibleState.user.id,
        verse_reference: reference,
        verse_text: text,
        color: 'gold'
      });
      if (error) {
        alert(error.message);
        return;
      }
    }
    await loadLibrary();
  } else {
    const next = existing
      ? bibleState.library.highlights.filter(item => item.verse_reference !== reference)
      : [{ id: crypto.randomUUID(), verse_reference: reference, verse_text: text, color: 'gold', created_at: new Date().toISOString() }, ...bibleState.library.highlights];
    bibleState.library.highlights = next;
    saveLocalList(storageKeys.highlights, next);
    renderLibrary();
    updateLibraryMarkers();
  }
}

function renderLibrary() {
  renderCards(favoritesListContainer, bibleState.library.favorites, 'No favorite verses yet.', 'favorite');
  renderCards(notesListContainer, bibleState.library.notes, 'No notes yet.', 'note');
  renderCards(highlightsListContainer, bibleState.library.highlights, 'No highlighted verses yet.', 'highlight');
}

function renderCards(container, items, emptyText, type) {
  container.innerHTML = '';
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'library-empty';
    empty.innerText = emptyText;
    container.appendChild(empty);
    return;
  }

  items.forEach(item => {
    const card = document.createElement('article');
    card.className = `library-card ${type === 'highlight' ? 'highlight-card' : ''}`;

    const header = document.createElement('div');
    header.className = 'card-header';

    const title = document.createElement('h4');
    title.innerText = item.verse_reference;

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'close-btn';
    deleteBtn.title = 'Remove';
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
    deleteBtn.addEventListener('click', () => deleteLibraryItem(type, item.id, item.verse_reference));

    const body = document.createElement('p');
    body.innerText = type === 'note' ? item.note_text : item.verse_text;

    header.append(title, deleteBtn);
    card.append(header, body);
    container.appendChild(card);
  });
}

async function deleteLibraryItem(type, id, reference) {
  const table = {
    favorite: 'favorite_verses',
    note: 'verse_notes',
    highlight: 'verse_highlights'
  }[type];

  if (bibleState.user && bibleState.supabase && table) {
    await bibleState.supabase.from(table).delete().eq('id', id);
    await loadLibrary();
    return;
  }

  const key = `${type}s`;
  const storageKey = type === 'favorite' ? storageKeys.favorites : type === 'note' ? storageKeys.notes : storageKeys.highlights;
  bibleState.library[key] = bibleState.library[key].filter(item => item.id !== id && item.verse_reference !== reference);
  saveLocalList(storageKey, bibleState.library[key]);
  renderLibrary();
  updateLibraryMarkers();
}

async function goToPreviousChapter() {
  if (!bibleState.book || bibleState.chapter <= 1) return;
  bibleState.chapter -= 1;
  bibleState.verse = '';
  setControlsFromState();
  await loadCurrentPassage();
}

async function goToNextChapter() {
  const meta = getBookMeta(bibleState.book);
  if (!meta || bibleState.chapter >= meta.chapters) return;
  bibleState.chapter += 1;
  bibleState.verse = '';
  setControlsFromState();
  await loadCurrentPassage();
}

function setupEvents() {
  versionSelect.addEventListener('change', async event => {
    bibleState.version = event.target.value;
    if (bibleState.book) await loadCurrentPassage();
  });

  testamentSelect.addEventListener('change', event => {
    bibleState.testament = event.target.value;
    bibleState.book = '';
    bibleState.chapter = 1;
    bibleState.verse = '';
    setControlsFromState();
    setReaderMessage('fa-book-open', 'Select a book and chapter to begin reading.');
  });

  bookSelect.addEventListener('change', event => {
    bibleState.book = event.target.value;
    bibleState.chapter = 1;
    bibleState.verse = '';
    setControlsFromState();
  });

  chapterInput.addEventListener('input', () => {
    bibleState.chapter = Number(chapterInput.value) || 1;
  });

  verseInput.addEventListener('input', () => {
    bibleState.verse = verseInput.value ? Number(verseInput.value) : '';
  });

  loadVerseBtn.addEventListener('click', loadCurrentPassage);
  searchReferenceBtn.addEventListener('click', () => loadFromReference(referenceSearch.value));
  referenceSearch.addEventListener('input', event => populateSuggestions(event.target.value));
  referenceSearch.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      loadFromReference(referenceSearch.value);
    }
  });

  prevChapterBtn.addEventListener('click', goToPreviousChapter);
  nextChapterBtn.addEventListener('click', goToNextChapter);
  saveFavoriteBtn.addEventListener('click', () => saveFavorite());
  addNoteBtn.addEventListener('click', () => openNoteModal());
  closeModalBtn.addEventListener('click', closeNoteModal);
  modalCancelBtn.addEventListener('click', closeNoteModal);
  modalSaveBtn.addEventListener('click', saveNote);
  noteTextarea.addEventListener('input', () => {
    charCounter.innerText = noteTextarea.value.length;
  });

  libraryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      libraryTabs.forEach(item => item.classList.remove('active'));
      document.querySelectorAll('.library-panel').forEach(panel => panel.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });
}

async function initializeBibleApp() {
  populatePopularVerses();
  populateSuggestions();
  setupEvents();
  setControlsFromState();
  setReaderMessage('fa-book-open', 'Search a passage or browse by book to begin.');
  await initSupabase();
}

window.addEventListener('DOMContentLoaded', initializeBibleApp);
