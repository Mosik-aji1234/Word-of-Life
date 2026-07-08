// Bible App v2 - Professional Scripture Reader
// =============================================

// State Management
let appState = {
  currentVersion: 'kjv',
  currentTestament: null,
  currentBook: null,
  currentChapter: 1,
  currentVerses: {},
  supabaseClient: null,
  currentUser: null,
  currentNoteVerse: null
};

// DOM Elements
const versionSelect = document.getElementById('version-select');
const testamentSelect = document.getElementById('testament-select');
const bookSelect = document.getElementById('book-select');
const chapterInput = document.getElementById('chapter-input');
const verseInput = document.getElementById('verse-input');
const loadVerseBtn = document.getElementById('load-verse-btn');
const prevChapterBtn = document.getElementById('prev-chapter');
const nextChapterBtn = document.getElementById('next-chapter');
const currentRefDisplay = document.getElementById('current-reference');
const verseContentArea = document.getElementById('verse-content');
const saveFavoriteBtn = document.getElementById('save-favorite');
const addNoteBtn = document.getElementById('add-note');
const popularyTagsContainer = document.getElementById('popular-tags');
const loginPrompt = document.getElementById('login-prompt');
const favoritesListContainer = document.getElementById('favorites-list');
const notesListContainer = document.getElementById('notes-list');
const libraryTabs = document.querySelectorAll('.library-tab');
const noteModal = document.getElementById('note-modal');
const noteTextarea = document.getElementById('note-textarea');
const charCounter = document.getElementById('char-counter');
const closeModalBtn = document.getElementById('close-modal');
const modalCancelBtn = document.getElementById('modal-cancel');
const modalSaveBtn = document.getElementById('modal-save');

// =============================================
// INITIALIZATION
// =============================================

async function initSupabase() {
  try {
    const response = await fetch('/api/config');
    const config = await response.json();

    if (!config.supabaseConfigured || !window.supabase) {
      loginPrompt.classList.remove('hidden');
      return;
    }

    appState.supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    const { data, error } = await appState.supabaseClient.auth.getSession();
    
    if (!error && data.session?.user) {
      appState.currentUser = data.session.user;
      updateLibrary();
    }

    appState.supabaseClient.auth.onAuthStateChange((_event, session) => {
      appState.currentUser = session?.user || null;
      updateLibrary();
    });
  } catch (error) {
    console.error('Supabase init failed:', error);
  }
}

function initializeApp() {
  populatePopularVerses();
  setupEventListeners();
  initSupabase();
}

// =============================================
// EVENT LISTENERS
// =============================================

function setupEventListeners() {
  // Version selection
  versionSelect.addEventListener('change', (e) => {
    appState.currentVersion = e.target.value;
    // Reload current verse if one is loaded
    if (appState.currentBook && appState.currentChapter) {
      loadCurrentVerse();
    }
  });

  // Testament selection
  testamentSelect.addEventListener('change', (e) => {
    appState.currentTestament = e.target.value;
    appState.currentBook = null;
    appState.currentChapter = 1;
    updateBookSelector();
    resetDisplay();
  });

  // Book selection
  bookSelect.addEventListener('change', (e) => {
    appState.currentBook = e.target.value;
    appState.currentChapter = 1;
    
    if (appState.currentBook && bibleStructure[appState.currentTestament]) {
      const maxChapters = bibleStructure[appState.currentTestament][appState.currentBook];
      chapterInput.max = maxChapters;
      chapterInput.disabled = false;
      chapterInput.value = '1';
      chapterInput.focus();
    }
    resetDisplay();
  });

  // Chapter input
  chapterInput.addEventListener('change', (e) => {
    appState.currentChapter = parseInt(e.target.value) || 1;
    verseInput.disabled = false;
    loadVerseBtn.disabled = false;
  });

  // Load verse button
  loadVerseBtn.addEventListener('click', loadCurrentVerse);

  // Navigation buttons
  prevChapterBtn.addEventListener('click', goToPreviousChapter);
  nextChapterBtn.addEventListener('click', goToNextChapter);

  // Save favorite
  saveFavoriteBtn.addEventListener('click', saveFavoriteVerse);

  // Add note
  addNoteBtn.addEventListener('click', openNoteModal);

  // Modal controls
  closeModalBtn.addEventListener('click', closeNoteModal);
  modalCancelBtn.addEventListener('click', closeNoteModal);
  modalSaveBtn.addEventListener('click', saveNoteToDatabase);

  // Character counter
  noteTextarea.addEventListener('input', (e) => {
    charCounter.textContent = e.target.value.length;
  });

  // Library tabs
  libraryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      libraryTabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.library-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tabName).classList.add('active');
    });
  });
}

