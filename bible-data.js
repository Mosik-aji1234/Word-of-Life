const bibleStructure = {
  'Old Testament': {
    Genesis: 50, Exodus: 40, Leviticus: 27, Numbers: 36, Deuteronomy: 34,
    Joshua: 24, Judges: 21, Ruth: 4, '1 Samuel': 31, '2 Samuel': 24,
    '1 Kings': 22, '2 Kings': 25, '1 Chronicles': 29, '2 Chronicles': 36,
    Ezra: 10, Nehemiah: 13, Esther: 10, Job: 42, Psalms: 150,
    Proverbs: 31, Ecclesiastes: 12, 'Song of Solomon': 8, Isaiah: 66,
    Jeremiah: 52, Lamentations: 5, Ezekiel: 48, Daniel: 12, Hosea: 14,
    Joel: 3, Amos: 9, Obadiah: 1, Jonah: 4, Micah: 7, Nahum: 3,
    Habakkuk: 3, Zephaniah: 3, Haggai: 2, Zechariah: 14, Malachi: 4
  },
  'New Testament': {
    Matthew: 28, Mark: 16, Luke: 24, John: 21, Acts: 28, Romans: 16,
    '1 Corinthians': 16, '2 Corinthians': 13, Galatians: 6, Ephesians: 6,
    Philippians: 4, Colossians: 4, '1 Thessalonians': 5, '2 Thessalonians': 3,
    '1 Timothy': 6, '2 Timothy': 4, Titus: 3, Philemon: 1, Hebrews: 13,
    James: 5, '1 Peter': 5, '2 Peter': 3, '1 John': 5, '2 John': 1,
    '3 John': 1, Jude: 1, Revelation: 22
  }
};

const bibleBooks = Object.entries(bibleStructure).flatMap(([testament, books]) =>
  Object.entries(books).map(([name, chapters]) => ({ name, testament, chapters }))
);

const bookAliases = {
  ge: 'Genesis', gen: 'Genesis',
  ex: 'Exodus', exo: 'Exodus',
  lev: 'Leviticus', num: 'Numbers', deut: 'Deuteronomy',
  josh: 'Joshua', judg: 'Judges',
  '1 sam': '1 Samuel', 'i samuel': '1 Samuel', '2 sam': '2 Samuel', 'ii samuel': '2 Samuel',
  '1 kgs': '1 Kings', '1 ki': '1 Kings', '2 kgs': '2 Kings', '2 ki': '2 Kings',
  '1 chr': '1 Chronicles', '2 chr': '2 Chronicles',
  neh: 'Nehemiah', est: 'Esther',
  ps: 'Psalms', psa: 'Psalms', psalm: 'Psalms', psalms: 'Psalms',
  prov: 'Proverbs', pro: 'Proverbs', ecc: 'Ecclesiastes',
  song: 'Song of Solomon', sos: 'Song of Solomon',
  isa: 'Isaiah', jer: 'Jeremiah', lam: 'Lamentations', ezek: 'Ezekiel',
  dan: 'Daniel', hos: 'Hosea', obad: 'Obadiah', jon: 'Jonah', mic: 'Micah',
  nah: 'Nahum', hab: 'Habakkuk', zeph: 'Zephaniah', hag: 'Haggai',
  zech: 'Zechariah', mal: 'Malachi',
  mt: 'Matthew', matt: 'Matthew', mk: 'Mark', mrk: 'Mark', lk: 'Luke',
  jn: 'John', joh: 'John', acts: 'Acts', rom: 'Romans',
  '1 cor': '1 Corinthians', 'i corinthians': '1 Corinthians',
  '2 cor': '2 Corinthians', 'ii corinthians': '2 Corinthians',
  gal: 'Galatians', eph: 'Ephesians', phil: 'Philippians', col: 'Colossians',
  '1 thess': '1 Thessalonians', '2 thess': '2 Thessalonians',
  '1 tim': '1 Timothy', '2 tim': '2 Timothy',
  tit: 'Titus', philem: 'Philemon', heb: 'Hebrews', jas: 'James',
  '1 pet': '1 Peter', '2 pet': '2 Peter', '1 jn': '1 John', '2 jn': '2 John',
  '3 jn': '3 John', rev: 'Revelation'
};

const popularVerses = [
  { ref: 'John 3:16', testament: 'New Testament' },
  { ref: 'Psalms 23:1', testament: 'Old Testament' },
  { ref: 'Proverbs 3:5', testament: 'Old Testament' },
  { ref: '1 Corinthians 13:4', testament: 'New Testament' },
  { ref: 'Philippians 4:13', testament: 'New Testament' },
  { ref: 'Joshua 1:9', testament: 'Old Testament' },
  { ref: 'Romans 8:28', testament: 'New Testament' },
  { ref: 'Matthew 6:33', testament: 'New Testament' }
];

const bibleVersions = {
  kjv: {
    name: 'King James Version',
    label: 'KJV',
    apiId: 'kjv',
    available: true
  },
  web: {
    name: 'World English Bible',
    label: 'WEB',
    apiId: 'web',
    available: true
  },
  asv: {
    name: 'American Standard Version',
    label: 'ASV',
    apiId: 'asv',
    available: true
  },
  ylt: {
    name: 'Young Literal Translation',
    label: 'YLT',
    apiId: 'ylt',
    available: true
  }
};

const localVerseFallbacks = {
  'John 3:16': {
    reference: 'John 3:16',
    translation: 'kjv',
    verses: [{ book: 'John', chapter: 3, verse: 16, text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.' }]
  },
  'Psalms 23:1': {
    reference: 'Psalms 23:1',
    translation: 'kjv',
    verses: [{ book: 'Psalms', chapter: 23, verse: 1, text: 'The LORD is my shepherd; I shall not want.' }]
  },
  'Proverbs 3:5': {
    reference: 'Proverbs 3:5',
    translation: 'kjv',
    verses: [{ book: 'Proverbs', chapter: 3, verse: 5, text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.' }]
  },
  'Philippians 4:13': {
    reference: 'Philippians 4:13',
    translation: 'kjv',
    verses: [{ book: 'Philippians', chapter: 4, verse: 13, text: 'I can do all things through Christ which strengtheneth me.' }]
  }
};
