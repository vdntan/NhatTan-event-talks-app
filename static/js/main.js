// ==========================================================================
// APPLICATION STATE
// ==========================================================================
let allUpdates = [];
let selectedUpdates = new Set();
let filterType = 'all';
let searchQuery = '';

// ==========================================================================
// DOM ELEMENTS
// ==========================================================================
const themeToggle = document.getElementById('theme-toggle');
const sunIcon = themeToggle.querySelector('.sun-icon');
const moonIcon = themeToggle.querySelector('.moon-icon');

const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = refreshBtn.querySelector('.refresh-icon');
const btnText = refreshBtn.querySelector('.btn-text');

const notesTimeline = document.getElementById('notes-timeline');
const loadingState = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');

const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');

// Stats DOM Elements
const statTotal = document.getElementById('stat-total-count');
const statFeature = document.getElementById('stat-feature-count');
const statIssue = document.getElementById('stat-issue-count');
const statDeprecation = document.getElementById('stat-deprecation-count');

// Twitter Compose DOM Elements
const twitterComposerCard = document.getElementById('twitter-composer-card');
const noSelectionPrompt = document.getElementById('no-selection-prompt');
const selectionComposer = document.getElementById('selection-composer');
const selectedCountText = document.getElementById('selected-count');
const clearSelectionBtn = document.getElementById('clear-selection-btn');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCountText = document.getElementById('char-count');
const tweetComposerBtn = document.getElementById('tweet-composer-btn');

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  fetchNotes();
  setupEventListeners();
});

// ==========================================================================
// THEME MANAGEMENT (DARK/LIGHT)
// ==========================================================================
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcons(savedTheme);
}

function updateThemeIcons(theme) {
  if (theme === 'light') {
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'block';
  } else {
    sunIcon.style.display = 'block';
    moonIcon.style.display = 'none';
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcons(newTheme);
}

// ==========================================================================
// EVENT LISTENERS Setup
// ==========================================================================
function setupEventListeners() {
  // Theme Toggle
  themeToggle.addEventListener('click', toggleTheme);

  // Refresh Feed
  refreshBtn.addEventListener('click', () => fetchNotes(true));

  // Search Input (Debounced keyup)
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderTimeline();
    }, 250);
  });

  // Type Filters
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterType = btn.getAttribute('data-type');
      renderTimeline();
    });
  });

  // Clear Selection
  clearSelectionBtn.addEventListener('click', clearSelection);

  // Textarea input character count tracking
  tweetTextarea.addEventListener('input', (e) => {
    updateCharCount(e.target.value.length);
  });

  // Send Tweet from Composer
  tweetComposerBtn.addEventListener('click', () => {
    const text = encodeURIComponent(tweetTextarea.value);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  });
}

// ==========================================================================
// API INTEGRATION (FETCHING DATA)
// ==========================================================================
async function fetchNotes(forceRefresh = false) {
  try {
    // UI state loading
    showLoading(true);
    if (forceRefresh) {
      refreshIcon.classList.add('spinning');
      btnText.textContent = 'Refreshing...';
    }

    const response = await fetch(`/api/notes${forceRefresh ? '?refresh=true' : ''}`);
    if (!response.ok) throw new Error('Network response error');

    allUpdates = await response.json();
    calculateStats();
    renderTimeline();
  } catch (error) {
    console.error('Error fetching release notes:', error);
    notesTimeline.innerHTML = `<div class="empty-state"><h3>Failed to load release notes</h3><p>Please try again in a few moments.</p></div>`;
  } finally {
    showLoading(false);
    refreshIcon.classList.remove('spinning');
    btnText.textContent = 'Refresh Feed';
  }
}

function showLoading(isLoading) {
  if (isLoading) {
    loadingState.style.display = 'flex';
    notesTimeline.style.display = 'none';
    emptyState.style.display = 'none';
  } else {
    loadingState.style.display = 'none';
    notesTimeline.style.display = 'flex';
  }
}

// ==========================================================================
// STATS CALCULATIONS
// ==========================================================================
function calculateStats() {
  const total = allUpdates.length;
  const features = allUpdates.filter(u => u.type.toLowerCase() === 'feature').length;
  const issues = allUpdates.filter(u => u.type.toLowerCase() === 'issue').length;
  const others = total - features - issues;

  // Animate counters
  animateCounter(statTotal, total);
  animateCounter(statFeature, features);
  animateCounter(statIssue, issues);
  animateCounter(statDeprecation, others);
}

function animateCounter(element, target) {
  let current = 0;
  const duration = 800; // ms
  const stepTime = Math.abs(Math.floor(duration / target)) || 20;
  
  if (target === 0) {
    element.textContent = '0';
    return;
  }
  
  const timer = setInterval(() => {
    current += Math.ceil(target / 20);
    if (current >= target) {
      element.textContent = target;
      clearInterval(timer);
    } else {
      element.textContent = current;
    }
  }, stepTime);
}

