// Story Mode Module for Interactive Earth Story Map
import { store, storeUtils, STORY_STATUS } from './store.js';

const STORY_CONFIG = {
  autoAdvanceInterval: 4000,
  transitionDuration: 800,
  pauseOnHover: true,
  showProgress: true
};

let storyState = {
  controls: null,
  events: [],
  currentIndex: 0,
  isPlaying: false,
  autoAdvanceTimer: null,
  progress: { current: 0, total: 100 },
  isInitialized: false
};

export function initStoryMode(controlsSelector = '#storyControls') {
  try {
    console.log('🎬 Initializing story mode...');
    
    storyState.controls = document.querySelector(controlsSelector);
    if (!storyState.controls) {
      console.error('Story controls not found:', controlsSelector);
      return false;
    }
    
    setupStoryControls();
    setupStoryEventListeners();
    store.subscribe(handleStoreUpdate);
    
    storyState.isInitialized = true;
    console.log('✅ Story mode initialized successfully');
    
    return true;
    
  } catch (error) {
    console.error('❌ Story mode initialization failed:', error);
    return false;
  }
}

function setupStoryControls() {
  storyState.controls.innerHTML = `
    <div class="story-controls">
      <button id="playStoryBtn" class="story-btn story-btn--play" aria-label="Play story">
        <span class="story-btn-icon">▶️</span>
        <span class="story-btn-text">Play Story</span>
      </button>
      
      <button id="pauseStoryBtn" class="story-btn story-btn--pause" aria-label="Pause story" style="display: none;">
        <span class="story-btn-icon">⏸️</span>
        <span class="story-btn-text">Pause</span>
      </button>
      
      <button id="prevStoryBtn" class="story-btn story-btn--prev" aria-label="Previous event">
        <span class="story-btn-icon">⏮️</span>
      </button>
      
      <button id="nextStoryBtn" class="story-btn story-btn--next" aria-label="Next event">
        <span class="story-btn-icon">⏭️</span>
      </button>
    </div>
    
    <div class="story-progress" aria-label="Story progress">
      <div class="story-progress-bar">
        <div id="story-progress-fill" class="story-progress-fill" style="width: 0%"></div>
      </div>
      <div id="story-progress-text" class="story-progress-text">0/0 (0%)</div>
    </div>
  `;
}

function setupStoryEventListeners() {
  const playBtn = document.querySelector('#playStoryBtn');
  const pauseBtn = document.querySelector('#pauseStoryBtn');
  const prevBtn = document.querySelector('#prevStoryBtn');
  const nextBtn = document.querySelector('#nextStoryBtn');
  
  if (playBtn) playBtn.addEventListener('click', () => play());
  if (pauseBtn) pauseBtn.addEventListener('click', () => pause());
  if (prevBtn) prevBtn.addEventListener('click', () => prev());
  if (nextBtn) nextBtn.addEventListener('click', () => next());
}

function handleStoreUpdate(newState, prevState, action) {
  if (!storyState.isInitialized) return;
  
  if (action === 'setEventsData' || action === 'setFilteredEvents') {
    setStoryEvents(newState.filteredEvents || []);
  }
  
  if (action === 'setStoryStatus') {
    updateStoryUI(newState.story.status);
  }
}

export function play(startIndex = null) {
  if (!storyState.isInitialized) return;
  
  console.log('▶️ Starting story mode');
  
  if (startIndex !== null) {
    storyState.currentIndex = startIndex;
  }
  
  if (storyState.events.length === 0) {
    console.warn('⚠️ No events available for story mode');
    return;
  }
  
  storyState.isPlaying = true;
  storeUtils.setStoryStatus(STORY_STATUS.PLAYING);
  
  // Show first event
  showCurrentEvent();
  
  // Start auto-advance
  scheduleNext();
}

export function pause() {
  if (!storyState.isInitialized) return;
  
  console.log('⏸️ Pausing story mode');
  
  storyState.isPlaying = false;
  storeUtils.setStoryStatus(STORY_STATUS.PAUSED);
  
  clearAutoAdvance();
}

