/**
 * @fileoverview Main application entry point
 * Centralized initialization and module coordination
 */

import './types.js';
import { store, actions, eventBus } from './store.js';
import { loadEvents, preloadData } from './dataLoader.js';
import { initAccessibility } from './accessibility.js';
import { domReady } from './utils/dom.js';

/**
 * Application configuration
 */
const APP_CONFIG = {
  enableDemoMode: true,
  autoStartStory: false,
  keyboardShortcuts: true,
  debugMode: window.location.hostname === 'localhost',
  data: {
    loadMetadata: true,
    cacheTTL: 10 * 60 * 1000, // 10 minutes
    preloadCurrentYear: true
  },
  modules: {
    timeline: true,
    map: true,
    story: true,
    filters: true,
    notifications: true,
    popup: true
  }
};

/**
 * Application state
 */
const appState = {
  isInitialized: false,
  loadedModules: new Set(),
  errors: []
};

/**
 * Module loader with error handling
 * @param {string} moduleName - Module name
 * @param {Function} moduleLoader - Module loader function
 * @returns {Promise<boolean>} Success status
 */
async function loadModule(moduleName, moduleLoader) {
  if (!APP_CONFIG.modules[moduleName]) {
    console.log(`⏭️ Skipping disabled module: ${moduleName}`);
    return true;
  }

  try {
    console.log(`📦 Loading module: ${moduleName}`);
    const result = await moduleLoader();
    
    if (result !== false) {
      appState.loadedModules.add(moduleName);
      console.log(`✅ Module loaded: ${moduleName}`);
      
      // Emit module loaded event
      eventBus.emit('moduleLoaded', moduleName);
      return true;
    } else {
      throw new Error(`Module ${moduleName} failed to initialize`);
    }
  } catch (error) {
    console.error(`❌ Failed to load module ${moduleName}:`, error);
    appState.errors.push({ module: moduleName, error: error.message });
    
    // Emit module error event
    eventBus.emit('moduleError', moduleName, error);
    return false;
  }
}

/**
 * Load all application modules
 * @returns {Promise<void>}
 */
async function loadModules() {
  console.log('🔧 Loading application modules...');

  // Load modules in dependency order
  const moduleLoaders = [
    // Core UI modules
    {
      name: 'timeline',
      loader: async () => {
        const { initTimeline } = await import('../timeline-enhanced.js');
        return initTimeline();
      }
    },
    {
      name: 'map',
      loader: async () => {
        const { initMap } = await import('../map.js');
        return initMap();
      }
    },
    {
      name: 'filters',
      loader: async () => {
        const { initFilters } = await import('../filters.js');
        return initFilters();
      }
    },
    {
      name: 'story',
      loader: async () => {
        const { initStoryMode } = await import('../story-enhanced.js');
        return initStoryMode();
      }
    },
    {
      name: 'notifications',
      loader: async () => {
        const { initNotifications } = await import('../notifications.js');
        return initNotifications();
      }
    },
    {
      name: 'popup',
      loader: async () => {
        const { initPopup } = await import('../popup-enhanced.js');
        return initPopup();
      }
    }
  ];

  // Load modules in parallel where possible
  const results = await Promise.allSettled(
    moduleLoaders.map(({ name, loader }) => loadModule(name, loader))
  );

  // Check results
  const successful = results.filter(result => result.status === 'fulfilled' && result.value).length;
  const total = moduleLoaders.length;

  console.log(`📊 Modules loaded: ${successful}/${total}`);

  if (successful === 0) {
    throw new Error('No modules could be loaded');
  }
}

/**
 * Setup global event listeners
 */
function setupGlobalEvents() {
  // Error handling
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    actions.setError(`Application error: ${event.error.message}`);
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    actions.setError(`Promise rejection: ${event.reason}`);
  });

  // Keyboard shortcuts
  if (APP_CONFIG.keyboardShortcuts) {
    document.addEventListener('keydown', (event) => {
      // Global keyboard shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'k':
            event.preventDefault();
            eventBus.emit('focusSearch');
            break;
          case '/':
            event.preventDefault();
            eventBus.emit('showHelp');
            break;
        }
      }
    });
  }

  // Visibility change handling
  document.addEventListener('visibilitychange', () => {
    eventBus.emit('visibilityChange', !document.hidden);
  });

  console.log('🎛️ Global event listeners setup');
}

