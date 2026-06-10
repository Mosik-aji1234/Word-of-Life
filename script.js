const verses = [
  { text: "The Lord is my shepherd; I shall not want.", ref: "Psalm 23:1" },
  { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
  { text: "Trust in the Lord with all your heart and lean not on your own understanding.", ref: "Proverbs 3:5" },
  { text: "Be strong and courageous. Do not be afraid.", ref: "Joshua 1:9" },
  { text: "For God so loved the world that He gave His only begotten Son that whoever believes in Him should not perish but have everlasting life.", ref: "John 3:16" },
  { text: "The entrance of Your words gives light; it gives understanding to the simple.", ref: "Psalm 119:130" },
  { text: "Your word is a lamp to my feet and a light to my path.", ref: "Psalm 119:105" },
  { text: "Cast your burden on the Lord, and He shall sustain you.", ref: "Psalm 55:22" },
  { text: "But seek first the kingdom of God and His righteousness, and all these things shall be added to you.", ref: "Matthew 6:33" },
  { text: "Let all that you do be done with love.", ref: "1 Corinthians 16:14" }
];

const verseElement = document.getElementById('verse');
const verseRefElement = document.getElementById('verse-ref');
const verseLabelElement = document.getElementById('verse-label');
const newVerseButton = document.getElementById('new-verse');

function getTodayKey() {
  const today = new Date();
  return `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
}

function getDailyVerse() {
  const seed = getTodayKey()
    .split('')
    .reduce((total, character) => total + character.charCodeAt(0), 0);
  return verses[seed % verses.length];
}

function getRandomVerse() {
  return verses[Math.floor(Math.random() * verses.length)];
}

function renderVerse(verse, label = "Today's verse") {
  if (verseElement) verseElement.innerText = verse.text;
  if (verseRefElement) verseRefElement.innerText = verse.ref;
  if (verseLabelElement) verseLabelElement.innerText = label;
}

async function fetchDailyVerse() {
  const response = await fetch('/api/daily-verse');
  if (!response.ok) throw new Error('Daily verse API is unavailable');
  return response.json();
}

async function showDailyVerse() {
  try {
    const verse = await fetchDailyVerse();
    renderVerse(verse, verse.source === 'fallback' ? "Today's verse" : "Today's live verse");
  } catch (error) {
    renderVerse(getDailyVerse());
  }
}

if (newVerseButton) {
  newVerseButton.addEventListener('click', () => {
    renderVerse(getRandomVerse(), 'Another verse for you');
  });
}

const devotionalButton = document.getElementById('devotional-button');
const devotionalPrompt = document.getElementById('devotional-prompt');
const prayerForm = document.getElementById('prayer-form');
const prayerInput = document.getElementById('prayer-input');
const prayerMessage = document.getElementById('prayer-message');

const devotionalPrompts = [
  'Pray for wisdom to apply this verse in one specific area of your life.',
  'Ask God to help you see how this verse changes your attitude today.',
  'Write down one way you can show love through action after reading this verse.'
];

if (devotionalButton) {
  devotionalButton.addEventListener('click', () => {
    const prompt = devotionalPrompts[Math.floor(Math.random() * devotionalPrompts.length)];
    if (devotionalPrompt) devotionalPrompt.innerText = prompt;
  });
}

if (prayerForm) {
  prayerForm.addEventListener('submit', event => {
    event.preventDefault();
    const request = prayerInput?.value.trim();
    if (!request) {
      if (prayerMessage) prayerMessage.innerText = 'Please enter a short prayer request.';
      return;
    }
    if (prayerMessage) prayerMessage.innerText = 'Thank you! Your prayer request is noted here for you to pray over.';
    if (prayerInput) prayerInput.value = '';
  });
}

showDailyVerse();