// =============================================
// BOOK & CHAPTER MANAGEMENT
// =============================================

function updateBookSelector() {
  bookSelect.innerHTML = '<option value="">Select Book...</option>';
  bookSelect.disabled = !appState.currentTestament;
  
  if (!appState.currentTestament) return;

  const books = bibleStructure[appState.currentTestament];
  Object.keys(books).forEach(book => {
    const option = document.createElement('option');
    option.value = book;
    option.textContent = book;
    bookSelect.appendChild(option);
  });
}

async function loadCurrentVerse() {
  if (!appState.currentTestament || !appState.currentBook) {
    alert('Please select Testament and Book');
    return;
  }

  // Show loading state
  verseContentArea.innerHTML = '<div class="loading-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading verses...</p></div>';

  try {
    // For non-KJV versions, try to fetch from API
    if (appState.currentVersion !== 'kjv') {
      await fetchFromAPI();
    } else {
      displayVerses();
    }
    updateDisplay();
  } catch (error) {
    console.error('Error loading verse:', error);
    // Fallback to local display
    displayVerses();
    updateDisplay();
  }
}

async function fetchFromAPI() {
  const ref = `${appState.currentBook} ${appState.currentChapter}`;
  const versionId = bibleVersions[appState.currentVersion]?.apiId || 'kjv';

  try {
    // Using bible-api.com as primary source
    const response = await fetch(`https://bible-api.com/${ref}?translation=${versionId}`);
    
    if (!response.ok) {
      throw new Error('API fetch failed');
    }

    const data = await response.json();
    
    if (data.verses && data.verses.length > 0) {
      // Convert API response to our format
      appState.currentVerses = {};
      data.verses.forEach(verse => {
        const verseNum = verse.verse || 1;
        appState.currentVerses[verseNum] = verse.text;
      });
    } else {
      // Fallback to local if no API results
      displayVerses();
    }
  } catch (error) {
    console.error('API error, falling back to local:', error);
    // Fall back to local database
    displayVerses();
  }
}

function displayVerses() {
  const ref = `${appState.currentBook} ${appState.currentChapter}`;
  
  // Try to get from local database, or show sample
  const versesData = versesDatabase[ref] || generateSampleVerses(ref);
  appState.currentVerses = versesData;

  const versionName = bibleVersions[appState.currentVersion]?.name || 'Bible';

  let html = `<div class="verses-grid">
    <div class="version-badge">${versionName}</div>`;
  
  Object.entries(versesData).forEach(([verseNum, verseText]) => {
    html += `
      <article class="verse-card">
        <div class="verse-header">
          <span class="verse-ref">${appState.currentBook} ${appState.currentChapter}:${verseNum}</span>
        </div>
        <p class="verse-text">${verseText}</p>
        <div class="verse-footer">
          <button class="quick-action" onclick="quickSaveFavorite('${appState.currentBook} ${appState.currentChapter}:${verseNum}', '${verseText.replace(/'/g, "\\'")}')">
            <i class="fa-regular fa-heart"></i>
          </button>
          <button class="quick-action" onclick="quickAddNote('${appState.currentBook} ${appState.currentChapter}:${verseNum}')">
            <i class="fa-solid fa-pen"></i>
          </button>
        </div>
      </article>
    `;
  });

  html += '</div>';
  verseContentArea.innerHTML = html;
}

