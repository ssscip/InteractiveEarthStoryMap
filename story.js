// REFACTORED: Removed duplicate control generation; using static markup from index.html
// Story Mode Module for Interactive Earth Story Map
import { store, storeUtils, STORY_STATUS } from './store.js';
import { pushNotification } from './notifications.js';

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
  status: 'idle', // idle, playing, paused, finished
  autoAdvanceTimer: null,
  isInitialized: false
};

// Control elements
let elements = {};

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
    setupKeyboardHandlers();
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
  // Select existing elements from index.html (no innerHTML generation)
  elements.playBtn = document.querySelector('#storyPlayBtn');
  elements.pauseBtn = document.querySelector('#storyPauseBtn');
  elements.prevBtn = document.querySelector('#storyPrevBtn');
  elements.nextBtn = document.querySelector('#storyNextBtn');
  elements.resetBtn = document.querySelector('#storyResetBtn');
  elements.progressFill = document.querySelector('#storyProgressFill');
  elements.progressText = document.querySelector('#storyProgressText');
  elements.container = document.querySelector('.story-controls-container');
  
  // Verify all elements exist
  const requiredElements = ['playBtn', 'pauseBtn', 'prevBtn', 'nextBtn', 'resetBtn', 'progressFill', 'progressText', 'container'];
  for (const elementName of requiredElements) {
    if (!elements[elementName]) {
      console.error(`Story control element not found: ${elementName}`);
      return false;
    }
  }
  
  console.log('✅ Story controls elements found and connected');
  return true;
}

function setupStoryEventListeners() {
  if (elements.playBtn) elements.playBtn.addEventListener('click', () => play());
  if (elements.pauseBtn) elements.pauseBtn.addEventListener('click', () => pause());
  if (elements.prevBtn) elements.prevBtn.addEventListener('click', () => prev());
  if (elements.nextBtn) elements.nextBtn.addEventListener('click', () => next());
  if (elements.resetBtn) elements.resetBtn.addEventListener('click', () => reset());
}

function setupKeyboardHandlers() {
  document.addEventListener('keydown', (event) => {
    // Skip if user is typing in input/textarea
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
    
    switch (event.code) {
      case 'Space':
        event.preventDefault();
        if (storyState.status === 'playing') {
          pause();
        } else if (storyState.status === 'idle' || storyState.status === 'paused') {
          play();
        }
        break;
        
      case 'ArrowRight':
        event.preventDefault();
        next();
        break;
        
      case 'ArrowLeft':
        event.preventDefault();
        prev();
        break;
        
      case 'Escape':
        if (storyState.status === 'playing') {
          pause();
        }
        break;
    }
  });
}

function handleStoreUpdate(newState, prevState, action) {
  if (!storyState.isInitialized) return;
  
  if (action === 'setEventsData' || action === 'setFilteredEvents') {
    setStoryEvents(newState);
  }
  
  if (action === 'setStoryStatus') {
    updateStoryUI();
  }
}

function setStoryEvents(state) {
  // Get filtered events and sort by storyOrder
  const allEvents = state.filteredEvents || state.events || [];
  storyState.events = allEvents
    .filter(event => event.storyOrder != null)
    .sort((a, b) => a.storyOrder - b.storyOrder);
  
  console.log(`📚 Story events set: ${storyState.events.length} events`);
  
  // If no story events, hide controls
  if (storyState.events.length === 0) {
    if (elements.container) {
      elements.container.style.display = 'none';
    }
    console.info('ℹ️ No story events available, hiding story controls');
    return;
  } else {
    if (elements.container) {
      elements.container.style.display = 'flex';
    }
  }
  
  // If current event is no longer in filtered list, reset
  if (storyState.currentIndex >= storyState.events.length) {
    reset();
  }
  
  updateStoryUI();
}

export function play() {
  if (storyState.events.length === 0) {
    console.warn('⚠️ Cannot play: no story events available');
    return;
  }
  
  storyState.status = 'playing';
  
  // If at end, start from beginning
  if (storyState.currentIndex >= storyState.events.length) {
    storyState.currentIndex = 0;
  }
  
  updateStoryUI();
  updateActiveEvent();
  scheduleAuto();
  
  console.log(`▶️ Story playing from event ${storyState.currentIndex + 1}/${storyState.events.length}`);
}

