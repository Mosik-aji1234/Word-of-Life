// Bible App - Powered by Bible-API.com
const BIBLE_API = 'https://bible-api.com';

// Supabase setup
let supabaseClient = null;
let currentUser = null;

// Bible state
let currentVersion = 'kjv';
let currentBook = 'genesis';
let currentChapter = 1;
let currentVerses = [];
let currentNoteVerse = null;

// DOM Elements
const versionSelect = document.getElementById('bible-version');
const verseSearch = document.getElementById('verse-search');
const searchBtn = document.getElementById('search-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const currentRef = document.getElementById('current-ref');
const bibleDisplay = document.getElementById('bible-display');
const saveFavoriteBtn = document.getElementById('save-favorite-btn');
const addNoteBtn = document.getElementById('add-note-btn');
const noteModal = document.getElementById('note-modal');
const noteText = document.getElementById('note-text');
const saveNoteBtn = document.getElementById('save-note-btn');
const cancelNoteBtn = document.getElementById('cancel-note-btn');
const cancelNoteFooter = document.getElementById('cancel-note-btn-footer');
const charCount = document.getElementById('char-count');
const loginPrompt = document.getElementById('login-prompt');
const favoritesList = document.getElementById('favorites-list');
const notesList = document.getElementById('notes-list');
const tabBtns = document.querySelectorAll('.library-tab');

// Bible book data for navigation
const bibleBooks = {
  'genesis': { name: 'Genesis', abbr: 'Gen', chapters: 50 },
  'exodus': { name: 'Exodus', abbr: 'Exo', chapters: 40 },
  'leviticus': { name: 'Leviticus', abbr: 'Lev', chapters: 27 },
  'numbers': { name: 'Numbers', abbr: 'Num', chapters: 36 },
  'deuteronomy': { name: 'Deuteronomy', abbr: 'Deu', chapters: 34 },
  'joshua': { name: 'Joshua', abbr: 'Jos', chapters: 24 },
  'judges': { name: 'Judges', abbr: 'Jdg', chapters: 21 },
  'ruth': { name: 'Ruth', abbr: 'Rut', chapters: 4 },
  '1 samuel': { name: '1 Samuel', abbr: '1Sa', chapters: 31 },
  '2 samuel': { name: '2 Samuel', abbr: '2Sa', chapters: 24 },
  '1 kings': { name: '1 Kings', abbr: '1Ki', chapters: 22 },
  '2 kings': { name: '2 Kings', abbr: '2Ki', chapters: 25 },
  '1 chronicles': { name: '1 Chronicles', abbr: '1Ch', chapters: 29 },
  '2 chronicles': { name: '2 Chronicles', abbr: '2Ch', chapters: 36 },
  'ezra': { name: 'Ezra', abbr: 'Ezr', chapters: 10 },
  'nehemiah': { name: 'Nehemiah', abbr: 'Neh', chapters: 13 },
  'esther': { name: 'Esther', abbr: 'Est', chapters: 10 },
  'job': { name: 'Job', abbr: 'Job', chapters: 42 },
  'psalm': { name: 'Psalm', abbr: 'Psa', chapters: 150 },
  'psalms': { name: 'Psalms', abbr: 'Psa', chapters: 150 },
  'proverbs': { name: 'Proverbs', abbr: 'Pro', chapters: 31 },
  'ecclesiastes': { name: 'Ecclesiastes', abbr: 'Ecc', chapters: 12 },
  'isaiah': { name: 'Isaiah', abbr: 'Isa', chapters: 66 },
  'jeremiah': { name: 'Jeremiah', abbr: 'Jer', chapters: 52 },
  'lamentations': { name: 'Lamentations', abbr: 'Lam', chapters: 5 },
  'ezekiel': { name: 'Ezekiel', abbr: 'Eze', chapters: 48 },
  'daniel': { name: 'Daniel', abbr: 'Dan', chapters: 12 },
  'hosea': { name: 'Hosea', abbr: 'Hos', chapters: 14 },
  'joel': { name: 'Joel', abbr: 'Joe', chapters: 3 },
  'amos': { name: 'Amos', abbr: 'Amo', chapters: 9 },
  'obadiah': { name: 'Obadiah', abbr: 'Oba', chapters: 1 },
  'jonah': { name: 'Jonah', abbr: 'Jon', chapters: 4 },
  'micah': { name: 'Micah', abbr: 'Mic', chapters: 7 },
  'nahum': { name: 'Nahum', abbr: 'Nah', chapters: 3 },
  'habakkuk': { name: 'Habakkuk', abbr: 'Hab', chapters: 3 },
  'zephaniah': { name: 'Zephaniah', abbr: 'Zep', chapters: 3 },
  'haggai': { name: 'Haggai', abbr: 'Hag', chapters: 2 },
  'zechariah': { name: 'Zechariah', abbr: 'Zec', chapters: 14 },
  'malachi': { name: 'Malachi', abbr: 'Mal', chapters: 4 },
  'matthew': { name: 'Matthew', abbr: 'Mat', chapters: 28 },
  'mark': { name: 'Mark', abbr: 'Mar', chapters: 16 },
  'luke': { name: 'Luke', abbr: 'Luk', chapters: 24 },
  'john': { name: 'John', abbr: 'Joh', chapters: 21 },
  'acts': { name: 'Acts', abbr: 'Act', chapters: 28 },
  'romans': { name: 'Romans', abbr: 'Rom', chapters: 16 },
  '1 corinthians': { name: '1 Corinthians', abbr: '1Co', chapters: 16 },
  '2 corinthians': { name: '2 Corinthians', abbr: '2Co', chapters: 13 },
  'galatians': { name: 'Galatians', abbr: 'Gal', chapters: 6 },
  'ephesians': { name: 'Ephesians', abbr: 'Eph', chapters: 6 },
  'philippians': { name: 'Philippians', abbr: 'Phi', chapters: 4 },
  'colossians': { name: 'Colossians', abbr: 'Col', chapters: 4 },
  '1 thessalonians': { name: '1 Thessalonians', abbr: '1Th', chapters: 5 },
  '2 thessalonians': { name: '2 Thessalonians', abbr: '2Th', chapters: 3 },
  '1 timothy': { name: '1 Timothy', abbr: '1Ti', chapters: 6 },
  '2 timothy': { name: '2 Timothy', abbr: '2Ti', chapters: 4 },
  'titus': { name: 'Titus', abbr: 'Tit', chapters: 3 },
  'philemon': { name: 'Philemon', abbr: 'Phl', chapters: 1 },
  'hebrews': { name: 'Hebrews', abbr: 'Heb', chapters: 13 },
  'james': { name: 'James', abbr: 'Jas', chapters: 5 },
  '1 peter': { name: '1 Peter', abbr: '1Pe', chapters: 5 },
  '2 peter': { name: '2 Peter', abbr: '2Pe', chapters: 3 },
  '1 john': { name: '1 John', abbr: '1Jo', chapters: 5 },
  '2 john': { name: '2 John', abbr: '2Jo', chapters: 1 },
  '3 john': { name: '3 John', abbr: '3Jo', chapters: 1 },
  'jude': { name: 'Jude', abbr: 'Jud', chapters: 1 },
  'revelation': { name: 'Revelation', abbr: 'Rev', chapters: 22 }
};

const booksList = Object.keys(bibleBooks);

// Initialize Supabase
async function initSupabase() {
  try {
    const response = await fetch('/api/config');
    const config = await response.json();

    if (!config.supabaseConfigured || !window.supabase) {
      loginPrompt.classList.remove('hidden');
      return;
    }

    supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;

    currentUser = data.session?.user || null;
    updateUserContent();

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user || null;
      updateUserContent();
    });
  } catch (error) {
    console.error('Supabase init failed:', error);
  }
}