function generateSampleVerses(ref) {
  // Generate placeholder verses if not in database
  const [book, chapter] = ref.split(' ');
  const verseCount = Math.floor(Math.random() * 20) + 10;
  const verses = {};

  for (let i = 1; i <= verseCount; i++) {
    verses[i] = `${book} ${chapter}:${i} - Verse placeholder. [Verse text loading...]`;
  }

  return verses;
}

function updateDisplay() {
  const versionName = bibleVersions[appState.currentVersion]?.name || 'Bible';
  currentRefDisplay.textContent = `${appState.currentBook} ${appState.currentChapter} (${bibleVersions[appState.currentVersion].name})`;
  saveFavoriteBtn.disabled = false;
  addNoteBtn.disabled = false;
}

function resetDisplay() {
  verseContentArea.innerHTML = '<div class="empty-state"><i class="fa-solid fa-book-open"></i><p>Select a chapter to view verses</p></div>';
  saveFavoriteBtn.disabled = true;
  addNoteBtn.disabled = true;
  currentRefDisplay.textContent = 'Select a verse above';
}

async function goToPreviousChapter() {
  if (!appState.currentBook) return;

  const maxChapters = bibleStructure[appState.currentTestament][appState.currentBook];
  
  if (appState.currentChapter > 1) {
    appState.currentChapter--;
    chapterInput.value = appState.currentChapter;
    await loadCurrentVerse();
  }
}

async function goToNextChapter() {
  if (!appState.currentBook) return;

  const maxChapters = bibleStructure[appState.currentTestament][appState.currentBook];
  
  if (appState.currentChapter < maxChapters) {
    appState.currentChapter++;
    chapterInput.value = appState.currentChapter;
    await loadCurrentVerse();
  }
}

// =============================================
// FAVORITES & NOTES
// =============================================

async function saveFavoriteVerse() {
  if (!appState.currentUser || !appState.supabaseClient) {
    alert('Sign in to save favorites');
    return;
  }

  const ref = `${appState.currentBook} ${appState.currentChapter}`;
  const verses = Object.entries(appState.currentVerses)
    .map(([num, text]) => `${num}: ${text}`)
    .join(' ');

  try {
    await appState.supabaseClient
      .from('favorite_verses')
      .insert({
        user_id: appState.currentUser.id,
        verse_reference: ref,
        verse_text: verses
      });

    saveFavoriteBtn.innerHTML = '<i class="fa-solid fa-heart"></i> <span>Saved!</span>';
    setTimeout(() => {
      saveFavoriteBtn.innerHTML = '<i class="fa-regular fa-heart"></i> <span>Save to Favorites</span>';
    }, 2000);
    
    updateLibrary();
  } catch (error) {
    console.error('Error saving favorite:', error);
  }
}

async function quickSaveFavorite(ref, text) {
  if (!appState.currentUser || !appState.supabaseClient) {
    alert('Sign in to save favorites');
    return;
  }

  try {
    await appState.supabaseClient
      .from('favorite_verses')
      .insert({
        user_id: appState.currentUser.id,
        verse_reference: ref,
        verse_text: text
      });

    updateLibrary();
  } catch (error) {
    console.error('Error saving favorite:', error);
  }
}

function openNoteModal() {
  if (!appState.currentUser) {
    alert('Sign in to add notes');
    return;
  }

  appState.currentNoteVerse = `${appState.currentBook} ${appState.currentChapter}`;
  noteTextarea.value = '';
  charCounter.textContent = '0';
  noteModal.classList.remove('hidden');
}

function closeNoteModal() {
  noteModal.classList.add('hidden');
}

function quickAddNote(ref) {
  if (!appState.currentUser) {
    alert('Sign in to add notes');
    return;
  }

  appState.currentNoteVerse = ref;
  noteTextarea.value = '';
  charCounter.textContent = '0';
  noteModal.classList.remove('hidden');
}

async function saveNoteToDatabase() {
  if (!noteTextarea.value.trim()) {
    alert('Please write a note');
    return;
  }

  try {
    await appState.supabaseClient
      .from('verse_notes')
      .insert({
        user_id: appState.currentUser.id,
        verse_reference: appState.currentNoteVerse,
        note_text: noteTextarea.value
      });

    closeNoteModal();
    updateLibrary();
  } catch (error) {
    console.error('Error saving note:', error);
  }
}

