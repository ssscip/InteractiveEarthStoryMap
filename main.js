// Main Module for Interactive Earth Story Map
// Application entry point with initialization, data loading, and event coordination

// Import all modules
import { store, storeUtils, STORY_STATUS } from './store.js';
import { sampleEvents } from './sampleData.js';
import { initTimeline, renderTimeline, selectTimelineItem } from './timeline.js';
import { initMap, renderHotspots, focusHotspot, emulateZoomToEvent } from './map.js';
import { initStoryMode, play, pause, next, prev } from './story.js';
import { initFilters, applyFilters } from './filters.js';
import { initNotifications, pushNotification, notificationUtils } from './notifications.js';
import { el, qs, qsa, on, trapFocus, releaseFocus, safeFocus } from './utils.js';

// Application configuration
const APP_CONFIG = {
  dataUrl: './events.mock.json',        // Mock data URL
  enableDemoMode: true,                 // Enable demo notifications
  autoStartStory: false,                // Auto-start story mode
  keyboardShortcuts: true,              // Enable keyboard shortcuts
  debugMode: window.location.hostname === 'localhost',
  initDelay: 100,                       // Delay before initialization (ms)
  demoNotificationInterval: 10000,      // Demo notification interval (ms)
};

// Application state
let appState = {
  isInitialized: false,
  modules: {
    timeline: false,
    map: false,
    story: false,
    filters: false,
    notifications: false
  },
  activePopup: null,
  keyboardListeners: [],
  demoTimer: null,
  loadingEvents: false
};

/**
 * Application entry point
 * Initializes all modules and sets up event coordination
 */
async function init() {
  try {
    console.log('🚀 Initializing Interactive Earth Story Map...');
    
    // Show loading state
    showLoadingState();
    
    // Add small delay for better UX
    await new Promise(resolve => setTimeout(resolve, APP_CONFIG.initDelay));
    
    // Load event data
    const events = await loadEventData();
    
    // Initialize store with events
    initializeStore(events);
    
    // Initialize all modules
    await initializeModules();
    
    // Set up cross-module event coordination
    setupEventCoordination();
    
    // Set up keyboard shortcuts
    if (APP_CONFIG.keyboardShortcuts) {
      setupKeyboardShortcuts();
    }
    
    // Hide loading state
    hideLoadingState();
    
    // Show welcome notification
    showWelcomeNotification();
    
    // Start demo mode if enabled
    if (APP_CONFIG.enableDemoMode) {
      startDemoMode();
    }
    
    appState.isInitialized = true;
    console.log('✅ Application initialized successfully');
    
  } catch (error) {
    console.error('❌ Application initialization failed:', error);
    handleInitializationError(error);
  }
}

/**
 * Load event data from sample data
 * Direct use of sample data for better reliability
 * @returns {Array} Array of event objects
 */
async function loadEventData() {
  try {
    appState.loadingEvents = true;
    
    console.log('� Loading sample event data...');
    
    // Use sample data directly for better reliability in browser
    console.log('✅ Using sample data:', sampleEvents.length, 'events');
    return validateEventsData(sampleEvents);
    
  } catch (error) {
    console.error('❌ Failed to load sample data:', error);
    return [];
    
  } finally {
    appState.loadingEvents = false;
  }
}

/**
 * Initialize application store with event data
 * @param {Array} events - Array of event objects
 */
function initializeStore(events) {
  console.log('🏪 Initializing store with', events.length, 'events');
  
  // Set initial events data
  storeUtils.setEventsData(events);
  
  // Initialize filtered events (start with all events)
  storeUtils.setFilteredEvents(events);
  
  console.log('✅ Store initialized');
}

/**
 * Initialize all UI modules
 */
async function initializeModules() {
  console.log('🔧 Initializing modules...');
  
  try {
    // Initialize notifications first (for error reporting)
    appState.modules.notifications = initNotifications();
    console.log('✅ Notifications module initialized');
    
    // Initialize filters
    appState.modules.filters = initFilters();
    console.log('✅ Filters module initialized');
    
    // Initialize timeline
    appState.modules.timeline = initTimeline();
    console.log('✅ Timeline module initialized');
    
    // Initialize map
    appState.modules.map = initMap();
    console.log('✅ Map module initialized');
    
    // Initialize story mode
    appState.modules.story = initStoryMode();
    console.log('✅ Story mode initialized');
    
    // Render initial UI state
    await renderInitialState();
    
    console.log('✅ All modules initialized successfully');
    
  } catch (error) {
    console.error('❌ Module initialization failed:', error);
    throw error;
  }
}

/**
 * Render initial UI state
 */
async function renderInitialState() {
  try {
    const state = store.getState();
    
    // Render timeline with all events
    renderTimeline();
    
    // Render map hotspots
    renderHotspots(state.filteredEvents);
    
    // Apply initial filters (if any)
    applyFilters();
    
    console.log('✅ Initial UI state rendered');
    
  } catch (error) {
    console.error('❌ Initial state rendering failed:', error);
  }
}

