/**
 * @fileoverview Story Mode module for narrative event presentation
 * Provides guided storytelling through climate events
 */

import { store, actions, eventBus } from './js/store.js';
import { formatDate } from './js/utils/format.js';
import { qs, el, on, debounce } from './js/utils/dom.js';
import { clamp } from './js/utils/math.js';

/**
 * Story state
 * @type {import('./js/types.js').StoryState}
 */
let storyState = {
  isActive: false,
  currentStoryIndex: 0,
  stories: [],
  autoplay: false,
  speed: 'normal',
  progress: 0
};

/**
 * Story DOM elements
 */
let storyElements = {
  container: null,
  toolbar: null,
  content: null,
  navigation: null,
  progress: null
};

/**
 * Story configuration
 */
const STORY_CONFIG = {
  speeds: {
    slow: 8000,
    normal: 5000,
    fast: 3000
  },
  defaultDuration: 5000,
  transitionDuration: 800
};

/**
 * Animation state
 */
let animationState = {
  isPlaying: false,
  currentTimeout: null,
  startTime: null,
  pausedTime: 0
};

/**
 * Initialize story mode module
 * @returns {boolean} Success status
 */
export function initStoryMode() {
  try {
    console.log('📖 Initializing story mode module...');
    
    // Get DOM elements
    storyElements.container = qs('.story-mode');
    if (!storyElements.container) {
      console.warn('Story mode container not found');
      return false;
    }
    
    // Setup story UI
    setupStoryUI();
    
    // Setup event listeners
    setupStoryEvents();
    
    // Subscribe to store updates
    store.subscribe((state) => {
      updateStoryFromState(state);
    });
    
    // Initialize from current state
    const currentState = store.getState();
    if (currentState.events?.length > 0) {
      generateStoriesFromEvents(currentState.events);
    }
    
    console.log('✅ Story mode module initialized');
    return true;
    
  } catch (error) {
    console.error('❌ Story mode initialization failed:', error);
    return false;
  }
}

/**
 * Setup story mode UI
 */
function setupStoryUI() {
  const container = storyElements.container;
  
  // Cache existing elements
  storyElements.toolbar = qs('.story-bar', container);
  storyElements.content = qs('.story-content', container);
  
  if (!storyElements.content) {
    // Create content area if it doesn't exist
    const contentEl = el('div', { className: 'story-content' });
    container.appendChild(contentEl);
    storyElements.content = contentEl;
  }
  
  // Initialize content
  updateStoryContent();
  updateStoryControls();
  
  console.log('📖 Story UI setup complete');
}

/**
 * Setup story event listeners
 */
function setupStoryEvents() {
  const toolbar = storyElements.toolbar;
  if (!toolbar) return;
  
  // Play/pause button
  const playBtn = qs('.story-play', toolbar);
  if (playBtn) {
    on(playBtn, 'click', toggleStoryPlayback);
  }
  
  // Previous/next buttons
  const prevBtn = qs('.story-prev', toolbar);
  const nextBtn = qs('.story-next', toolbar);
  
  if (prevBtn) {
    on(prevBtn, 'click', previousStory);
  }
  
  if (nextBtn) {
    on(nextBtn, 'click', nextStory);
  }
  
  // Speed control
  const speedSelect = qs('.story-speed select', toolbar);
  if (speedSelect) {
    on(speedSelect, 'change', (event) => {
      setStorySpeed(event.target.value);
    });
  }
  
  // Autoplay toggle
  const autoplayToggle = qs('.story-autoplay input', toolbar);
  if (autoplayToggle) {
    on(autoplayToggle, 'change', (event) => {
      setAutoplay(event.target.checked);
    });
  }
  
  // Progress bar interaction
  const progressBar = qs('.story-progress-bar', toolbar);
  if (progressBar) {
    on(progressBar, 'click', handleProgressClick);
  }
  
  // Keyboard shortcuts
  on(document, 'keydown', (event) => {
    if (!storyState.isActive) return;
    
    switch (event.key) {
      case ' ':
        event.preventDefault();
        toggleStoryPlayback();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        previousStory();
        break;
      case 'ArrowRight':
        event.preventDefault();
        nextStory();
        break;
      case 'Escape':
        event.preventDefault();
        stopStory();
        break;
    }
  });
  
  // Store events
  eventBus.on('eventsLoaded', (events) => {
    generateStoriesFromEvents(events);
  });
  
  eventBus.on('startStory', () => {
    startStory();
  });
  
  eventBus.on('stopStory', () => {
    stopStory();
  });
}