export function pause() {
  storyState.status = 'paused';
  clearAuto();
  updateStoryUI();
  
  console.log('⏸️ Story paused');
}

export function next() {
  if (storyState.events.length === 0) return;
  
  if (storyState.currentIndex < storyState.events.length - 1) {
    storyState.currentIndex++;
    updateActiveEvent();
    updateStoryUI();
    
    console.log(`⏭️ Next event: ${storyState.currentIndex + 1}/${storyState.events.length}`);
  } else {
    // Reached the end
    finish();
  }
}

export function prev() {
  if (storyState.events.length === 0) return;
  
  if (storyState.currentIndex > 0) {
    storyState.currentIndex--;
    updateActiveEvent();
    updateStoryUI();
    
    console.log(`⏮️ Previous event: ${storyState.currentIndex + 1}/${storyState.events.length}`);
  }
}

function reset() {
  storyState.currentIndex = 0;
  storyState.status = 'idle';
  clearAuto();
  
  if (storyState.events.length > 0) {
    updateActiveEvent();
  }
  updateStoryUI();
  
  console.log('🔄 Story reset to beginning');
}

function finish() {
  storyState.status = 'finished';
  clearAuto();
  updateStoryUI();
  
  console.log('🏁 Story finished');
  
  // Show completion notification
  if (typeof pushNotification === 'function') {
    pushNotification({
      type: 'success',
      title: 'Story Complete',
      message: `You've viewed all ${storyState.events.length} climate events in the story.`,
      duration: 4000
    });
  }
}

function updateActiveEvent() {
  if (storyState.events.length === 0 || storyState.currentIndex >= storyState.events.length) return;
  
  const currentEvent = storyState.events[storyState.currentIndex];
  if (currentEvent) {
    store.setState({ activeEventId: currentEvent.id }, 'storyAdvance');
  }
}

function updateStoryUI() {
  if (!elements.container) return;
  
  // Set data-story-status attribute
  elements.container.setAttribute('data-story-status', storyState.status);
  
  // Update button states
  updateButtonStates();
  updateProgress();
}

function updateButtonStates() {
  if (!elements.playBtn || !elements.pauseBtn || !elements.prevBtn || !elements.nextBtn || !elements.resetBtn) return;
  
  const { status, currentIndex, events } = storyState;
  const hasEvents = events.length > 0;
  
  // Play/Pause button visibility
  if (status === 'playing') {
    elements.playBtn.style.display = 'none';
    elements.pauseBtn.style.display = 'flex';
  } else {
    elements.playBtn.style.display = 'flex';
    elements.pauseBtn.style.display = 'none';
  }
  
  // Button disabled states
  elements.playBtn.disabled = !hasEvents || status === 'playing';
  elements.pauseBtn.disabled = status !== 'playing';
  elements.prevBtn.disabled = !hasEvents || currentIndex === 0 || status === 'idle';
  elements.nextBtn.disabled = !hasEvents || currentIndex === events.length - 1 || (status !== 'playing' && status !== 'paused');
}

function updateProgress() {
  if (!elements.progressFill || !elements.progressText) return;
  
  const { currentIndex, events } = storyState;
  
  if (events.length === 0) {
    elements.progressFill.style.width = '0%';
    elements.progressText.textContent = '0/0 (0%)';
    return;
  }
  
  const percent = Math.round(((currentIndex + 1) / events.length) * 100);
  elements.progressFill.style.width = `${percent}%`;
  elements.progressText.textContent = `${currentIndex + 1}/${events.length} (${percent}%)`;
}

function clearAuto() {
  if (storyState.autoAdvanceTimer) {
    clearTimeout(storyState.autoAdvanceTimer);
    storyState.autoAdvanceTimer = null;
  }
}

function scheduleAuto() {
  clearAuto();
  
  if (storyState.status === 'playing') {
    storyState.autoAdvanceTimer = setTimeout(() => {
      next();
      if (storyState.status === 'playing') {
        scheduleAuto();
      }
    }, store.story?.intervalMs || STORY_CONFIG.autoAdvanceInterval);
  }
}

// Export additional functions for external use
export { reset };

// TODO: BACKEND - Add narration support and external story data loading