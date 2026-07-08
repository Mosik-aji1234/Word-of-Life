const LOCAL_PROFILE_KEY = 'wol_profile';
const LOCAL_PROGRESS_KEY = 'wol_growth_progress';

const readingPlan = [
  { id: 'day-1', label: 'Day 1', passage: 'Genesis 1-2', focus: 'Creation and purpose' },
  { id: 'day-2', label: 'Day 2', passage: 'Psalm 23', focus: 'Trusting the Shepherd' },
  { id: 'day-3', label: 'Day 3', passage: 'Proverbs 3', focus: 'Wisdom and direction' },
  { id: 'day-4', label: 'Day 4', passage: 'John 3', focus: 'New life in Christ' },
  { id: 'day-5', label: 'Day 5', passage: 'Romans 8', focus: 'Life in the Spirit' },
  { id: 'day-6', label: 'Day 6', passage: 'Philippians 4', focus: 'Peace and contentment' },
  { id: 'day-7', label: 'Day 7', passage: 'Hebrews 11', focus: 'Faith that endures' }
];

const devotionals = [
  'Read slowly today. Ask God to show you one truth to practice before the day ends.',
  'Pause after your reading and write one sentence about what obedience looks like today.',
  'Choose one verse from your reading and turn it into a short prayer.',
  'Encourage someone with one line from Scripture today.'
];

const quiz = {
  question: 'Which book records the fruit of the Spirit?',
  answer: 'Galatians',
  options: ['Romans', 'Galatians', 'Hebrews']
};

const defaultProfile = {
  full_name: '',
  email: '',
  focus: 'Bible consistency'
};

const defaultProgress = {
  reading: {},
  devotionalDates: [],
  quiz: { attempts: 0, correct: 0 },
  activity: []
};

let supabaseClient = null;
let currentUser = null;
let currentProfile = null;
let currentProgress = { ...defaultProgress };
let prayerEntries = [];
let pendingAuthAction = 'signup';

const accountGate = document.getElementById('account-gate');
const dashboardShell = document.getElementById('dashboard-shell');
const profileForm = document.getElementById('profile-form');
const authNotice = document.getElementById('auth-notice');
const dashboardTitle = document.getElementById('dashboard-title');
const dashboardSubtitle = document.getElementById('dashboard-subtitle');
const profileName = document.getElementById('profile-name');
const profileFocus = document.getElementById('profile-focus');
const readingList = document.getElementById('reading-list');
const dailyDevotional = document.getElementById('daily-devotional');
const devotionalStatus = document.getElementById('devotional-status');
const completeDevotional = document.getElementById('complete-devotional');
const journalForm = document.getElementById('journal-form');
const journalInput = document.getElementById('journal-input');
const journalList = document.getElementById('journal-list');
const quizOptions = document.getElementById('quiz-options');
const quizMessage = document.getElementById('quiz-message');
const activityList = document.getElementById('activity-list');

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function showNotice(message, type = 'info') {
  if (!authNotice) return;
  authNotice.hidden = false;
  authNotice.className = `auth-notice ${type}`;
  authNotice.innerText = message;
}

function hideNotice() {
  if (authNotice) authNotice.hidden = true;
}

function setBusy(isBusy) {
  profileForm?.querySelectorAll('button, input, select').forEach(el => {
    el.disabled = isBusy;
  });
}

function setProfileFormMode(mode) {
  pendingAuthAction = mode;
  const password = profileForm?.elements.password;
  const signupButton = profileForm?.querySelector('[data-auth-action="signup"]');
  const signinButton = profileForm?.querySelector('[data-auth-action="signin"]');

  if (password) password.required = mode !== 'update-profile';
  if (signupButton) signupButton.innerText = mode === 'update-profile' ? 'Save profile' : 'Create account';
  if (signinButton) signinButton.hidden = mode === 'update-profile';
}

function normalizeProgress(row) {
  return {
    reading: row?.reading || {},
    devotionalDates: row?.devotional_dates || [],
    quiz: { attempts: 0, correct: 0, ...(row?.quiz || {}) },
    activity: Array.isArray(row?.activity) ? row.activity : []
  };
}