/**
 * Set up cross-module event coordination
 */
function setupEventCoordination() {
  console.log('🔗 Setting up event coordination...');
  
  // Listen for active event changes
  store.subscribe((state, prevState) => {
    const { activeEventId } = state;
    const prevActiveEventId = prevState?.activeEventId;
    
    if (activeEventId !== prevActiveEventId) {
      console.log('🎯 Active event changed:', activeEventId);
      
      // Update timeline selection
      selectTimelineItem(activeEventId);
      
      // Focus map hotspot
      if (activeEventId) {
        focusHotspot(activeEventId);
      }
      
      // Update story mode if active
      const storyState = store.getState().story;
      if (storyState.status !== STORY_STATUS.IDLE) {
        // Find event index and update story position
        const eventIndex = state.filteredEvents.findIndex(e => e.id === activeEventId);
        if (eventIndex !== -1) {
          storeUtils.setStoryIndex(eventIndex);
        }
      }
    }
  });
  
  // Listen for filtered events changes
  store.subscribe((state, prevState) => {
    const { filteredEvents } = state;
    const prevFilteredEvents = prevState?.filteredEvents;
    
    if (filteredEvents !== prevFilteredEvents) {
      console.log('🔍 Filtered events changed:', filteredEvents.length, 'events');
      
      // Update timeline
      renderTimeline();
      
      // Update map hotspots
      renderHotspots(filteredEvents);
      
      // Update story mode events
      if (appState.modules.story) {
        // Re-initialize story with new filtered events
        const storyState = store.getState().story;
        if (storyState.status !== STORY_STATUS.IDLE) {
          // Reset story with new events
          storeUtils.setStoryEvents(filteredEvents);
        }
      }
    }
  });
  
  // Listen for story mode changes
  store.subscribe((state, prevState) => {
    const storyStatus = state.story.status;
    const prevStoryStatus = prevState?.story?.status;
    
    if (storyStatus !== prevStoryStatus) {
      console.log('🎬 Story status changed:', storyStatus);
      
      // Update UI based on story mode
      updateStoryModeUI(storyStatus);
    }
  });
  
  console.log('✅ Event coordination set up');
}

/**
 * Update UI based on story mode status
 */
function updateStoryModeUI(status) {
  const storyControls = qs('#storyControls');
  if (!storyControls) return;
  
  // Update controls visibility and state
  const playBtn = qs('#playStoryBtn', storyControls);
  const pauseBtn = qs('#pauseStoryBtn', storyControls);
  
  if (playBtn && pauseBtn) {
    switch (status) {
      case STORY_STATUS.PLAYING:
        playBtn.style.display = 'none';
        pauseBtn.style.display = 'inline-flex';
        break;
        
      case STORY_STATUS.PAUSED:
      case STORY_STATUS.IDLE:
        playBtn.style.display = 'inline-flex';
        pauseBtn.style.display = 'none';
        break;
        
      case STORY_STATUS.FINISHED:
        playBtn.style.display = 'inline-flex';
        pauseBtn.style.display = 'none';
        // Show completion notification
        pushNotification({
          type: 'success',
          title: 'Story Complete',
          message: 'You have viewed all events in the story.',
          duration: 5000
        });
        break;
    }
  }
}

/**
 * Set up keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  console.log('⌨️ Setting up keyboard shortcuts...');
  
  const keyboardHandler = (event) => {
    // Skip if user is typing in an input
    if (event.target.tagName === 'INPUT' || 
        event.target.tagName === 'TEXTAREA' || 
        event.target.contentEditable === 'true') {
      return;
    }
    
    switch (event.key) {
      case 'Escape':
        // Close any open popups
        if (appState.activePopup) {
          appState.activePopup.remove();
          appState.activePopup = null;
        }
        
        // Stop story mode
        const storyState = store.getState().story;
        if (storyState.status === STORY_STATUS.PLAYING) {
          pause();
        }
        
        // Clear active event
        storeUtils.setActiveEvent(null);
        break;
        
      case ' ': // Spacebar
        if (!event.ctrlKey && !event.altKey && !event.shiftKey) {
          event.preventDefault();
          
          const storyState = store.getState().story;
          if (storyState.status === STORY_STATUS.PLAYING) {
            pause();
          } else if (storyState.status === STORY_STATUS.PAUSED || 
                    storyState.status === STORY_STATUS.IDLE) {
            play();
          }
        }
        break;
        
      case 'ArrowLeft':
        if (event.ctrlKey) {
          event.preventDefault();
          prev();
        }
        break;
        
      case 'ArrowRight':
        if (event.ctrlKey) {
          event.preventDefault();
          next();
        }
        break;
        
      case 'r':
        if (event.ctrlKey) {
          event.preventDefault();
          // Reset filters
          applyFilters({
            instrument: '',
            anomalyType: '',
            year: ''
          });
        }
        break;
    }
  };
  
  document.addEventListener('keydown', keyboardHandler);
  appState.keyboardListeners.push(keyboardHandler);
  
  console.log('✅ Keyboard shortcuts enabled');
  console.log('  - ESC: Close popups, stop story, clear selection');
  console.log('  - SPACE: Play/pause story');
  console.log('  - CTRL+←/→: Previous/next event');
  console.log('  - CTRL+R: Reset filters');
}

/**
 * Start demo mode with periodic notifications
 */
