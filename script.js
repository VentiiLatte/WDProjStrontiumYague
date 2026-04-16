// Weekly Whispers JavaScript
const ACTIVE_KEY = 'whispers_active';
const ARCHIVE_KEY = 'whispers_archive';
const RESET_TIME_KEY = 'whispers_reset_time';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const journalForm = document.getElementById('journal-form');
const forumForm = document.getElementById('forum-form');
const postsContainers = {
  journal: document.getElementById('journal-posts-container'),
  forum: document.getElementById('forum-posts-container')
};
const archiveContainer = document.getElementById('archive-container');
const navLinks = document.querySelectorAll('.nav-link');

document.addEventListener('DOMContentLoaded', init);

function init() {
  console.log("Weekly Whispers starting up...");
  checkAndPerformReset();
  renderActiveContent();

  journalForm.addEventListener('submit', handlePostSubmission);
  forumForm.addEventListener('submit', handlePostSubmission);

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchSection(e.target.dataset.target, e.target);
    });
  });

  switchSection('home', document.getElementById('nav-home'));
}

function get(key) {
  const data = localStorage.getItem(key);
  try { return data ? JSON.parse(data) : []; } 
  catch (e) { console.error(`Error parsing data for key ${key}`, e); return []; }
}

function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function checkAndPerformReset() {
  const lastReset = localStorage.getItem(RESET_TIME_KEY);
  const now = Date.now();
  if (!lastReset || (now - parseInt(lastReset) > SEVEN_DAYS_MS)) doReset(now);
}

function doReset(currentTime) {
  const active = get(ACTIVE_KEY);
  const archive = get(ARCHIVE_KEY);
  if (active.length > 0) {
    const credits = {};
    active.forEach(post => { credits[post.author] = (credits[post.author] || 0) + 1; });
    const resetTime = parseInt(localStorage.getItem(RESET_TIME_KEY) || currentTime);
    const resetDate = new Date(resetTime).toLocaleDateString();
    const currentWeekLabel = `Cycle beginning ${resetDate}`;
    const newArchiveEntry = { week: currentWeekLabel, posts: active, credits: credits };
    archive.unshift(newArchiveEntry);
    save(ARCHIVE_KEY, archive);
    save(ACTIVE_KEY, []);
  }
  localStorage.setItem(RESET_TIME_KEY, currentTime.toString());
}

function handlePostSubmission(event) {
  event.preventDefault();
  const form = event.target;
  const type = form.dataset.type;
  let author, content, day = null;

  if (type === 'journal') {
    author = document.getElementById('journal_author').value.trim();
    content = document.getElementById('journal_content').value.trim();
    day = document.getElementById('journal_day').value;
  } else {
    author = document.getElementById('forum_author').value.trim();
    content = document.getElementById('forum_content').value.trim();
  }
  if (!author || !content) return;

  const newPost = {
    id: Date.now(),
    type: type,
    content: content,
    author: author,
    credits: 1,
    day: day,
    time: new Date().toISOString()
  };

  const active = get(ACTIVE_KEY);
  active.unshift(newPost);
  save(ACTIVE_KEY, active);

  form.reset();
  renderActiveContent();
}

function renderActiveContent() {
  const allPosts = get(ACTIVE_KEY);
  renderJournal(allPosts.filter(p => p.type === 'journal'));
  renderForum(allPosts.filter(p => p.type === 'forum'));
}

function renderJournal(posts) {
  const container = postsContainers.journal;
  container.innerHTML = '';
  if (posts.length === 0) { container.innerHTML = '<p>The journal is empty. What beautiful moments will you capture this week?</p>'; return; }

  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const postsByDay = {};
  posts.forEach(post => { const day = post.day || 'Unsorted'; if (!postsByDay[day]) postsByDay[day] = []; postsByDay[day].push(post); });

  dayOrder.forEach(day => {
    if (postsByDay[day]) {
      const dayDiv = document.createElement('div');
      dayDiv.className = 'journal-entry-container';
      dayDiv.innerHTML = `<h3>📅 ${day}</h3>`;
      postsByDay[day].forEach(post => { dayDiv.innerHTML += formatPost(post, 'journal-entry'); });
      container.appendChild(dayDiv);
    }
  });
}

function renderForum(posts) {
  const container = postsContainers.forum;
  container.innerHTML = '';
  if (posts.length === 0) { container.innerHTML = '<p>The community is quiet. Start a discussion!</p>'; return; }
  posts.forEach(post => { container.innerHTML += formatPost(post, 'forum-post'); });
}

function formatPost(post, className) {
  const formattedTime = new Date(post.time).toLocaleString();
  return `
    <div class="post-entry ${className}">
      <strong>${post.type.toUpperCase()}</strong> ${post.day ? ' (' + post.day + ')' : ''}
      <p>${post.content}</p>
      <div class="meta">
  Posted by <strong>${post.author}</strong> at ${formattedTime}. — Earned ${post.credits} Whisper Credit
</div>

<div style="margin-top:8px; display:flex; gap:6px;">
  <button onclick="editPost(${post.id})">Edit</button>
  <button onclick="deletePost(${post.id})">Delete</button>
</div>
  `;
}

function renderArchive() {
  const archive = get(ARCHIVE_KEY);
  archiveContainer.innerHTML = '';
  if (archive.length === 0) { archiveContainer.innerHTML = '<p>The archives are still growing. Post something this week!</p>'; return; }

  archive.forEach(week => {
    const weekDiv = document.createElement('div');
    weekDiv.className = 'week-summary';

    let creditsHtml = '<h3>🏆 Cycle Credits</h3><ul class="credits-list">';
    Object.keys(week.credits).sort().forEach(author => { creditsHtml += `<li><strong>${author}:</strong> ${week.credits[author]} Credits</li>`; });
    creditsHtml += '</ul>';

    let postsHtml = '<h3>📜 All Whispers from this Cycle</h3>';
    week.posts.forEach(post => {
      const postClass = post.type === 'forum' ? 'forum-post' : 'journal-entry';
      const dayTag = post.day ? `[${post.day}]` : '';
      postsHtml += `<div class="post-entry ${postClass}" style="margin-top: 5px; padding: 5px;">
        <p><strong>${post.type.toUpperCase()} ${dayTag}:</strong> ${post.content}</p>
        <p class="meta">By ${post.author}</p>
      </div>`;
    });

    weekDiv.innerHTML = `<h2>🕰️ Archived Cycle: ${week.week}</h2>${creditsHtml}${postsHtml}`;
    archiveContainer.appendChild(weekDiv);
  });
}

function switchSection(targetId, clickedButton) {
  document.querySelectorAll('.content-section').forEach(section => section.style.display = 'none');
  navLinks.forEach(link => link.classList.remove('active'));
  const targetSection = document.getElementById(targetId);
  targetSection.style.display = 'block';
  clickedButton.classList.add('active');
  if (targetId === 'archive') renderArchive();
  targetSection.setAttribute('tabindex', '-1');
  targetSection.focus();
  targetSection.removeAttribute('tabindex');
}

function deletePost(id) {
  let active = get(ACTIVE_KEY);

  active = active.filter(post => post.id !== id);

  save(ACTIVE_KEY, active);
  renderActiveContent();
}

function editPost(id) {
  let active = get(ACTIVE_KEY);
  let post = active.find(p => p.id === id);
  if (!post) return;
  let newContent = prompt("Edit your post:", post.content);
  if (newContent === null || newContent.trim() === "") return;
  post.content = newContent;
  save(ACTIVE_KEY, active);
  renderActiveContent();
}