function toProgressRow(progress) {
  return {
    user_id: currentUser.id,
    reading: progress.reading || {},
    devotional_dates: progress.devotionalDates || [],
    quiz: progress.quiz || { attempts: 0, correct: 0 },
    activity: progress.activity || [],
    updated_at: new Date().toISOString()
  };
}

function getTodayDevotional() {
  const seed = todayKey().split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  return devotionals[seed % devotionals.length];
}

function calculateStreak(progress) {
  const completedDates = new Set([
    ...Object.values(progress.reading || {}).filter(Boolean),
    ...(progress.devotionalDates || [])
  ]);
  let streak = 0;
  const cursor = new Date();

  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!completedDates.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

async function initSupabase() {
  try {
    const response = await fetch('/api/config');
    const config = await response.json();

    if (!config.supabaseConfigured || !window.supabase) {
      showNotice('Supabase is not configured yet. Add SUPABASE_URL and SUPABASE_ANON_KEY to .env, then restart the server.', 'error');
      renderSignedOut();
      return;
    }

    supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;

    currentUser = data.session?.user || null;
    if (currentUser) await loadDashboardData();
    renderLayout();

    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      currentUser = session?.user || null;
      if (currentUser) await loadDashboardData();
      renderLayout();
    });
  } catch (error) {
    showNotice(`Auth setup failed: ${error.message}`, 'error');
    renderSignedOut();
  }
}

async function loadDashboardData() {
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('user_id', currentUser.id)
    .maybeSingle();

  if (profileError) throw profileError;

  currentProfile = profile || await createProfileFromUser();

  const { data: progress, error: progressError } = await supabaseClient
    .from('user_progress')
    .select('*')
    .eq('user_id', currentUser.id)
    .maybeSingle();

  if (progressError) throw progressError;

  if (!progress) {
    currentProgress = await saveProgress({ ...defaultProgress });
  } else {
    currentProgress = normalizeProgress(progress);
  }

  const { data: prayers, error: prayersError } = await supabaseClient
    .from('prayer_entries')
    .select('id, body, created_at')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (prayersError) throw prayersError;
  prayerEntries = prayers || [];
}