// Fetch verse from Bible API
async function fetchVerse(reference) {
  try {
    bibleDisplay.innerHTML = '<div class="loading-state"><i class="fa-solid fa-book-open"></i><p>Loading Scripture...</p></div>';
    const response = await fetch(`${BIBLE_API}/${reference}`);
    
    if (!response.ok) {
      throw new Error('Verse not found');
    }

    const data = await response.json();
    currentVerses = data.verses || [];
    
    if (currentVerses.length === 0) {
      bibleDisplay.innerHTML = '<div class="error"><i class="fa-solid fa-triangle-exclamation"></i> No verses found. Try a different reference.</div>';
      return false;
    }

    displayVerses();
    currentRef.innerText = reference;
    return true;
  } catch (error) {
    bibleDisplay.innerHTML = `<div class="error"><i class="fa-solid fa-circle-exclamation"></i> <strong>Error:</strong> ${error.message}</div>`;
    return false;
  }
}

// Display verses in the Bible display area
function displayVerses() {
  if (currentVerses.length === 0) {
    bibleDisplay.innerHTML = '<div class="error"><i class="fa-solid fa-triangle-exclamation"></i> No verses to display.</div>';
    return;
  }

  let html = '<div class="verses-container">';
  
  currentVerses.forEach(verse => {
    const verseNum = verse.verse || '';
    html += `
      <div class="verse-item" data-verse-ref="${verse.reference || verse.book_name} ${verse.chapter}:${verseNum}">
        <span class="verse-number">${verseNum}</span>
        <span class="verse-text">${verse.text}</span>
      </div>
    `;
  });

  html += '</div>';
  bibleDisplay.innerHTML = html;
}