function startDemoMode() {
  console.log('🎭 Starting demo mode...');
  
  const demoMessages = [
    {
      type: 'info',
      title: 'Demo Mode Active',
      message: 'This is a demonstration of the notification system.',
      duration: 4000
    },
    {
      type: 'success',
      title: 'Data Loaded',
      message: 'Sample climate events have been loaded successfully.',
      duration: 4000
    },
    {
      type: 'warning', 
      title: 'Simulation Data',
      message: 'Please note: This demo uses simulated data for demonstration purposes.',
      duration: 5000
    }
  ];
  
  let messageIndex = 0;
  
  const showDemoNotification = () => {
    if (messageIndex < demoMessages.length) {
      pushNotification(demoMessages[messageIndex]);
      messageIndex++;
      
      appState.demoTimer = setTimeout(showDemoNotification, APP_CONFIG.demoNotificationInterval);
    }
  };
  
  // Start after a short delay
  appState.demoTimer = setTimeout(showDemoNotification, 3000);
}

// Utility functions

/**
 * Show loading state
 */
function showLoadingState() {
  const loadingIndicator = qs('#loadingIndicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'block';
  }
  
  // Add loading class to body
  document.body.classList.add('app-loading');
  
  console.log('⏳ Loading state shown');
}

/**
 * Hide loading state
 */
function hideLoadingState() {
  const loadingIndicator = qs('#loadingIndicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
  
  // Remove loading class from body
  document.body.classList.remove('app-loading');
  
  console.log('✅ Loading state hidden');
}

/**
 * Show welcome notification
 */
function showWelcomeNotification() {
  pushNotification({
    type: 'success',
    title: 'Welcome to Earth Story Map',
    message: 'Interactive visualization of satellite climate data is ready!',
    duration: 6000,
    actions: [
      {
        label: 'Start Tour',
        handler: () => {
          // Start story mode
          play();
        }
      }
    ]
  });
}

/**
 * Handle initialization errors
 * @param {Error} error - Error object
 */
function handleInitializationError(error) {
  console.error('💥 Critical initialization error:', error);
  
  // Hide loading state
  hideLoadingState();
  
  // Show error notification
  if (appState.modules.notifications) {
    pushNotification({
      type: 'error',
      title: 'Initialization Failed',
      message: `Application failed to start: ${error.message}`,
      persistent: true,
      actions: [
        {
          label: 'Retry',
          handler: () => {
            window.location.reload();
          }
        }
      ]
    });
  } else {
    // Fallback error display
    const errorDiv = el('div', {
      style: 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #ff4444; color: white; padding: 20px; border-radius: 8px; max-width: 400px; text-align: center; z-index: 10000;'
    }, `
      <h3>Initialization Failed</h3>
      <p>${error.message}</p>
      <button onclick="window.location.reload()">Retry</button>
    `);
    
    document.body.appendChild(errorDiv);
  }
}

/**
 * Validate events data structure
 * @param {Array} events - Events array to validate
 * @returns {Array} Validated events
 */
function validateEventsData(events) {
  if (!Array.isArray(events)) {
    throw new Error('Events data must be an array');
  }
  
  const validEvents = events.filter(event => {
    // Validate required fields
    if (!event.id || !event.type || !event.title || !event.date) {
      console.warn('⚠️ Invalid event found, skipping:', event);
      return false;
    }
    
    // Validate location data
    if (!event.location?.coordinates?.lat || !event.location?.coordinates?.lng) {
      console.warn('⚠️ Event missing location data, skipping:', event.id);
      return false;
    }
    
    return true;
  });
  
  console.log(`✅ Validated ${validEvents.length}/${events.length} events`);
  return validEvents;
}

/**
 * Clean up application resources
 */
function cleanup() {
  console.log('🧹 Cleaning up application resources...');
  
  // Clear demo timer
  if (appState.demoTimer) {
    clearTimeout(appState.demoTimer);
  }
  
  // Remove keyboard listeners
  appState.keyboardListeners.forEach(listener => {
    document.removeEventListener('keydown', listener);
  });
  
  // Clean up popups
  if (appState.activePopup) {
    appState.activePopup.remove();
  }
  
  // Release focus traps
  releaseFocus();
  
  console.log('✅ Application cleaned up');
}

// Initialize application when module loads
init();

// Handle page unload
window.addEventListener('beforeunload', cleanup);

// Export for debugging
if (APP_CONFIG.debugMode) {
  window.__APP_STATE__ = appState;
  window.__APP_CONFIG__ = APP_CONFIG;
}

// Export main functions for external use
export { init, cleanup, appState };