// ==========================================================================
// TIMELINE RENDERING
// ==========================================================================
function renderTimeline() {
  notesTimeline.innerHTML = '';
  
  // Filter updates
  const filtered = allUpdates.filter(update => {
    const matchesSearch = update.text.toLowerCase().includes(searchQuery);
    
    let matchesType = true;
    if (filterType !== 'all') {
      if (filterType === 'Deprecation') {
        // Match both Deprecation and others that are not Feature or Issue
        const typeLower = update.type.toLowerCase();
        matchesType = typeLower !== 'feature' && typeLower !== 'issue';
      } else {
        matchesType = update.type.toLowerCase() === filterType.toLowerCase();
      }
    }
    
    return matchesSearch && matchesType;
  });

  if (filtered.length === 0) {
    emptyState.style.display = 'flex';
    return;
  }
  
  emptyState.style.display = 'none';

  // Group by date
  const groups = {};
  filtered.forEach(update => {
    if (!groups[update.date]) {
      groups[update.date] = [];
    }
    groups[update.date].push(update);
  });

  // Render grouped updates
  Object.keys(groups).forEach(date => {
    const groupContainer = document.createElement('div');
    groupContainer.className = 'timeline-group';
    
    // Header
    const groupHeader = document.createElement('div');
    groupHeader.className = 'timeline-date-header';
    groupHeader.innerHTML = `
      <div class="timeline-date-dot"></div>
      <span>${date}</span>
    `;
    groupContainer.appendChild(groupHeader);

    // Updates under this date
    groups[date].forEach(update => {
      const isSelected = selectedUpdates.has(update.id);
      const card = document.createElement('div');
      card.className = `update-card ${isSelected ? 'selected' : ''}`;
      card.id = `card-${update.id}`;
      
      // Determine badge class
      let badgeClass = 'badge-other';
      if (update.type.toLowerCase() === 'feature') badgeClass = 'badge-feature';
      else if (update.type.toLowerCase() === 'issue') badgeClass = 'badge-issue';
      else if (update.type.toLowerCase() === 'deprecation') badgeClass = 'badge-deprecation';
      
      card.innerHTML = `
        <div class="update-card-header">
          <span class="type-badge ${badgeClass}">${update.type}</span>
          
          <label class="select-checkbox-container">
            <input type="checkbox" class="select-checkbox" data-id="${update.id}" ${isSelected ? 'checked' : ''} aria-label="Select update for tweeting">
            <span class="select-label">Select</span>
          </label>
        </div>
        
        <div class="update-body">
          ${update.html}
        </div>
        
        <div class="update-actions">
          <a href="${update.link}" class="external-link" target="_blank" rel="noopener noreferrer">
            <span>Official Release Notes</span>
            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
          
          <button class="btn-tweet-single" data-id="${update.id}" aria-label="Tweet this update">
            <svg viewBox="0 0 24 24" width="12" height="12">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span>Tweet</span>
          </button>
        </div>
      `;

      // Set up click handlers
      const checkbox = card.querySelector('.select-checkbox');
      checkbox.addEventListener('change', (e) => handleSelectChange(update.id, e.target.checked));
      
      const singleTweetBtn = card.querySelector('.btn-tweet-single');
      singleTweetBtn.addEventListener('click', () => {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(update.tweet_text)}`, '_blank');
      });

      groupContainer.appendChild(card);
    });

    notesTimeline.appendChild(groupContainer);
  });
}

// ==========================================================================
// SELECTION & TWITTER DRAFT COMPILING
// ==========================================================================
function handleSelectChange(id, isChecked) {
  const card = document.getElementById(`card-${id}`);
  
  if (isChecked) {
    selectedUpdates.add(id);
    if (card) card.classList.add('selected');
  } else {
    selectedUpdates.delete(id);
    if (card) card.classList.remove('selected');
  }

  updateTwitterComposer();
}

function clearSelection() {
  selectedUpdates.clear();
  
  // Uncheck all checkboxes in UI
  document.querySelectorAll('.select-checkbox').forEach(cb => cb.checked = false);
  document.querySelectorAll('.update-card').forEach(card => card.classList.remove('selected'));
  
  updateTwitterComposer();
}

function updateTwitterComposer() {
  const count = selectedUpdates.size;
  selectedCountText.textContent = count;

  if (count === 0) {
    noSelectionPrompt.style.display = 'block';
    selectionComposer.style.display = 'none';
    return;
  }

  noSelectionPrompt.style.display = 'none';
  selectionComposer.style.display = 'block';

  // Get selected objects in order
  const selectedObjects = allUpdates.filter(u => selectedUpdates.has(u.id));

  // Compose Tweet Text
  let compiledText = "";
  if (selectedObjects.length === 1) {
    compiledText = selectedObjects[0].tweet_text;
  } else {
    compiledText = `BigQuery Updates Thread:\n\n`;
    selectedObjects.forEach((obj, idx) => {
      // Create bullet point: max content length so we don't break length limit
      const updateIntro = `${idx + 1}. [${obj.type}] ${obj.text}`;
      const url = obj.link;
      
      // Limit description to fit in thread overview
      let displayIntro = updateIntro;
      if (displayIntro.length > 80) {
        displayIntro = displayIntro.substring(0, 77) + "...";
      }
      compiledText += `${displayIntro} ${url}\n`;
    });
  }

  tweetTextarea.value = compiledText;
  updateCharCount(compiledText.length);
}

function updateCharCount(length) {
  charCountText.textContent = length;
  if (length > 280) {
    charCountText.style.color = 'var(--deprecation-color)';
    charCountText.style.fontWeight = 'bold';
    tweetComposerBtn.disabled = true;
  } else {
    charCountText.style.color = 'var(--text-muted)';
    charCountText.style.fontWeight = 'normal';
    tweetComposerBtn.disabled = false;
  }
}