// Parse user search input (e.g., "John 3:16" or "Genesis 1")
function parseVerseReference(input) {
  input = input.trim().toLowerCase();
  
  // Try exact match first
  for (let book of booksList) {
    if (input.startsWith(book)) {
      const rest = input.slice(book.length).trim();
      if (!rest) return `${book} 1`; // If just book name, return chapter 1
      
      const match = rest.match(/^(\d+)(?::(\d+))?/);
      if (match) {
        const chapter = match[1];
        const verse = match[2] ? `:${match[2]}` : '';
        return `${book} ${chapter}${verse}`;
      }
    }
  }

  return null;
}

// Search for verse
searchBtn.addEventListener('click', async () => {
  const query = verseSearch.value.trim();
  if (!query) return;

  const reference = parseVerseReference(query);
  if (reference) {
    await fetchVerse(reference);
    verseSearch.value = '';
  } else {
    bibleDisplay.innerHTML = '<p class="error">Please use format like "John 3:16" or "Genesis 1"</p>';
  }
});

// Allow Enter key to search
verseSearch.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') searchBtn.click();
});

// Change Bible version (note: Bible-API.com only has KJV by default, but we can extend)
versionSelect.addEventListener('change', (e) => {
  currentVersion = e.target.value;
  // In a full implementation, you'd refetch with version parameter
  // For now, we'll support KJV primarily through Bible-API
});

// Navigation buttons
prevBtn.addEventListener('click', async () => {
  if (currentChapter > 1) {
    currentChapter--;
    await fetchVerse(`${currentBook} ${currentChapter}`);
  } else if (booksList.indexOf(currentBook) > 0) {
    const prevBookIndex = booksList.indexOf(currentBook) - 1;
    currentBook = booksList[prevBookIndex];
    currentChapter = bibleBooks[currentBook].chapters;
    await fetchVerse(`${currentBook} ${currentChapter}`);
  }
});

nextBtn.addEventListener('click', async () => {
  const maxChapters = bibleBooks[currentBook].chapters;
  if (currentChapter < maxChapters) {
    currentChapter++;
    await fetchVerse(`${currentBook} ${currentChapter}`);
  } else if (booksList.indexOf(currentBook) < booksList.length - 1) {
    const nextBookIndex = booksList.indexOf(currentBook) + 1;
    currentBook = booksList[nextBookIndex];
    currentChapter = 1;
    await fetchVerse(`${currentBook} ${currentChapter}`);
  }
});

// Save favorite verse
saveFavoriteBtn.addEventListener('click', async () => {
  if (!currentUser || currentVerses.length === 0) {
    alert('Please sign in to save favorites.');
    return;
  }

  try {
    const verseRef = currentRef.innerText;
    const verseText = currentVerses[0]?.text || '';

    const { error } = await supabaseClient
      .from('favorite_verses')
      .insert({
        user_id: currentUser.id,
        verse_reference: verseRef,
        verse_text: verseText
      });

    if (error) throw error;
    alert('Verse saved to favorites!');
    updateUserContent();
  } catch (error) {
    console.error('Error saving favorite:', error);
    alert('Failed to save favorite.');
  }
});

// Add note to verse
addNoteBtn.addEventListener('click', () => {
  if (!currentUser || currentVerses.length === 0) {
    alert('Please sign in to add notes.');
    return;
  }

  currentNoteVerse = currentRef.innerText;
  noteText.value = '';
  noteModal.classList.remove('hidden');
});

