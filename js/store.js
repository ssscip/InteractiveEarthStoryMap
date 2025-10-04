/**
 * @fileoverview Centralized state management with event bus
 * @requires ./types.js
 */

import './types.js';

/**
 * @type {AppState}
 */
const initialState = {
  events: [],
  filteredEvents: [],
  activeEventId: null,
  selectedEvent: null,
  filters: {
    types: [],
    severities: [],
    regions: [],
    dateRange: null,
    searchQuery: ''
  },
  story: {
    status: 'idle',
    events: [],
    currentIndex: 0,
    intervalMs: 4000,
    autoAdvance: true
  },
  isLoading: false,
  isInitialized: false,
  error: null
};

/**
 * @type {AppState}
 */
let currentState = { ...initialState };

/**
 * @type {Map<string, StateUpdateCallback[]>}
 */
const subscribers = new Map();

/**
 * @type {Map<string, EventHandler[]>}
 */
const eventHandlers = new Map();

/**
 * Event bus for loose coupling between modules
 */
export const eventBus = {
  /**
   * Subscribe to events
   * @param {string} eventName - Event name
   * @param {EventHandler} handler - Event handler
   * @returns {Function} Unsubscribe function
   */
  on(eventName, handler) {
    if (!eventHandlers.has(eventName)) {
      eventHandlers.set(eventName, []);
    }
    eventHandlers.get(eventName).push(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = eventHandlers.get(eventName);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  },

  /**
   * Emit event to all subscribers
   * @param {string} eventName - Event name
   * @param {...*} args - Event arguments
   */
  emit(eventName, ...args) {
    const handlers = eventHandlers.get(eventName);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in event handler for ${eventName}:`, error);
        }
      });
    }
  },

  /**
   * Remove all handlers for an event
   * @param {string} eventName - Event name
   */
  off(eventName) {
    eventHandlers.delete(eventName);
  }
};

/**
 * State management store
 */
export const store = {
  /**
   * Get current state (immutable copy)
   * @returns {AppState}
   */
  getState() {
    return JSON.parse(JSON.stringify(currentState));
  },

  /**
   * Subscribe to state changes
   * @param {StateUpdateCallback} callback - Callback function
   * @param {string} [action] - Specific action to listen for
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback, action = '*') {
    if (!subscribers.has(action)) {
      subscribers.set(action, []);
    }
    subscribers.get(action).push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = subscribers.get(action);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  },

  /**
   * Update state and notify subscribers
   * @param {Partial<AppState>} updates - State updates
   * @param {string} action - Action identifier
   * @returns {AppState} New state
   */
  setState(updates, action = 'update') {
    const prevState = this.getState();
    currentState = { ...currentState, ...updates };
    const newState = this.getState();
    
    // Notify specific action subscribers
    const actionSubscribers = subscribers.get(action);
    if (actionSubscribers) {
      actionSubscribers.forEach(callback => {
        try {
          callback(newState, prevState, action);
        } catch (error) {
          console.error(`Error in state subscriber for ${action}:`, error);
        }
      });
    }
    
    // Notify global subscribers
    const globalSubscribers = subscribers.get('*');
    if (globalSubscribers) {
      globalSubscribers.forEach(callback => {
        try {
          callback(newState, prevState, action);
        } catch (error) {
          console.error('Error in global state subscriber:', error);
        }
      });
    }
    
    // Emit state change event
    eventBus.emit('stateChange', newState, prevState, action);
    
    return newState;
  },

  /**
   * Reset state to initial values
   */
  reset() {
    currentState = { ...initialState };
    this.setState({}, 'reset');
  }
};

/**
 * Action creators for common state updates
 */
export const actions = {
  /**
   * General state setter
   * @param {Partial<AppState>} updates - State updates
   * @param {string} action - Action identifier
   */
  setState(updates, action = 'setState') {
    return store.setState(updates, action);
  },

  /**
   * Set loading state
   * @param {boolean} isLoading - Loading state
   */
  setLoading(isLoading) {
    store.setState({ isLoading }, 'setLoading');
  },

  /**
   * Set error state
   * @param {string|null} error - Error message
   */
  setError(error) {
    store.setState({ error }, 'setError');
  },

  /**
   * Set events data
   * @param {EventRecord[]} events - Events array
   */
  setEvents(events) {
    store.setState({ 
      events, 
      filteredEvents: events,
      isInitialized: true 
    }, 'setEvents');
  },

  /**
   * Set filtered events
   * @param {EventRecord[]} filteredEvents - Filtered events array
   */
  setFilteredEvents(filteredEvents) {
    store.setState({ filteredEvents }, 'setFilteredEvents');
  },

  /**
   * Set active event
   * @param {string|null} activeEventId - Event ID
   */
  setActiveEvent(activeEventId) {
    store.setState({ activeEventId }, 'setActiveEvent');
  },

  /**
   * Update filters
   * @param {Partial<FilterState>} filterUpdates - Filter updates
   */
  updateFilters(filterUpdates) {
    const currentFilters = store.getState().filters;
    const filters = { ...currentFilters, ...filterUpdates };
    store.setState({ filters }, 'updateFilters');
  },

  /**
   * Update story state
   * @param {Partial<StoryState>} storyUpdates - Story state updates
   */
  updateStory(storyUpdates) {
    const currentStory = store.getState().story;
    const story = { ...currentStory, ...storyUpdates };
    store.setState({ story }, 'updateStory');
  },

  /**
   * Select an event
   * @param {EventRecord} event - Event to select
   */
  selectEvent(event) {
    store.setState({ 
      activeEventId: event.id,
      selectedEvent: event 
    }, 'selectEvent');
    
    // Emit event selection
    eventBus.emit('eventSelected', event);
  }
};

/**
 * Development helpers
 */
export const devTools = {
  /**
   * Log current state to console
   */
  logState() {
    console.log('Current State:', store.getState());
  },

  /**
   * Get state history (if tracking is enabled)
   * @returns {AppState[]}
   */
  getHistory() {
    // Could be implemented with state history tracking
    return [];
  },

  /**
   * Enable debug logging
   */
  enableDebug() {
    store.subscribe((newState, prevState, action) => {
      console.group(`🔄 State Update: ${action}`);
      console.log('Previous:', prevState);
      console.log('New:', newState);
      console.groupEnd();
    });
  }
};

// Export state shape constants
export const EVENT_TYPES = {
  FIRE: 'fire',
  CO_POLLUTION: 'co_pollution',
  FLOOD: 'flood',
  STORM: 'storm',
  TEMPERATURE: 'temperature',
  VEGETATION: 'vegetation'
};

export const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

export const STORY_STATUS = {
  IDLE: 'idle',
  PLAYING: 'playing',
  PAUSED: 'paused',
  FINISHED: 'finished'
};

// Initialize store
console.log('📦 Store initialized');