async function createProfileFromUser() {
  const metadata = currentUser.user_metadata || {};
  const profile = {
    user_id: currentUser.id,
    full_name: metadata.full_name || metadata.name || currentUser.email?.split('@')[0] || '',
    email: currentUser.email || '',
    focus: metadata.focus || defaultProfile.focus,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabaseClient
    .from('profiles')
    .upsert(profile, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function saveProfile(profile) {
  const payload = {
    user_id: currentUser.id,
    full_name: profile.full_name,
    email: currentUser.email || profile.email,
    focus: profile.focus || defaultProfile.focus,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabaseClient
    .from('profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  currentProfile = data;
  return data;
}

async function saveProgress(progress) {
  const { data, error } = await supabaseClient
    .from('user_progress')
    .upsert(toProgressRow(progress), { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  currentProgress = normalizeProgress(data);
  return currentProgress;
}

async function addActivity(message) {
  const nextProgress = {
    ...currentProgress,
    activity: [
      { message, date: new Date().toISOString() },
      ...(currentProgress.activity || [])
    ].slice(0, 8)
  };
  await saveProgress(nextProgress);
}

function renderSignedOut() {
  accountGate.hidden = false;
  dashboardShell.hidden = true;
  dashboardTitle.innerText = 'Sign in to your growth dashboard';
  dashboardSubtitle.innerText = 'Create a secure account or sign in to continue your Bible reading, prayer, and devotional progress.';
}

function renderLayout() {
  if (!currentUser) {
    renderSignedOut();
    return;
  }

  hideNotice();
  accountGate.hidden = true;
  dashboardShell.hidden = false;
  dashboardTitle.innerText = `Welcome, ${currentProfile.full_name || 'friend'}`;
  dashboardSubtitle.innerText = 'Your personal space for staying consistent with Scripture, prayer, and spiritual disciplines.';
  profileName.innerText = `${currentProfile.full_name || 'My'}'s dashboard`;
  profileFocus.innerText = `${currentProfile.email || currentUser.email} | Focus: ${currentProfile.focus}`;

  renderDashboard();
}

function renderDashboard() {
  renderStats(currentProgress);
  renderReadingPlan(currentProgress);
  renderDevotional(currentProgress);
  renderJournal();
  renderQuiz();
  renderActivity(currentProgress);
}

function renderStats(progress) {
  const completedDays = Object.values(progress.reading || {}).filter(Boolean).length;
  const weeklyProgress = Math.round((completedDays / readingPlan.length) * 100);

  document.getElementById('stat-reading').innerText = completedDays;
  document.getElementById('stat-streak').innerText = calculateStreak(progress);
  document.getElementById('stat-prayers').innerText = prayerEntries.length;
  document.getElementById('stat-progress').innerText = `${weeklyProgress}%`;
}

function renderReadingPlan(progress) {
  readingList.innerHTML = '';
  readingPlan.forEach(item => {
    const isDone = Boolean(progress.reading[item.id]);
    const row = document.createElement('label');
    row.className = `reading-item${isDone ? ' complete' : ''}`;
    row.innerHTML = `
      <input type="checkbox" ${isDone ? 'checked' : ''}>
      <span>
        <strong>${item.label}: ${item.passage}</strong>
        <small>${item.focus}</small>
      </span>
    `;

    row.querySelector('input').addEventListener('change', async event => {
      const nextProgress = {
        ...currentProgress,
        reading: { ...(currentProgress.reading || {}) }
      };

      if (event.target.checked) {
        nextProgress.reading[item.id] = todayKey();
      } else {
        delete nextProgress.reading[item.id];
      }

      await saveProgress(nextProgress);
      if (event.target.checked) await addActivity(`Completed ${item.passage}`);
      renderDashboard();
    });

    readingList.appendChild(row);
  });
}

function renderDevotional(progress) {
  const doneToday = (progress.devotionalDates || []).includes(todayKey());
  dailyDevotional.innerText = getTodayDevotional();
  devotionalStatus.innerText = doneToday ? 'Completed' : 'Pending';
  devotionalStatus.classList.toggle('done', doneToday);
  completeDevotional.disabled = doneToday;
  completeDevotional.innerText = doneToday ? 'Completed today' : 'Mark as completed';
}

function renderJournal() {
  journalList.innerHTML = '';
  if (!prayerEntries.length) {
    journalList.innerHTML = '<p class="empty-state">No prayer entries yet.</p>';
    return;
  }

  prayerEntries.forEach(prayer => {
    const item = document.createElement('article');
    item.className = 'journal-item';
    const body = document.createElement('p');
    const date = document.createElement('small');
    body.innerText = prayer.body;
    date.innerText = new Date(prayer.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    item.append(body, date);
    journalList.appendChild(item);
  });
}

function renderQuiz() {
  quizOptions.innerHTML = '';
  quiz.options.forEach(option => {
    const button = document.createElement('button');
    button.className = 'button-secondary';
    button.type = 'button';
    button.innerText = option;
    button.addEventListener('click', () => answerQuiz(option));
    quizOptions.appendChild(button);
  });
}

function renderActivity(progress) {
  activityList.innerHTML = '';
  if (!progress.activity.length) {
    activityList.innerHTML = '<p class="empty-state">Your recent progress will appear here.</p>';
    return;
  }

  progress.activity.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.innerHTML = `
      <span><i class="fa-solid fa-sparkles"></i></span>
      <div>
        <p>${entry.message}</p>
        <small>${new Date(entry.date).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
      </div>
    `;
    activityList.appendChild(item);
  });
}

async function answerQuiz(option) {
  const isCorrect = option === quiz.answer;
  const nextProgress = {
    ...currentProgress,
    quiz: {
      attempts: (currentProgress.quiz?.attempts || 0) + 1,
      correct: (currentProgress.quiz?.correct || 0) + (isCorrect ? 1 : 0)
    }
  };

  await saveProgress(nextProgress);
  await addActivity(isCorrect ? 'Answered the growth challenge correctly' : 'Tried the growth challenge');
  quizMessage.innerText = isCorrect ? 'Correct. Galatians 5 records the fruit of the Spirit.' : 'Good try. The answer is Galatians.';
  renderDashboard();
}

if (profileForm) {
  profileForm.querySelectorAll('[data-auth-action]').forEach(button => {
    button.addEventListener('click', () => {
      setProfileFormMode(button.dataset.authAction);
    });
  });

  profileForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!supabaseClient) {
      showNotice('Supabase is not ready yet. Check your .env settings and restart the server.', 'error');
      return;
    }

    const formData = new FormData(profileForm);
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    const focus = String(formData.get('focus') || defaultProfile.focus).trim();

    setBusy(true);
    hideNotice();

    try {
      if (pendingAuthAction === 'signin') {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        currentUser = data.user;
        await loadDashboardData();
        showNotice('Signed in successfully.', 'success');
      } else if (pendingAuthAction === 'update-profile') {
        if (!currentUser) throw new Error('Please sign in before editing your profile.');
        if (!name) throw new Error('Please enter your name.');
        await saveProfile({ full_name: name, email, focus });
        await addActivity('Updated growth profile');
        showNotice('Profile updated successfully.', 'success');
      } else {
        if (!name) throw new Error('Please enter your name before creating an account.');
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name, focus }
          }
        });
        if (error) throw error;

        if (!data.session) {
          showNotice('Account created. Check your email to confirm your account, then sign in.', 'success');
          return;
        }

        currentUser = data.user;
        await saveProfile({ full_name: name, email, focus });
        await saveProgress({ ...defaultProgress });
        await addActivity('Created growth profile');
        showNotice('Account created successfully.', 'success');
      }

      localStorage.removeItem(LOCAL_PROFILE_KEY);
      localStorage.removeItem(LOCAL_PROGRESS_KEY);
      profileForm.reset();
      setProfileFormMode('signup');
      renderLayout();
    } catch (error) {
      showNotice(error.message, 'error');
    } finally {
      setBusy(false);
    }
  });
}

