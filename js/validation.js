/**
 * @fileoverview Data validation utilities
 * Provides validation for event data structure and integrity
 */

/**
 * Event data validation schema
 * @type {import('./types.js').ValidationSchema}
 */
const EVENT_SCHEMA = {
  required: ['id', 'title', 'timestamp', 'type', 'coordinates', 'instrument'],
  types: {
    id: 'string',
    title: 'string',
    timestamp: 'string',
    type: 'string',
    severity: 'string',
    instrument: 'string',
    coordinates: 'object',
    description: 'string',
    metadata: 'object',
    media: 'object',
    sources: 'array'
  },
  coordinates: {
    required: ['lat', 'lng'],
    types: {
      lat: 'number',
      lng: 'number',
      bounds: 'object'
    },
    ranges: {
      lat: [-90, 90],
      lng: [-180, 180]
    }
  }
};

/**
 * Validate event data structure
 * @param {Object} event - Event data to validate
 * @returns {import('./types.js').ValidationResult} Validation result
 */
export function validateEvent(event) {
  const errors = [];
  const warnings = [];

  // Check required fields
  for (const field of EVENT_SCHEMA.required) {
    if (!(field in event) || event[field] === null || event[field] === undefined) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate field types
  for (const [field, expectedType] of Object.entries(EVENT_SCHEMA.types)) {
    if (field in event && event[field] !== null) {
      const actualType = Array.isArray(event[field]) ? 'array' : typeof event[field];
      if (actualType !== expectedType) {
        errors.push(`Invalid type for ${field}: expected ${expectedType}, got ${actualType}`);
      }
    }
  }

  // Validate timestamp
  if (event.timestamp) {
    const date = new Date(event.timestamp);
    if (isNaN(date.getTime())) {
      errors.push(`Invalid timestamp format: ${event.timestamp}`);
    }
  }

  // Validate coordinates
  if (event.coordinates) {
    const coordErrors = validateCoordinates(event.coordinates);
    errors.push(...coordErrors);
  }

  // Validate severity levels
  if (event.severity && !['low', 'medium', 'high'].includes(event.severity)) {
    warnings.push(`Unknown severity level: ${event.severity}`);
  }

  // Validate event type
  if (event.type && !['fire', 'temperature', 'precipitation', 'vegetation', 'sea_ice'].includes(event.type)) {
    warnings.push(`Unknown event type: ${event.type}`);
  }

  // Check metadata size (should be reasonable for JSON)
  if (event.metadata && JSON.stringify(event.metadata).length > 5000) {
    warnings.push('Large metadata object may impact performance');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate coordinates object
 * @param {Object} coordinates - Coordinates to validate
 * @returns {string[]} Array of error messages
 */
function validateCoordinates(coordinates) {
  const errors = [];

  // Check required fields
  for (const field of EVENT_SCHEMA.coordinates.required) {
    if (!(field in coordinates)) {
      errors.push(`Missing required coordinate field: ${field}`);
    }
  }

  // Validate ranges
  if (typeof coordinates.lat === 'number') {
    const [min, max] = EVENT_SCHEMA.coordinates.ranges.lat;
    if (coordinates.lat < min || coordinates.lat > max) {
      errors.push(`Latitude out of range: ${coordinates.lat} (must be ${min} to ${max})`);
    }
  }

  if (typeof coordinates.lng === 'number') {
    const [min, max] = EVENT_SCHEMA.coordinates.ranges.lng;
    if (coordinates.lng < min || coordinates.lng > max) {
      errors.push(`Longitude out of range: ${coordinates.lng} (must be ${min} to ${max})`);
    }
  }

  // Validate bounds if present
  if (coordinates.bounds) {
    const bounds = coordinates.bounds;
    const requiredBounds = ['north', 'south', 'east', 'west'];
    
    for (const bound of requiredBounds) {
      if (typeof bounds[bound] !== 'number') {
        errors.push(`Invalid bound ${bound}: must be a number`);
      }
    }

    // Check logical bounds
    if (bounds.north <= bounds.south) {
      errors.push('Invalid bounds: north must be greater than south');
    }
    if (bounds.east <= bounds.west) {
      errors.push('Invalid bounds: east must be greater than west');
    }
  }

  return errors;
}

/**
 * Validate array of events
 * @param {Object[]} events - Array of events to validate
 * @returns {import('./types.js').ValidationSummary} Validation summary
 */
export function validateEvents(events) {
  if (!Array.isArray(events)) {
    return {
      valid: false,
      totalEvents: 0,
      validEvents: 0,
      errors: ['Events data is not an array'],
      warnings: [],
      eventResults: []
    };
  }

  const eventResults = [];
  const allErrors = [];
  const allWarnings = [];
  const seenIds = new Set();
  let validEvents = 0;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const result = validateEvent(event);
    
    // Check for duplicate IDs
    if (event.id) {
      if (seenIds.has(event.id)) {
        result.errors.push(`Duplicate event ID: ${event.id}`);
        result.valid = false;
      } else {
        seenIds.add(event.id);
      }
    }

    // Add context to errors
    const contextErrors = result.errors.map(error => `Event ${i + 1} (${event.id || 'no ID'}): ${error}`);
    const contextWarnings = result.warnings.map(warning => `Event ${i + 1} (${event.id || 'no ID'}): ${warning}`);

    allErrors.push(...contextErrors);
    allWarnings.push(...contextWarnings);
    eventResults.push(result);

    if (result.valid) {
      validEvents++;
    }
  }

  return {
    valid: allErrors.length === 0,
    totalEvents: events.length,
    validEvents,
    errors: allErrors,
    warnings: allWarnings,
    eventResults
  };
}

/**
 * Validate event data file structure
 * @param {Object} fileData - Event file data
 * @returns {import('./types.js').ValidationResult} Validation result
 */
export function validateEventFile(fileData) {
  const errors = [];
  const warnings = [];

  // Check required file structure
  if (!fileData.schemaVersion) {
    errors.push('Missing schemaVersion');
  } else if (fileData.schemaVersion !== 1) {
    warnings.push(`Unknown schema version: ${fileData.schemaVersion}`);
  }

  if (!fileData.year) {
    errors.push('Missing year field');
  } else if (typeof fileData.year !== 'number' || fileData.year < 2000 || fileData.year > 2030) {
    errors.push(`Invalid year: ${fileData.year}`);
  }

  if (!fileData.events) {
    errors.push('Missing events array');
  } else {
    const eventsValidation = validateEvents(fileData.events);
    errors.push(...eventsValidation.errors);
    warnings.push(...eventsValidation.warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Log validation results
 * @param {import('./types.js').ValidationSummary} result - Validation result
 * @param {string} context - Context for logging
 */
export function logValidationResult(result, context = '') {
  const prefix = context ? `[${context}] ` : '';
  
  if (result.valid) {
    console.log(`✅ ${prefix}Validation passed: ${result.validEvents}/${result.totalEvents} events valid`);
  } else {
    console.error(`❌ ${prefix}Validation failed: ${result.validEvents}/${result.totalEvents} events valid`);
  }

  if (result.errors.length > 0) {
    console.group('🔴 Errors:');
    result.errors.forEach(error => console.error(error));
    console.groupEnd();
  }

  if (result.warnings.length > 0) {
    console.group('🟡 Warnings:');
    result.warnings.forEach(warning => console.warn(warning));
    console.groupEnd();
  }
}