/**
 * Generate stories from event data
 * @param {import('./js/types.js').EventRecord[]} events - Event data
 */
function generateStoriesFromEvents(events) {
  if (!events || events.length === 0) {
    storyState.stories = [];
    return;
  }
  
  // Sort events by date
  const sortedEvents = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Group events into stories (by time periods or themes)
  storyState.stories = createStoryChapters(sortedEvents);
  
  console.log(`📖 Generated ${storyState.stories.length} story chapters`);
  updateStoryControls();
}

/**
 * Create story chapters from events
 * @param {import('./js/types.js').EventRecord[]} events - Sorted events
 * @returns {Array} Story chapters
 */
function createStoryChapters(events) {
  const chapters = [];
  
  // Group events by year or significant periods
  const eventsByYear = groupEventsByYear(events);
  
  Object.entries(eventsByYear).forEach(([year, yearEvents]) => {
    if (yearEvents.length === 0) return;
    
    const chapter = {
      id: `chapter-${year}`,
      title: `Climate Events of ${year}`,
      description: `Exploring the ${yearEvents.length} significant climate events that occurred in ${year}`,
      year: parseInt(year),
      events: yearEvents,
      duration: STORY_CONFIG.defaultDuration,
      order: chapters.length
    };
    
    chapters.push(chapter);
  });
  
  // Add introduction and conclusion chapters
  if (chapters.length > 0) {
    chapters.unshift(createIntroChapter(events));
    chapters.push(createConclusionChapter(events));
  }
  
  return chapters;
}

/**
 * Group events by year
 * @param {import('./js/types.js').EventRecord[]} events - Events
 * @returns {Object} Events grouped by year
 */
function groupEventsByYear(events) {
  return events.reduce((groups, event) => {
    const year = new Date(event.date).getFullYear();
    if (!groups[year]) {
      groups[year] = [];
    }
    groups[year].push(event);
    return groups;
  }, {});
}

/**
 * Create introduction chapter
 * @param {import('./js/types.js').EventRecord[]} events - All events
 * @returns {Object} Introduction chapter
 */
function createIntroChapter(events) {
  const dateRange = {
    start: new Date(Math.min(...events.map(e => new Date(e.date)))),
    end: new Date(Math.max(...events.map(e => new Date(e.date))))
  };
  
  return {
    id: 'intro',
    title: 'Climate Events Overview',
    description: `Welcome to an interactive journey through ${events.length} significant climate events from ${formatDate(dateRange.start)} to ${formatDate(dateRange.end)}.`,
    events: [],
    duration: STORY_CONFIG.defaultDuration * 1.5,
    order: -1,
    isIntro: true
  };
}

/**
 * Create conclusion chapter
 * @param {import('./js/types.js').EventRecord[]} events - All events
 * @returns {Object} Conclusion chapter
 */
function createConclusionChapter(events) {
  const eventTypes = [...new Set(events.map(e => e.type))];
  
  return {
    id: 'conclusion',
    title: 'Understanding Climate Patterns',
    description: `We've explored ${events.length} climate events across ${eventTypes.length} different categories. These patterns help us understand our changing planet.`,
    events: [],
    duration: STORY_CONFIG.defaultDuration * 1.5,
    order: 999,
    isConclusion: true
  };
}

/**
 * Start story mode
 */
function startStory() {
  if (storyState.stories.length === 0) {
    console.warn('No stories available');
    return;
  }
  
  storyState.isActive = true;
  storyState.currentStoryIndex = 0;
  storyState.progress = 0;
  
  // Update UI
  storyElements.container.classList.add('story-mode--active');
  updateStoryContent();
  updateStoryControls();
  
  // Start autoplay if enabled
  if (storyState.autoplay) {
    playStory();
  }
  
  // Emit event
  eventBus.emit('storyStarted');
  
  console.log('📖 Story mode started');
}

/**
 * Stop story mode
 */
