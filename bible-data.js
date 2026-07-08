// Bible Books Database - Structured Reference
const bibleStructure = {
  'Old Testament': {
    'Genesis': 50, 'Exodus': 40, 'Leviticus': 27, 'Numbers': 36, 'Deuteronomy': 34,
    'Joshua': 24, 'Judges': 21, 'Ruth': 4, '1 Samuel': 31, '2 Samuel': 24,
    '1 Kings': 22, '2 Kings': 25, '1 Chronicles': 29, '2 Chronicles': 36,
    'Ezra': 10, 'Nehemiah': 13, 'Esther': 10, 'Job': 42, 'Psalm': 150, 'Psalms': 150,
    'Proverbs': 31, 'Ecclesiastes': 12, 'Isaiah': 66, 'Jeremiah': 52, 'Lamentations': 5,
    'Ezekiel': 48, 'Daniel': 12, 'Hosea': 14, 'Joel': 3, 'Amos': 9, 'Obadiah': 1,
    'Jonah': 4, 'Micah': 7, 'Nahum': 3, 'Habakkuk': 3, 'Zephaniah': 3, 'Haggai': 2,
    'Zechariah': 14, 'Malachi': 4
  },
  'New Testament': {
    'Matthew': 28, 'Mark': 16, 'Luke': 24, 'John': 21, 'Acts': 28, 'Romans': 16,
    '1 Corinthians': 16, '2 Corinthians': 13, 'Galatians': 6, 'Ephesians': 6,
    'Philippians': 4, 'Colossians': 4, '1 Thessalonians': 5, '2 Thessalonians': 3,
    '1 Timothy': 6, '2 Timothy': 4, 'Titus': 3, 'Philemon': 1, 'Hebrews': 13, 'James': 5,
    '1 Peter': 5, '2 Peter': 3, '1 John': 5, '2 John': 1, '3 John': 1, 'Jude': 1,
    'Revelation': 22
  }
};

// Sample verses database (KJV) - Core verses for demonstration
const versesDatabase = {
  'Genesis 1': {
    1: 'In the beginning God created the heaven and the earth.',
    2: 'And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters.',
    3: 'And God said, Let there be light: and there was light.'
  },
  'John 3': {
    16: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
    17: 'For God sent not his Son into the world to condemn the world; but that the world through him might be saved.'
  },
  'Psalm 23': {
    1: 'The LORD is my shepherd; I shall not want.',
    2: 'He maketh me to lie down in green pastures: he leadeth me beside the still waters.',
    3: 'He restoreth my soul: he leadeth me in the paths of righteousness for his name\'s sake.'
  }
};

// Curated popular verses
const popularVerses = [
  { ref: 'John 3:16', text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.', testament: 'New Testament' },
  { ref: 'Psalm 23:1', text: 'The LORD is my shepherd; I shall not want.', testament: 'Old Testament' },
  { ref: 'Proverbs 3:5', text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.', testament: 'Old Testament' },
  { ref: '1 Corinthians 13:4', text: 'Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up.', testament: 'New Testament' },
  { ref: 'Philippians 4:13', text: 'I can do all things through Christ which strengtheneth me.', testament: 'New Testament' },
  { ref: 'Joshua 1:9', text: 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.', testament: 'Old Testament' }
];

// Bible Versions Configuration
const bibleVersions = {
  'kjv': {
    name: 'King James Version',
    description: 'Traditional, reverent language',
    apiId: 'kjv',
    source: 'local'
  },
  'nkjv': {
    name: 'New King James Version',
    description: 'Modern update to KJV',
    apiId: 'nkjv',
    source: 'api'
  },
  'asv': {
    name: 'American Standard Version',
    description: 'Word-for-word translation',
    apiId: 'asv',
    source: 'api'
  },
  'web': {
    name: 'World English Bible',
    description: 'Simple, modern English',
    apiId: 'web',
    source: 'api'
  },
  'ylt': {
    name: 'Young\'s Literal Translation',
    description: 'Most literal translation',
    apiId: 'ylt',
    source: 'api'
  }
};

const defaultVersion = 'kjv';
