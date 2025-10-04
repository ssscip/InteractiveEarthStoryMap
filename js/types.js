/**
 * @fileoverview Type definitions for Interactive Earth Story Map
 */

/**
 * @typedef {Object} Coordinates
 * @property {number} lat - Latitude
 * @property {number} lng - Longitude
 */

/**
 * @typedef {Object} MapPosition
 * @property {number} xPercent - X position as percentage (0-100)
 * @property {number} yPercent - Y position as percentage (0-100)
 */

/**
 * @typedef {Object} EventLocation
 * @property {string} name - Human readable location name
 * @property {Coordinates} coordinates - Geographic coordinates
 * @property {MapPosition} mapPosition - Position on the visual map
 */

/**
 * @typedef {Object} EventMetadata
 * @property {string} [area_burned] - Area burned (for fires)
 * @property {string} [detection_time] - Detection timestamp
 * @property {string} [fire_radiative_power] - Fire power (MW)
 * @property {string} [co_concentration] - CO concentration (ppmv)
 * @property {string} [detection_altitude] - Detection altitude
 * @property {string} [source_type] - Source type
 * @property {string} [flood_extent] - Flood area coverage
 * @property {string} [water_depth] - Water depth range
 * @property {string} [affected_population] - Population affected
 */

/**
 * @typedef {Object} TimelineEvent
 * @property {string} date - ISO timestamp
 * @property {string} event - Event type
 * @property {string} description - Event description
 */

/**
 * @typedef {Object} EventRecord
 * @property {string} id - Unique event identifier
 * @property {'fire'|'co_pollution'|'flood'|'storm'|'temperature'|'vegetation'} type - Event type
 * @property {string} title - Event title
 * @property {string} summary - Brief description
 * @property {EventLocation} location - Location information
 * @property {'low'|'medium'|'high'} severity - Severity level
 * @property {string} instrument - Detection instrument
 * @property {string} satellite - Satellite name
 * @property {string} date - ISO timestamp
 * @property {number} confidence - Confidence percentage (0-100)
 * @property {number} [storyOrder] - Order in story mode (1-N)
 * @property {EventMetadata} metadata - Additional event-specific data
 * @property {TimelineEvent[]} [timeline] - Event timeline
 */

/**
 * @typedef {Object} FilterState
 * @property {string[]} types - Selected event types
 * @property {string[]} severities - Selected severity levels
 * @property {string[]} regions - Selected regions
 * @property {string} [dateRange] - Date range filter
 * @property {string} [searchQuery] - Search query
 */

/**
 * @typedef {'idle'|'playing'|'paused'|'finished'} StoryStatus
 */

/**
 * @typedef {Object} StoryState
 * @property {StoryStatus} status - Current playback status
 * @property {EventRecord[]} events - Events available for story mode
 * @property {number} currentIndex - Current event index
 * @property {number} intervalMs - Auto-advance interval in milliseconds
 * @property {boolean} autoAdvance - Whether auto-advance is enabled
 */

/**
 * @typedef {Object} AppState
 * @property {EventRecord[]} events - All available events
 * @property {EventRecord[]} filteredEvents - Events after filtering
 * @property {string|null} activeEventId - Currently selected event ID
 * @property {FilterState} filters - Current filter state
 * @property {StoryState} story - Story mode state
 * @property {boolean} isLoading - Whether data is being loaded
 * @property {boolean} isInitialized - Whether app is initialized
 * @property {string|null} error - Current error message
 */

/**
 * @typedef {Object} NotificationOptions
 * @property {'info'|'success'|'warning'|'error'} type - Notification type
 * @property {string} title - Notification title
 * @property {string} message - Notification message
 * @property {number} [duration] - Auto-dismiss duration in ms
 * @property {boolean} [persistent] - Whether notification persists
 */

/**
 * @callback StateUpdateCallback
 * @param {AppState} newState - New state
 * @param {AppState} prevState - Previous state
 * @param {string} action - Action that triggered the update
 * @returns {void}
 */

/**
 * @callback EventHandler
 * @param {...*} args - Event arguments
 * @returns {void}
 */

export {}; // Make this a module