function stopStory() {
  storyState.isActive = false;
  pauseStory();
  
  // Update UI
  storyElements.container.classList.remove('story-mode--active');
  updateStoryControls();
  
  // Emit event
  eventBus.emit('storyStopped');
  
  console.log('📖 Story mode stopped');
}

/**
 * Toggle story playback
 */
function toggleStoryPlayback() {
  if (animationState.isPlaying) {
    pauseStory();
  } else {
    playStory();
  }
}

/**
 * Play story
 */
function playStory() {
  if (animationState.isPlaying) return;
  
  animationState.isPlaying = true;
  animationState.startTime = Date.now() - animationState.pausedTime;
  
  // Schedule next story
  scheduleNextStory();
  
  // Update UI
  updatePlayButton();
  
  eventBus.emit('storyPlaybackStarted');
}

/**
 * Pause story
 */
function pauseStory() {
  if (!animationState.isPlaying) return;
  
  animationState.isPlaying = false;
  animationState.pausedTime = Date.now() - animationState.startTime;
  
  // Clear timeout
  if (animationState.currentTimeout) {
    clearTimeout(animationState.currentTimeout);
    animationState.currentTimeout = null;
  }
  
  // Update UI
  updatePlayButton();
  
  eventBus.emit('storyPlaybackPaused');
}

/**
 * Schedule next story
 */
function scheduleNextStory() {
  if (!animationState.isPlaying) return;
  
  const currentStory = storyState.stories[storyState.currentStoryIndex];
  if (!currentStory) return;
  
  const speed = STORY_CONFIG.speeds[storyState.speed] || STORY_CONFIG.defaultDuration;
  const remainingTime = speed - animationState.pausedTime;
  
  animationState.currentTimeout = setTimeout(() => {
    if (animationState.isPlaying) {
      nextStory();
    }
  }, remainingTime);
  
  // Update progress
  updateProgress();
}

/**
 * Update progress
 */
function updateProgress() {
  if (!animationState.isPlaying) return;
  
  const currentStory = storyState.stories[storyState.currentStoryIndex];
  if (!currentStory) return;
  
  const speed = STORY_CONFIG.speeds[storyState.speed] || STORY_CONFIG.defaultDuration;
  const elapsed = Date.now() - animationState.startTime;
  const progress = clamp((elapsed / speed) * 100, 0, 100);
  
  storyState.progress = progress;
  updateProgressBar();
  
  // Schedule next update
  if (progress < 100) {
    requestAnimationFrame(() => updateProgress());
  }
}

/**
 * Go to next story
 */
function nextStory() {
  if (storyState.currentStoryIndex < storyState.stories.length - 1) {
    storyState.currentStoryIndex++;
    resetStoryProgress();
    updateStoryContent();
    updateStoryControls();
    
    if (animationState.isPlaying) {
      scheduleNextStory();
    }
  } else {
    // End of stories
    if (storyState.autoplay) {
      stopStory();
    } else {
      pauseStory();
    }
  }
}

/**
 * Go to previous story
 */
function previousStory() {
  if (storyState.currentStoryIndex > 0) {
    storyState.currentStoryIndex--;
    resetStoryProgress();
    updateStoryContent();
    updateStoryControls();
    
    if (animationState.isPlaying) {
      scheduleNextStory();
    }
  }
}

/**
 * Set story speed
 * @param {string} speed - Speed setting
 */
function setStorySpeed(speed) {
  storyState.speed = speed;
  
  // If playing, restart timing
  if (animationState.isPlaying) {
    pauseStory();
    playStory();
  }
  
  console.log(`📖 Story speed set to: ${speed}`);
}

/**
 * Set autoplay
 * @param {boolean} enabled - Autoplay enabled
 */