// =============================================
// LIBRARY & UI
// =============================================

function populatePopularVerses() {
  popularyTagsContainer.innerHTML = '';
  
  popularVerses.forEach(verse => {
    const tag = document.createElement('button');
    tag.className = 'popular-tag';
    tag.innerHTML = `<i class="fa-solid fa-quote-left"></i> ${verse.ref}`;
    tag.addEventListener('click', () => loadPopularVerse(verse));
    popularyTagsContainer.appendChild(tag);
  });
}

function loadPopularVerse(verse) {
  const parts = verse.ref.split(':');
  const bookChapter = parts[0].split(' ');
  const verseNum = parts[1];

  appState.currentBook = bookChapter.slice(0, -1).join(' ');
  appState.currentChapter = parseInt(bookChapter[bookChapter.length - 1]);

  testamentSelect.value = verse.testament;
  appState.currentTestament = verse.testament;
  updateBookSelector();
  
  bookSelect.value = appState.currentBook;
  chapterInput.value = appState.currentChapter;
  
  verseInput.value = verseNum || '';
  
  loadCurrentVerse();
}

async function updateLibrary() {
  if (!appState.currentUser || !appState.supabaseClient) {
    loginPrompt.classList.remove('hidden');
    favoritesListContainer.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 2rem;"><i class="fa-solid fa-lock"></i> Sign in to save verses</p>';
    notesListContainer.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 2rem;"><i class="fa-solid fa-lock"></i> Sign in to add notes</p>';
    return;
  }

  loginPrompt.classList.add('hidden');

  try {
    const { data: favorites } = await appState.supabaseClient
      .from('favorite_verses')
      .select('*')
      .eq('user_id', appState.currentUser.id);

    const { data: notes } = await appState.supabaseClient
      .from('verse_notes')
      .select('*')
      .eq('user_id', appState.currentUser.id)
      .order('created_at', { ascending: false });

    renderFavorites(favorites);
    renderNotes(notes);
  } catch (error) {
    console.error('Error loading library:', error);
  }
}

function renderFavorites(favorites) {
  if (!favorites || favorites.length === 0) {
    favoritesListContainer.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 2rem;"><i class="fa-solid fa-bookmark"></i> No favorites yet</p>';
    return;
  }

  favoritesListContainer.innerHTML = favorites
    .map(fav => `
      <article class="library-card">
        <div class="card-header">
          <h4>${fav.verse_reference}</h4>
          <button class="close-btn" onclick="deleteFavorite('${fav.id}')"><i class="fa-solid fa-trash-can"></i></button>
        </div>
        <p>${fav.verse_text.substring(0, 150)}...</p>
      </article>
    `)
    .join('');
}

function renderNotes(notes) {
  if (!notes || notes.length === 0) {
    notesListContainer.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 2rem;"><i class="fa-solid fa-note-sticky"></i> No notes yet</p>';
    return;
  }

  notesListContainer.innerHTML = notes
    .map(note => `
      <article class="library-card">
        <div class="card-header">
          <h4>${note.verse_reference}</h4>
          <button class="close-btn" onclick="deleteNote('${note.id}')"><i class="fa-solid fa-trash-can"></i></button>
        </div>
        <p>${note.note_text}</p>
        <small style="color: var(--muted);">${new Date(note.created_at).toLocaleDateString()}</small>
      </article>
    `)
    .join('');
}

async function deleteFavorite(id) {
  if (!confirm('Remove this favorite?')) return;

  try {
    await appState.supabaseClient
      .from('favorite_verses')
      .delete()
      .eq('id', id);
    updateLibrary();
  } catch (error) {
    console.error('Error deleting favorite:', error);
  }
}

async function deleteNote(id) {
  if (!confirm('Delete this note?')) return;

  try {
    await appState.supabaseClient
      .from('verse_notes')
      .delete()
      .eq('id', id);
    updateLibrary();
  } catch (error) {
    console.error('Error deleting note:', error);
  }
}

// =============================================
// START APP
// =============================================

window.addEventListener('DOMContentLoaded', initializeApp);