// Save note
saveNoteBtn.addEventListener('click', async () => {
  if (!noteText.value.trim()) {
    alert('Please enter a note.');
    return;
  }

  try {
    const { error } = await supabaseClient
      .from('verse_notes')
      .insert({
        user_id: currentUser.id,
        verse_reference: currentNoteVerse,
        note_text: noteText.value
      });

    if (error) throw error;
    noteModal.classList.add('hidden');
    alert('Note saved!');
    updateUserContent();
  } catch (error) {
    console.error('Error saving note:', error);
    alert('Failed to save note.');
  }
});

// Cancel note modal
cancelNoteBtn.addEventListener('click', () => {
  noteModal.classList.add('hidden');
});

cancelNoteFooter.addEventListener('click', () => {
  noteModal.classList.add('hidden');
});

// Character counter
noteText.addEventListener('input', () => {
  charCount.innerText = noteText.value.length;
});

// Update user content (favorites and notes)
async function updateUserContent() {
  if (!currentUser || !supabaseClient) {
    loginPrompt.classList.remove('hidden');
    favoritesList.innerHTML = '<p style="color: var(--muted); text-align: center; padding: 2rem;"><i class="fa-solid fa-lock"></i> Sign in to see your favorites.</p>';
    notesList.innerHTML = '<p style="color: var(--muted); text-align: center; padding: 2rem;"><i class="fa-solid fa-lock"></i> Sign in to see your notes.</p>';
    return;
  }

  loginPrompt.classList.add('hidden');

  try {
    // Load favorites
    const { data: favorites, error: favError } = await supabaseClient
      .from('favorite_verses')
      .select('*')
      .eq('user_id', currentUser.id);

    if (favError) throw favError;

    if (favorites && favorites.length > 0) {
      favoritesList.innerHTML = favorites
        .map(fav => `
          <div class="content-item">
            <strong>${fav.verse_reference}</strong>
            <p>${fav.verse_text}</p>
            <button class="delete-btn" onclick="deleteFavorite('${fav.id}')">
              <i class="fa-solid fa-trash-can"></i> Remove
            </button>
          </div>
        `)
        .join('');
    } else {
      favoritesList.innerHTML = '<p style="color: var(--muted); text-align: center; padding: 2rem;"><i class="fa-solid fa-bookmark"></i> No favorite verses yet. Start saving your favorites!</p>';
    }

    // Load notes
    const { data: notes, error: notesError } = await supabaseClient
      .from('verse_notes')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (notesError) throw notesError;

    if (notes && notes.length > 0) {
      notesList.innerHTML = notes
        .map(note => `
          <div class="content-item">
            <strong>${note.verse_reference}</strong>
            <p>${note.note_text}</p>
            <small style="color: var(--muted);">Added ${new Date(note.created_at).toLocaleDateString()}</small>
            <button class="delete-btn" onclick="deleteNote('${note.id}')">
              <i class="fa-solid fa-trash-can"></i> Remove
            </button>
          </div>
        `)
        .join('');
    } else {
      notesList.innerHTML = '<p style="color: var(--muted); text-align: center; padding: 2rem;"><i class="fa-solid fa-note-sticky"></i> No notes yet. Add your thoughts to verses!</p>';
    }
  } catch (error) {
    console.error('Error loading user content:', error);
  }
}

// Delete favorite
async function deleteFavorite(id) {
  try {
    const { error } = await supabaseClient
      .from('favorite_verses')
      .delete()
      .eq('id', id);

    if (error) throw error;
    updateUserContent();
  } catch (error) {
    console.error('Error deleting favorite:', error);
  }
}

// Delete note
async function deleteNote(id) {
  try {
    const { error } = await supabaseClient
      .from('verse_notes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    updateUserContent();
  } catch (error) {
    console.error('Error deleting note:', error);
  }
}

// Tab switching
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    
    // Remove active class from all buttons and panels
    tabBtns.forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.library-panel').forEach(panel => panel.classList.remove('active'));
    
    // Add active class to clicked button and corresponding panel
    btn.classList.add('active');
    document.getElementById(tabName).classList.add('active');
  });
});

// Initialize on page load
window.addEventListener('DOMContentLoaded', async () => {
  await initSupabase();
  await fetchVerse('genesis 1');
});