/**
 * Setup development tools
 */
function setupDevTools() {
  if (!APP_CONFIG.debugMode) return;

  // Add debug utilities to window
  window.__APP_DEBUG__ = {
    store,
    eventBus,
    appState,
    config: APP_CONFIG,
    reload: () => window.location.reload(),
    clearCache: () => {
      localStorage.clear();
      sessionStorage.clear();
      console.log('🧹 Cache cleared');
    }
  };

  // Enable store debug logging
  store.subscribe((newState, prevState, action) => {
    console.log(`🔄 [${action}]`, { prev: prevState, new: newState });
  });

  console.log('🛠️ Development tools enabled');
  console.log('Access debug utilities with: window.__APP_DEBUG__');
}

/**
 * Initialize application
 * @returns {Promise<void>}
 */
async function initializeApp() {
  try {
    console.log('🚀 Initializing Interactive Earth Story Map...');
    
    // Wait for DOM
    await domReady();
    
    // Initialize accessibility features
    initAccessibility();
    
    // Setup global event handling
    setupGlobalEvents();
    
    // Setup development tools
    setupDevTools();
    
    // Preload critical data
    if (APP_CONFIG.data.preloadCurrentYear) {
      await preloadData();
    }
    
    // Load event data
    console.log('📡 Loading application data...');
    await loadEvents({
      includeMetadata: APP_CONFIG.data.loadMetadata,
      forceRefresh: false
    });
    
    // Load and initialize modules
    await loadModules();
    
    // Setup demo mode if enabled
    if (APP_CONFIG.enableDemoMode) {
      setupDemoMode();
    }
    
    // Mark as initialized
    appState.isInitialized = true;
    store.setState({ isInitialized: true }, 'appInitialized');
    
    console.log('✅ Application initialized successfully');
    console.log(`📊 Loaded modules: ${Array.from(appState.loadedModules).join(', ')}`);
    
    // Emit initialization complete event
    eventBus.emit('appInitialized');
    
  } catch (error) {
    console.error('❌ Application initialization failed:', error);
    actions.setError(`Initialization failed: ${error.message}`);
    
    // Emit initialization error event
    eventBus.emit('appError', error);
    
    // Show error to user
    showInitializationError(error);
  }
}

/**
 * Setup demo mode features
 */
function setupDemoMode() {
  console.log('🎭 Demo mode enabled');
  
  // Welcome notification after short delay
  setTimeout(() => {
    eventBus.emit('showNotification', {
      type: 'info',
      title: 'Welcome!',
      message: 'Explore climate events using the map, timeline, and story mode.',
      duration: 8000
    });
  }, 2000);
  
  // Auto-start story mode if configured
  if (APP_CONFIG.autoStartStory) {
    setTimeout(() => {
      eventBus.emit('startStory');
    }, 5000);
  }
}

/**
 * Show initialization error to user
 * @param {Error} error - Error object
 */
function showInitializationError(error) {
  const errorContainer = document.createElement('div');
  errorContainer.className = 'app-error';
  errorContainer.innerHTML = `
    <div class="app-error__content">
      <h2>🚫 Application Error</h2>
      <p>The application failed to initialize properly.</p>
      <details>
        <summary>Error Details</summary>
        <pre>${error.message}</pre>
        <pre>${error.stack || 'No stack trace available'}</pre>
      </details>
      <button onclick="window.location.reload()" class="btn btn--primary">
        Reload Application
      </button>
    </div>
  `;
  
  document.body.appendChild(errorContainer);
}

/**
 * Cleanup function for page unload
 */
function cleanup() {
  console.log('🧹 Cleaning up application...');
  
  // Cleanup modules
  eventBus.emit('cleanup');
  
  // Clear timeouts/intervals
  // (Individual modules should handle their own cleanup)
}

// Setup cleanup on page unload
window.addEventListener('beforeunload', cleanup);

// Start application when DOM is ready
initializeApp();

// Export for external access
export {
  APP_CONFIG,
  appState,
  initializeApp,
  cleanup
};