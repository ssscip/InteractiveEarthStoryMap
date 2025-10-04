/**
 * @fileoverview Data loading, validation and caching for structured JSON data
 * @requires ./types.js
 * @requires ./store.js
 * @requires ./validation.js
 */

import './types.js';
import { actions, eventBus } from './store.js';
import { validateEvents, validateEventFile, logValidationResult } from './validation.js';

/**
 * @type {Map<string, any>}
 */
const cache = new Map();

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  TTL: 10 * 60 * 1000, // 10 minutes
  MAX_SIZE: 100
};

/**
 * Data endpoints configuration
 */
const DATA_CONFIG = {
  baseUrl: './data/',
  endpoints: {
    index: 'events.index.json',
    instruments: 'instruments.json',
    anomalyTypes: 'anomaly-types.json'
  }
};

/**
 * Load and validate events index
 * @returns {Promise<Object>} Events index data
 */
async function loadEventsIndex() {
  const cacheKey = 'events.index';
  
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_CONFIG.TTL) {
      console.log('📦 Using cached events index');
      return cached.data;
    }
  }

  try {
    console.log('📥 Loading events index...');
    const response = await fetch(`${DATA_CONFIG.baseUrl}${DATA_CONFIG.endpoints.index}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load events index: ${response.status}`);
    }

    const index = await response.json();
    
    // Validate index structure
    if (!index.schemaVersion || !index.years || !Array.isArray(index.years)) {
      throw new Error('Invalid events index structure');
    }

    // Cache the result
    cache.set(cacheKey, {
      data: index,
      timestamp: Date.now()
    });

    console.log(`✅ Events index loaded: ${index.total} total events across ${index.years.length} years`);
    return index;

  } catch (error) {
    console.error('❌ Failed to load events index:', error);
    throw error;
  }
}

/**
 * Load events for a specific year
 * @param {number} year - Year to load events for
 * @returns {Promise<Object[]>} Array of events
 */
async function loadEventsForYear(year) {
  const cacheKey = `events.${year}`;
  
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_CONFIG.TTL) {
      console.log(`📦 Using cached events for ${year}`);
      return cached.data;
    }
  }

  try {
    console.log(`📥 Loading events for ${year}...`);
    const response = await fetch(`${DATA_CONFIG.baseUrl}events.${year}.json`);
    
    if (!response.ok) {
      throw new Error(`Failed to load events for ${year}: ${response.status}`);
    }

    const fileData = await response.json();
    
    // Validate file structure
    const fileValidation = validateEventFile(fileData);
    if (!fileValidation.valid) {
      console.error(`❌ Invalid events file for ${year}:`, fileValidation.errors);
      throw new Error(`Invalid events file structure for ${year}`);
    }

    // Validate events data
    const eventsValidation = validateEvents(fileData.events);
    logValidationResult(eventsValidation, `Events ${year}`);

    if (!eventsValidation.valid) {
      // Log errors but don't fail completely - use valid events only
      console.warn(`⚠️ Some events for ${year} are invalid, using ${eventsValidation.validEvents} valid events`);
    }

    // Filter to valid events only
    const validEvents = fileData.events.filter((_, index) => 
      eventsValidation.eventResults[index].valid
    );

    // Cache the result
    cache.set(cacheKey, {
      data: validEvents,
      timestamp: Date.now()
    });

    console.log(`✅ Loaded ${validEvents.length} valid events for ${year}`);
    return validEvents;

  } catch (error) {
    console.error(`❌ Failed to load events for ${year}:`, error);
    throw error;
  }
}

/**
 * Load all events from multiple years
 * @param {number[]} years - Array of years to load
 * @returns {Promise<Object[]>} Array of all events
 */
async function loadAllEvents(years = null) {
  try {
    // Get years from index if not provided
    if (!years) {
      const index = await loadEventsIndex();
      years = index.years.map(y => y.year);
    }

    console.log(`📥 Loading events for years: ${years.join(', ')}`);
    
    // Load events for all years in parallel
    const eventPromises = years.map(year => loadEventsForYear(year));
    const eventArrays = await Promise.all(eventPromises);
    
    // Flatten and combine all events
    const allEvents = eventArrays.flat();
    
    console.log(`✅ Loaded ${allEvents.length} total events`);
    return allEvents;

  } catch (error) {
    console.error('❌ Failed to load all events:', error);
    throw error;
  }
}

/**
 * Load instruments data
 * @returns {Promise<Object>} Instruments data
 */
