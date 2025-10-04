// State Management Store for Interactive Earth Story Map
// Simple Pub/Sub pattern for state management

// Story Status Constants
export const STORY_STATUS = {
  IDLE: 'idle',
  PLAYING: 'playing',
  PAUSED: 'paused',
  FINISHED: 'finished'
};

// Filter Constants
export const FILTER_TYPES = {
  INSTRUMENT: 'instrument',
  ANOMALY_TYPE: 'anomalyType', 
  YEAR: 'year'
};

// UI Constants
export const UI_STATES = {
  POPUP_OPEN: 'popupOpen',
  LOADING: 'loading',
  ERROR: 'error'
};

// Initial Application State
const initialState = {
  // Event data
  events: [],
  filteredEvents: [],
  activeEventId: null,
  
  // Filter state
  filters: {
    instrument: '',
    anomalyType: '',
    year: ''
  },
  
  // Story mode state
  story: {
    status: STORY_STATUS.IDLE,
    order: [], // Array of event IDs in story order
    index: 0,  // Current position in story
    autoAdvanceInterval: 3000 // ms between auto-advance
  },
  
  // UI state
  ui: {
    popupOpen: false,
    loading: false,
    error: null
  },
  
  // System state
  initialized: false,
  lastUpdate: null
};

/**
 * Simple Store Implementation
 * Provides state management with pub/sub pattern
 */
class AppStore {
  constructor() {
    this.state = { ...initialState };
    this.listeners = [];
    this.middlewares = [];
    
    // Enable development features
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      this.enableDebugMode();
    }
  }
  
  /**
   * Get current state
   * @returns {object} Current application state
   */
  getState() {
    return { ...this.state };
  }
  
  /**
   * Set state and notify listeners
   * @param {object} newState - Partial state to merge
   * @param {string} action - Action name for debugging
   */
  setState(newState, action = 'setState') {
    const prevState = { ...this.state };
    
    // Apply middlewares
    let processedState = newState;
    for (const middleware of this.middlewares) {
      try {
        const result = middleware(prevState, processedState, action);
        if (result) processedState = result;
      } catch (error) {
        console.error('❌ Middleware error:', error);
      }
    }
    
    // Merge new state
    this.state = {
      ...this.state,
      ...processedState,
      lastUpdate: Date.now()
    };
    
    // Notify listeners
    this.notifyListeners(this.state, prevState, action);
    
    // Debug logging
    if (this.debugMode) {
      console.log(`🔄 State Update [${action}]:`, {
        prev: prevState,
        new: processedState,
        full: this.state
      });
    }
  }
  
  /**
   * Subscribe to state changes
   * @param {function} callback - Callback function (newState, prevState, action) => {}
   * @returns {function} Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  /**
   * Add middleware
   * @param {function} middleware - Middleware function (prevState, newState, action) => newState
   */
  addMiddleware(middleware) {
    this.middlewares.push(middleware);
  }
  
  /**
   * Reset state to initial
   */
  reset() {
    this.setState(initialState, 'reset');
  }
  
  /**
   * Enable debug mode
   */
  enableDebugMode() {
    this.debugMode = true;
    
    // Add logging middleware
    this.addMiddleware((prevState, newState, action) => {
      const changes = {};
      Object.keys(newState).forEach(key => {
        if (JSON.stringify(prevState[key]) !== JSON.stringify(newState[key])) {
          changes[key] = { from: prevState[key], to: newState[key] };
        }
      });
      
      if (Object.keys(changes).length > 0) {
        console.log(`📝 State Changes [${action}]:`, changes);
      }
      
      return newState;
    });
    
    // Expose store to window for debugging
    if (typeof window !== 'undefined') {
      window.__STORE__ = this;
    }
  }
  
  /**
   * Notify all listeners of state change
   * @private
   */
  notifyListeners(newState, prevState, action) {
    this.listeners.forEach(listener => {
      try {
        listener(newState, prevState, action);
      } catch (error) {
        console.error('❌ Listener error:', error);
      }
    });
  }
}

// Create and export singleton store instance
export const store = new AppStore();

// Export store class for testing
export { AppStore };

// Export utility functions for common operations
export const storeUtils = {
  
  /**
   * Set events data
   * @param {Array} events - Array of event objects
   */
  setEventsData(events) {
    store.setState({ 
      events,
      filteredEvents: events // Initially show all events
    }, 'setEventsData');
  },
  
  /**
   * Set filtered events
   * @param {Array} filteredEvents - Filtered array of events
   */
  setFilteredEvents(filteredEvents) {
    store.setState({ filteredEvents }, 'setFilteredEvents');
  },
  
  /**
   * Set active event
   * @param {string|null} eventId - Event ID or null to clear
   */
  setActiveEvent(eventId) {
    store.setState({ activeEventId: eventId }, 'setActiveEvent');
  },
  
  /**
   * Update filters
   * @param {object} filters - Filter updates
   */
  updateFilters(filters) {
    const currentFilters = store.getState().filters;
    store.setState({
      filters: { ...currentFilters, ...filters }
    }, 'updateFilters');
  },
  
  /**
   * Set story mode status
   * @param {string} status - Story status from STORY_STATUS constants
   */
  setStoryStatus(status) {
    const currentStory = store.getState().story;
    store.setState({
      story: { ...currentStory, status }
    }, 'setStoryStatus');
  },
  
  /**
   * Set story events order
   * @param {Array} eventIds - Array of event IDs in story order
   */
  setStoryEvents(events) {
    const currentStory = store.getState().story;
    const eventIds = events.map(event => event.id);
    store.setState({
      story: { ...currentStory, order: eventIds, index: 0 }
    }, 'setStoryEvents');
  },
  
  /**
   * Set story index
   * @param {number} index - Current story position
   */
  setStoryIndex(index) {
    const currentStory = store.getState().story;
    store.setState({
      story: { ...currentStory, index }
    }, 'setStoryIndex');
  },
  
  /**
   * Set UI state
   * @param {object} uiState - UI state updates
   */
  setUIState(uiState) {
    const currentUI = store.getState().ui;
    store.setState({
      ui: { ...currentUI, ...uiState }
    }, 'setUIState');
  },
  
  /**
   * Set loading state
   * @param {boolean} loading - Loading state
   */
  setLoading(loading) {
    const currentUI = store.getState().ui;
    store.setState({
      ui: { ...currentUI, loading }
    }, 'setLoading');
  },
  
  /**
   * Set error state
   * @param {string|null} error - Error message or null to clear
   */
  setError(error) {
    const currentUI = store.getState().ui;
    store.setState({
      ui: { ...currentUI, error }
    }, 'setError');
  }
};