if (completeDevotional) {
  completeDevotional.addEventListener('click', async () => {
    const key = todayKey();
    if (!currentProgress.devotionalDates.includes(key)) {
      await saveProgress({
        ...currentProgress,
        devotionalDates: [...currentProgress.devotionalDates, key]
      });
      await addActivity('Completed today\'s devotional');
    }
    renderDashboard();
  });
}

if (journalForm) {
  journalForm.addEventListener('submit', async event => {
    event.preventDefault();
    const text = journalInput.value.trim();
    if (!text) return;

    const { error } = await supabaseClient
      .from('prayer_entries')
      .insert({ user_id: currentUser.id, body: text });

    if (error) {
      showNotice(error.message, 'error');
      return;
    }

    await addActivity('Added a prayer journal entry');
    journalInput.value = '';
    await loadDashboardData();
    renderDashboard();
  });
}

document.getElementById('reset-plan')?.addEventListener('click', async () => {
  await saveProgress({ ...currentProgress, reading: {} });
  await addActivity('Reset the 7-day Bible reading plan');
  renderDashboard();
});

document.getElementById('clear-activity')?.addEventListener('click', async () => {
  await saveProgress({ ...currentProgress, activity: [] });
  renderDashboard();
});

document.getElementById('edit-profile')?.addEventListener('click', () => {
  if (!currentProfile) return;
  accountGate.hidden = false;
  dashboardShell.hidden = true;
  profileForm.elements.name.value = currentProfile.full_name || '';
  profileForm.elements.email.value = currentProfile.email || currentUser.email || '';
  profileForm.elements.password.value = '';
  profileForm.elements.focus.value = currentProfile.focus || defaultProfile.focus;
  setProfileFormMode('update-profile');
  dashboardTitle.innerText = 'Edit your growth profile';
  dashboardSubtitle.innerText = 'Update your details and save them to your secure profile.';
  showNotice('Update your name or focus, then save your profile.', 'info');
});

document.getElementById('sign-out')?.addEventListener('click', async () => {
  await supabaseClient?.auth.signOut();
  currentUser = null;
  currentProfile = null;
  currentProgress = { ...defaultProgress };
  prayerEntries = [];
  renderLayout();
});

initSupabase();