function setAutoplay(enabled) {
  storyState.autoplay = enabled;
  
  console.log(`📖 Autoplay ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Handle progress bar click
 * @param {MouseEvent} event - Click event
 */
function handleProgressClick(event) {
  const rect = event.target.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const percentage = (clickX / rect.width) * 100;
  
  // Jump to percentage of current story
  jumpToProgress(percentage);
}

/**
 * Jump to progress percentage
 * @param {number} percentage - Progress percentage
 */
function jumpToProgress(percentage) {
  const currentStory = storyState.stories[storyState.currentStoryIndex];
  if (!currentStory) return;
  
  const speed = STORY_CONFIG.speeds[storyState.speed] || STORY_CONFIG.defaultDuration;
  animationState.pausedTime = (percentage / 100) * speed;
  storyState.progress = percentage;
  
  updateProgressBar();
  
  if (animationState.isPlaying) {
    // Restart timing from new position
    pauseStory();
    playStory();
  }
}

/**
 * Reset story progress
 */
function resetStoryProgress() {
  animationState.pausedTime = 0;
  animationState.startTime = Date.now();
  storyState.progress = 0;
  
  if (animationState.currentTimeout) {
    clearTimeout(animationState.currentTimeout);
    animationState.currentTimeout = null;
  }
}

/**
 * Update story content
 */
function updateStoryContent() {
  const contentEl = storyElements.content;
  if (!contentEl) return;
  
  const currentStory = storyState.stories[storyState.currentStoryIndex];
  
  if (!currentStory) {
    contentEl.innerHTML = '<p>No story content available.</p>';
    return;
  }
  
  contentEl.innerHTML = `
    <div class="story-chapter">
      <h2 class="story-chapter__title">${currentStory.title}</h2>
      <p class="story-chapter__description">${currentStory.description}</p>
      
      ${currentStory.events && currentStory.events.length > 0 ? `
        <div class="story-chapter__events">
          <h3>Featured Events:</h3>
          <ul class="story-events-list">
            ${currentStory.events.map(event => `
              <li class="story-event" data-event-id="${event.id}">
                <strong>${event.title}</strong>
                <span class="story-event__date">${formatDate(new Date(event.date))}</span>
                <p class="story-event__description">${event.description || 'Climate event occurred.'}</p>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;
  
  // Add click handlers to events
  contentEl.querySelectorAll('.story-event').forEach(eventEl => {
    on(eventEl, 'click', () => {
      const eventId = eventEl.dataset.eventId;
      const event = currentStory.events.find(e => e.id === eventId);
      if (event) {
        actions.selectEvent(event);
      }
    });
  });
  
  // Trigger map/timeline updates
  if (currentStory.events && currentStory.events.length > 0) {
    eventBus.emit('storyChapterChanged', currentStory);
  }
}

/**
 * Update story controls
 */
function updateStoryControls() {
  updatePlayButton();
  updateNavigationButtons();
  updateProgressBar();
  updateStoryCounter();
}

/**
 * Update play button
 */
function updatePlayButton() {
  const playBtn = qs('.story-play');
  if (!playBtn) return;
  
  const icon = qs('.icon', playBtn);
  if (icon) {
    icon.className = animationState.isPlaying ? 'icon icon--pause' : 'icon icon--play';
  }
  
  playBtn.setAttribute('aria-label', animationState.isPlaying ? 'Pause story' : 'Play story');
}

/**
 * Update navigation buttons
 */
function updateNavigationButtons() {
  const prevBtn = qs('.story-prev');
  const nextBtn = qs('.story-next');
  
  if (prevBtn) {
    prevBtn.disabled = storyState.currentStoryIndex === 0;
  }
  
  if (nextBtn) {
    nextBtn.disabled = storyState.currentStoryIndex >= storyState.stories.length - 1;
  }
}

/**
 * Update progress bar
 */
function updateProgressBar() {
  const progressFill = qs('.story-progress-fill');
  if (progressFill) {
    progressFill.style.width = `${storyState.progress}%`;
  }
}

/**
 * Update story counter
 */
function updateStoryCounter() {
  const counter = qs('.story-counter');
  if (counter) {
    counter.textContent = `${storyState.currentStoryIndex + 1} / ${storyState.stories.length}`;
  }
}

/**
 * Update story from store state
 * @param {import('./js/types.js').AppState} state - Application state
 */
function updateStoryFromState(state) {
  // Update story mode based on global state changes
  if (state.story) {
    Object.assign(storyState, state.story);
    updateStoryControls();
  }
}

/**
 * Cleanup story module
 */
function cleanup() {
  pauseStory();
  
  if (animationState.currentTimeout) {
    clearTimeout(animationState.currentTimeout);
  }
  
  console.log('🧹 Story module cleaned up');
}

// Module event handling
eventBus.on('cleanup', cleanup);

// Export public interface
export {
  storyState,
  startStory,
  stopStory,
  nextStory,
  previousStory,
  toggleStoryPlayback
};