export function next(autoAdvance = false) {
  if (!storyState.isInitialized) return;
  
  if (storyState.currentIndex < storyState.events.length - 1) {
    storyState.currentIndex++;
    showCurrentEvent();
    
    if (storyState.isPlaying && !autoAdvance) {
      scheduleNext();
    }
  } else {
    // End of story
    finish();
  }
}

export function prev() {
  if (!storyState.isInitialized) return;
  
  if (storyState.currentIndex > 0) {
    storyState.currentIndex--;
    showCurrentEvent();
    
    if (storyState.isPlaying) {
      scheduleNext();
    }
  }
}

function finish() {
  console.log('🏁 Story finished');
  
  storyState.isPlaying = false;
  storeUtils.setStoryStatus(STORY_STATUS.FINISHED);
  
  clearAutoAdvance();
  
  // Reset to beginning
  setTimeout(() => {
    storyState.currentIndex = 0;
    storeUtils.setStoryStatus(STORY_STATUS.IDLE);
  }, 2000);
}

function showCurrentEvent() {
  if (storyState.currentIndex >= 0 && storyState.currentIndex < storyState.events.length) {
    const event = storyState.events[storyState.currentIndex];
    storeUtils.setActiveEvent(event.id);
    
    updateProgress();
    
    console.log('📍 Showing event:', event.title);
  }
}

function scheduleNext() {
  clearAutoAdvance();
  
  if (storyState.isPlaying) {
    storyState.autoAdvanceTimer = setTimeout(() => {
      next(true);
      if (storyState.isPlaying) {
        scheduleNext();
      }
    }, STORY_CONFIG.autoAdvanceInterval);
  }
}

function clearAutoAdvance() {
  if (storyState.autoAdvanceTimer) {
    clearTimeout(storyState.autoAdvanceTimer);
    storyState.autoAdvanceTimer = null;
  }
}

export function setStoryEvents(events) {
  storyState.events = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));
  storyState.currentIndex = 0;
  
  updateProgress();
  
  console.log('🎬 Story events set:', storyState.events.length);
}

function updateProgress() {
  if (storyState.events.length === 0) {
    storyState.progress = { current: 0, total: 100 };
  } else {
    storyState.progress = {
      current: ((storyState.currentIndex + 1) / storyState.events.length) * 100,
      total: 100
    };
  }
  
  updateProgressUI();
}

export function updateProgressUI() {
  if (!storyState.isInitialized) return;
  
  try {
    const progressFill = document.querySelector('#story-progress-fill');
    const progressText = document.querySelector('#story-progress-text');
    
    if (progressFill) {
      progressFill.style.width = `${storyState.progress.current}%`;
    }
    
    if (progressText) {
      const currentEventNum = storyState.currentIndex + 1;
      const totalEvents = storyState.events.length;
      const percentComplete = storyState.progress.current.toFixed(1);
      
      progressText.textContent = `${currentEventNum}/${totalEvents} (${percentComplete}%)`;
    }
    
  } catch (error) {
    console.error('❌ Progress UI update failed:', error);
  }
}

function updateStoryUI(status) {
  const playBtn = document.querySelector('#playStoryBtn');
  const pauseBtn = document.querySelector('#pauseStoryBtn');
  
  if (!playBtn || !pauseBtn) return;
  
  switch (status) {
    case STORY_STATUS.PLAYING:
      playBtn.style.display = 'none';
      pauseBtn.style.display = 'inline-flex';
      break;
      
    case STORY_STATUS.PAUSED:
    case STORY_STATUS.IDLE:
    case STORY_STATUS.FINISHED:
      playBtn.style.display = 'inline-flex';
      pauseBtn.style.display = 'none';
      break;
  }
}

export function cleanupStory() {
  clearAutoAdvance();
  storyState.isInitialized = false;
  
  console.log('🧹 Story mode cleaned up');
}

export { storyState, STORY_CONFIG };