async function loadInstruments() {
  const cacheKey = 'instruments';
  
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_CONFIG.TTL) {
      console.log('📦 Using cached instruments data');
      return cached.data;
    }
  }

  try {
    console.log('📥 Loading instruments data...');
    const response = await fetch(`${DATA_CONFIG.baseUrl}${DATA_CONFIG.endpoints.instruments}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load instruments: ${response.status}`);
    }

    const instruments = await response.json();
    
    cache.set(cacheKey, {
      data: instruments,
      timestamp: Date.now()
    });

    console.log('✅ Instruments data loaded');
    return instruments;

  } catch (error) {
    console.error('❌ Failed to load instruments:', error);
    throw error;
  }
}

/**
 * Load anomaly types data
 * @returns {Promise<Object>} Anomaly types data
 */
async function loadAnomalyTypes() {
  const cacheKey = 'anomalyTypes';
  
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_CONFIG.TTL) {
      console.log('📦 Using cached anomaly types data');
      return cached.data;
    }
  }

  try {
    console.log('📥 Loading anomaly types data...');
    const response = await fetch(`${DATA_CONFIG.baseUrl}${DATA_CONFIG.endpoints.anomalyTypes}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load anomaly types: ${response.status}`);
    }

    const anomalyTypes = await response.json();
    
    cache.set(cacheKey, {
      data: anomalyTypes,
      timestamp: Date.now()
    });

    console.log('✅ Anomaly types data loaded');
    return anomalyTypes;

  } catch (error) {
    console.error('❌ Failed to load anomaly types:', error);
    throw error;
  }
}

/**
 * Cache management utilities
 */
const cacheManager = {
  /**
   * Clear expired cache entries
   */
  clearExpired() {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > CACHE_CONFIG.TTL) {
        cache.delete(key);
      }
    }
  },

  /**
   * Clear all cache
   */
  clearAll() {
    cache.clear();
    console.log('🗑️ Cache cleared');
  },

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: cache.size,
      maxSize: CACHE_CONFIG.MAX_SIZE,
      keys: Array.from(cache.keys())
    };
  }
};

/**
 * Main data loading function
 * @param {Object} options - Loading options
 * @returns {Promise<Object[]>} Array of events
 */
export async function loadEvents(options = {}) {
  try {
    const {
      years = null,
      forceRefresh = false,
      includeMetadata = true
    } = options;

    if (forceRefresh) {
      cacheManager.clearAll();
    }

    // Clean up expired cache entries
    cacheManager.clearExpired();

    // Load all events
    const events = await loadAllEvents(years);

    // Load metadata if requested
    if (includeMetadata) {
      const [instruments, anomalyTypes] = await Promise.all([
        loadInstruments(),
        loadAnomalyTypes()
      ]);

      // Enrich events with metadata
      events.forEach(event => {
        if (event.instrument && instruments.instruments[event.instrument]) {
          event.instrumentData = instruments.instruments[event.instrument];
        }
        if (event.type && anomalyTypes.types[event.type]) {
          event.typeData = anomalyTypes.types[event.type];
        }
      });
    }

    // Update store
    actions.setEvents(events);
    eventBus.emit('eventsLoaded', events);

    console.log(`✅ Data loading complete: ${events.length} events loaded`);
    return events;

  } catch (error) {
    console.error('❌ Data loading failed:', error);
    eventBus.emit('dataLoadError', error);
    throw error;
  }
}

/**
 * Load events for specific years
 * @param {number[]} years - Years to load
 * @returns {Promise<Object[]>} Events for specified years
 */
export async function loadEventsByYears(years) {
  return await loadAllEvents(years);
}

/**
 * Get available years from index
 * @returns {Promise<number[]>} Available years
 */
export async function getAvailableYears() {
  const index = await loadEventsIndex();
  return index.years.map(y => y.year);
}

/**
 * Get data statistics
 * @returns {Promise<Object>} Data statistics
 */
export async function getDataStats() {
  const index = await loadEventsIndex();
  return {
    totalEvents: index.total,
    yearCount: index.years.length,
    years: index.years,
    lastUpdated: index.updated,
    schemaVersion: index.schemaVersion
  };
}

/**
 * Preload critical data
 * @returns {Promise<void>}
 */
export async function preloadData() {
  try {
    console.log('🚀 Preloading critical data...');
    
    // Load index and current year
    const index = await loadEventsIndex();
    const currentYear = new Date().getFullYear();
    
    if (index.years.find(y => y.year === currentYear)) {
      await loadEventsForYear(currentYear);
    }

    console.log('✅ Critical data preloaded');
  } catch (error) {
    console.warn('⚠️ Preloading failed:', error);
  }
}

// Export cache manager for debugging
export { cacheManager };

console.log('📡 Modern DataLoader initialized');