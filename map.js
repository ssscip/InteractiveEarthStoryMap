/**
 * @fileoverview Map module for geospatial visualization
 * Provides interactive map with event markers and layers
 */

import { store, actions, eventBus } from './js/store.js';
import { qs, el, on, debounce } from './js/utils/dom.js';
import { geoDistance, clamp } from './js/utils/math.js';

/**
 * Map state
 * @type {import('./js/types.js').MapState}
 */
let mapState = {
  isInitialized: false,
  center: { lat: 0, lng: 0 },
  zoom: 2,
  selectedLayer: 'satellite',
  markers: [],
  bounds: null,
  isLoading: false
};

/**
 * Map instance and DOM elements
 */
let mapElements = {
  container: null,
  canvas: null,
  layerControls: null,
  zoomControls: null,
  searchBox: null
};

/**
 * Mock map implementation (replace with real mapping library)
 */
let mockMap = {
  center: { lat: 0, lng: 0 },
  zoom: 2,
  markers: []
};

/**
 * Initialize map module
 * @returns {boolean} Success status
 */
export function initMap() {
  try {
    console.log('🗺️ Initializing map module...');
    
    // Get DOM elements
    mapElements.container = qs('.map-container');
    if (!mapElements.container) {
      console.warn('Map container not found');
      return false;
    }
    
    // Build map UI
    buildMapUI();
    
    // Initialize map instance
    initializeMapInstance();
    
    // Setup event listeners
    setupMapEvents();
    
    // Subscribe to store updates
    store.subscribe((state) => {
      updateMapFromState(state);
    });
    
    // Initialize from current state
    const currentState = store.getState();
    if (currentState.events?.length > 0) {
      addEventMarkers(currentState.events);
    }
    
    mapState.isInitialized = true;
    console.log('✅ Map module initialized');
    return true;
    
  } catch (error) {
    console.error('❌ Map initialization failed:', error);
    return false;
  }
}

/**
 * Build map user interface
 */
function buildMapUI() {
  const container = mapElements.container;
  
  // Create simplified map viewport without controls (controls are now in separate panel)
  container.innerHTML = `
    <div class="map__viewport">
      <canvas class="map__canvas" aria-label="Interactive map"></canvas>
      <div class="map__markers-layer">
        <!-- Event markers will be inserted here -->
      </div>
    </div>
  `;
  
  // Cache element references
  mapElements.canvas = qs('.map__canvas', container);
  
  // Get controls from the separate panel
  mapElements.layerControls = qs('#mapLayerSelect');
  mapElements.zoomControls = {
    zoomIn: qs('.map__zoom-in'),
    zoomOut: qs('.map__zoom-out')
  };
  mapElements.searchBox = qs('#mapSearchInput');
  
  // Cache additional elements
  mapElements.coordinates = qs('#mapCoordinates');
  mapElements.loading = qs('#mapLoading');
}

/**
 * Initialize map instance (mock implementation)
 */
function initializeMapInstance() {
  const canvas = mapElements.canvas;
  if (!canvas) return;
  
  // Set canvas size
  const container = mapElements.container;
  canvas.width = container.offsetWidth;
  canvas.height = container.offsetHeight;
  
  // Get canvas context
  const ctx = canvas.getContext('2d');
  
  // Draw base map (mock)
  drawBaseMap(ctx);
  
  console.log('🗺️ Map instance initialized (mock)');
}

/**
 * Draw base map (mock implementation)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
function drawBaseMap(ctx) {
  const { width, height } = ctx.canvas;
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Draw background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#87CEEB'); // Sky blue
  gradient.addColorStop(1, '#4682B4'); // Steel blue
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Draw grid (representing map tiles)
  ctx.strokeStyle = '#ffffff33';
  ctx.lineWidth = 1;
  
  const gridSize = 50;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  
  // Draw continents (very simplified)
  drawMockContinents(ctx);
}

/**
 * Draw mock continents
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
function drawMockContinents(ctx) {
  const { width, height } = ctx.canvas;
  
  ctx.fillStyle = '#228B22'; // Forest green
  
  // North America (approximate)
  ctx.beginPath();
  ctx.ellipse(width * 0.2, height * 0.3, width * 0.15, height * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Europe (approximate)
  ctx.beginPath();
  ctx.ellipse(width * 0.55, height * 0.25, width * 0.08, height * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Asia (approximate)
  ctx.beginPath();
  ctx.ellipse(width * 0.75, height * 0.3, width * 0.2, height * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Africa (approximate)
  ctx.beginPath();
  ctx.ellipse(width * 0.52, height * 0.5, width * 0.08, height * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Australia (approximate)
  ctx.beginPath();
  ctx.ellipse(width * 0.8, height * 0.7, width * 0.06, height * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Setup map event listeners
 */
function setupMapEvents() {
  const { canvas, layerControls, zoomControls, searchBox } = mapElements;
  
  // Canvas interactions
  on(canvas, 'click', handleMapClick);
  on(canvas, 'mousemove', debounce(handleMapMouseMove, 50));
  
  // Layer controls
  on(layerControls, 'change', (event) => {
    changeMapLayer(event.target.value);
  });
  
  // Zoom controls
  on(zoomControls.zoomIn, 'click', () => zoomMap(1));
  on(zoomControls.zoomOut, 'click', () => zoomMap(-1));
  
  // Search functionality
  on(searchBox, 'keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchLocation(event.target.value);
    }
  });
  
  // Search button
  const searchBtn = qs('.map__search-btn');
  on(searchBtn, 'click', () => {
    searchLocation(searchBox.value);
  });
  
  // Mouse wheel zoom
  on(canvas, 'wheel', (event) => {
    event.preventDefault();
    const zoomDelta = event.deltaY > 0 ? -1 : 1;
    zoomMap(zoomDelta);
  });
  
  // Window resize
  on(window, 'resize', debounce(() => {
    resizeMap();
  }, 250));
  
  // Store events
  eventBus.on('eventsLoaded', (events) => {
    addEventMarkers(events);
  });
  
  eventBus.on('eventSelected', (event) => {
    if (event?.coordinates) {
      focusOnEvent(event);
    }
  });
  
  eventBus.on('timelineSeek', (date) => {
    updateMarkersForDate(date);
  });
}

/**
 * Handle map click
 * @param {MouseEvent} event - Click event
 */
function handleMapClick(event) {
  const rect = event.target.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  // Convert pixel coordinates to geographic coordinates (mock)
  const coordinates = pixelToGeo(x, y);
  
  // Check if click hit any markers
  const clickedMarker = findMarkerAtPosition(x, y);
  
  if (clickedMarker) {
    // Select the event
    actions.selectEvent(clickedMarker.event);
    console.log('📍 Marker clicked:', clickedMarker.event.title);
  } else {
    // Clicked on empty map
    console.log('🗺️ Map clicked at:', coordinates);
    
    // Emit map click event
    eventBus.emit('mapClick', coordinates);
  }
}

/**
 * Handle map mouse move
 * @param {MouseEvent} event - Mouse move event
 */
function handleMapMouseMove(event) {
  const rect = event.target.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  // Convert to geographic coordinates
  const coordinates = pixelToGeo(x, y);
  
  // Update coordinates display
  if (mapElements.coordinates) {
    mapElements.coordinates.textContent = `Lat: ${coordinates.lat.toFixed(4)}°, Lng: ${coordinates.lng.toFixed(4)}°`;
  }
  
  // Check for marker hover
  const hoveredMarker = findMarkerAtPosition(x, y);
  updateMapCursor(hoveredMarker ? 'pointer' : 'default');
}

/**
 * Convert pixel coordinates to geographic coordinates (mock)
 * @param {number} x - Pixel X
 * @param {number} y - Pixel Y
 * @returns {object} Geographic coordinates
 */
function pixelToGeo(x, y) {
  const canvas = mapElements.canvas;
  const { width, height } = canvas;
  
  // Simple conversion (mock projection)
  const lat = 90 - (y / height) * 180;
  const lng = (x / width) * 360 - 180;
  
  return { lat, lng };
}

/**
 * Convert geographic coordinates to pixel coordinates (mock)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {object} Pixel coordinates
 */
function geoToPixel(lat, lng) {
  const canvas = mapElements.canvas;
  const { width, height } = canvas;
  
  // Simple conversion (mock projection)
  const x = ((lng + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  
  return { x, y };
}

/**
 * Find marker at position
 * @param {number} x - Pixel X
 * @param {number} y - Pixel Y
 * @returns {object|null} Marker or null
 */
function findMarkerAtPosition(x, y) {
  const markerRadius = 8; // Marker hit radius
  
  return mapState.markers.find(marker => {
    const distance = Math.sqrt(
      Math.pow(marker.pixelX - x, 2) + 
      Math.pow(marker.pixelY - y, 2)
    );
    return distance <= markerRadius;
  });
}

/**
 * Update map cursor
 * @param {string} cursor - Cursor style
 */
function updateMapCursor(cursor) {
  if (mapElements.canvas) {
    mapElements.canvas.style.cursor = cursor;
  }
}

/**
 * Change map layer
 * @param {string} layer - Layer name
 */
function changeMapLayer(layer) {
  mapState.selectedLayer = layer;
  
  // Redraw map with new layer
  const ctx = mapElements.canvas.getContext('2d');
  drawBaseMap(ctx);
  redrawMarkers();
  
  console.log(`🗺️ Map layer changed to: ${layer}`);
  eventBus.emit('mapLayerChanged', layer);
}

/**
 * Zoom map
 * @param {number} delta - Zoom change
 */
function zoomMap(delta) {
  const newZoom = clamp(mapState.zoom + delta, 1, 20);
  
  if (newZoom !== mapState.zoom) {
    mapState.zoom = newZoom;
    
    // Redraw map at new zoom level
    redrawMap();
    
    console.log(`🗺️ Map zoom: ${mapState.zoom}`);
    eventBus.emit('mapZoomChanged', mapState.zoom);
  }
}

/**
 * Search for location
 * @param {string} query - Search query
 */
function searchLocation(query) {
  if (!query.trim()) return;
  
  console.log(`🔍 Searching for: ${query}`);
  
  // Mock search results
  const mockResults = {
    'paris': { lat: 48.8566, lng: 2.3522 },
    'tokyo': { lat: 35.6762, lng: 139.6503 },
    'new york': { lat: 40.7128, lng: -74.0060 },
    'london': { lat: 51.5074, lng: -0.1278 },
    'sydney': { lat: -33.8688, lng: 151.2093 }
  };
  
  const result = mockResults[query.toLowerCase()];
  
  if (result) {
    centerMapAt(result.lat, result.lng);
    console.log(`📍 Found location: ${query}`);
  } else {
    console.log(`❌ Location not found: ${query}`);
    // Show notification
    eventBus.emit('showNotification', {
      type: 'warning',
      title: 'Location Not Found',
      message: `Could not find location: ${query}`
    });
  }
}

/**
 * Center map at coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 */
function centerMapAt(lat, lng) {
  mapState.center = { lat, lng };
  mockMap.center = { lat, lng };
  
  // Redraw map
  redrawMap();
  
  eventBus.emit('mapCenterChanged', { lat, lng });
}

/**
 * Add event markers to map
 * @param {import('./js/types.js').EventRecord[]} events - Event data
 */
function addEventMarkers(events) {
  // Clear existing markers
  mapState.markers = [];
  
  events.forEach(event => {
    if (event.coordinates) {
      const marker = createEventMarker(event);
      mapState.markers.push(marker);
    }
  });
  
  // Redraw markers
  redrawMarkers();
  
  console.log(`🗺️ Added ${mapState.markers.length} event markers`);
}

/**
 * Create event marker
 * @param {import('./js/types.js').EventRecord} event - Event data
 * @returns {object} Marker object
 */
function createEventMarker(event) {
  const { lat, lng } = event.coordinates;
  const { x, y } = geoToPixel(lat, lng);
  
  return {
    id: event.id,
    event: event,
    lat: lat,
    lng: lng,
    pixelX: x,
    pixelY: y,
    type: event.type,
    title: event.title,
    isVisible: true
  };
}

/**
 * Focus on event
 * @param {import('./js/types.js').EventRecord} event - Event to focus on
 */
function focusOnEvent(event) {
  if (!event.coordinates) return;
  
  centerMapAt(event.coordinates.lat, event.coordinates.lng);
  
  // Zoom in if needed
  if (mapState.zoom < 8) {
    mapState.zoom = 8;
    redrawMap();
  }
  
  // Highlight the marker
  highlightMarker(event.id);
}

/**
 * Highlight marker
 * @param {string} eventId - Event ID
 */
function highlightMarker(eventId) {
  const marker = mapState.markers.find(m => m.id === eventId);
  
  if (marker) {
    // Mark as selected and redraw
    mapState.markers.forEach(m => m.isSelected = false);
    marker.isSelected = true;
    redrawMarkers();
  }
}

/**
 * Update markers for specific date
 * @param {Date} date - Target date
 */
function updateMarkersForDate(date) {
  // This could filter markers based on date or update their visibility
  console.log(`🗺️ Updating markers for date: ${date.toLocaleDateString()}`);
  
  // For now, just ensure all markers are visible
  mapState.markers.forEach(marker => {
    marker.isVisible = true;
  });
  
  redrawMarkers();
}

/**
 * Redraw entire map
 */
function redrawMap() {
  const ctx = mapElements.canvas.getContext('2d');
  drawBaseMap(ctx);
  redrawMarkers();
}

/**
 * Redraw markers on map
 */
function redrawMarkers() {
  const ctx = mapElements.canvas.getContext('2d');
  
  mapState.markers.forEach(marker => {
    if (marker.isVisible) {
      drawMarker(ctx, marker);
    }
  });
}

/**
 * Draw individual marker
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {object} marker - Marker object
 */
function drawMarker(ctx, marker) {
  const { pixelX, pixelY, type, isSelected } = marker;
  
  // Update pixel position based on current map state
  const { x, y } = geoToPixel(marker.lat, marker.lng);
  marker.pixelX = x;
  marker.pixelY = y;
  
  // Marker colors by type
  const colors = {
    fire: '#FF4444',
    flood: '#4444FF',
    earthquake: '#FF8800',
    hurricane: '#8844FF',
    drought: '#FFAA00',
    default: '#444444'
  };
  
  const color = colors[type] || colors.default;
  const radius = isSelected ? 10 : 6;
  
  // Draw marker circle
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  
  // Draw border
  ctx.strokeStyle = isSelected ? '#FFFFFF' : '#000000';
  ctx.lineWidth = isSelected ? 3 : 1;
  ctx.stroke();
  
  // Draw inner dot
  if (isSelected) {
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  }
}

/**
 * Resize map canvas
 */
function resizeMap() {
  const canvas = mapElements.canvas;
  const container = mapElements.container;
  
  canvas.width = container.offsetWidth;
  canvas.height = container.offsetHeight;
  
  // Recalculate marker positions
  mapState.markers.forEach(marker => {
    const { x, y } = geoToPixel(marker.lat, marker.lng);
    marker.pixelX = x;
    marker.pixelY = y;
  });
  
  redrawMap();
}

/**
 * Update map from store state
 * @param {import('./js/types.js').AppState} state - Application state
 */
function updateMapFromState(state) {
  // Update map based on global state changes
  if (state.selectedEvent && state.selectedEvent.coordinates) {
    highlightMarker(state.selectedEvent.id);
  }
  
  // Update filters
  if (state.filters) {
    applyFiltersToMarkers(state.filters);
  }
}

/**
 * Apply filters to markers
 * @param {import('./js/types.js').FilterState} filters - Filter state
 */
function applyFiltersToMarkers(filters) {
  mapState.markers.forEach(marker => {
    let isVisible = true;
    
    // Type filter
    if (filters.eventTypes?.length > 0) {
      isVisible = isVisible && filters.eventTypes.includes(marker.type);
    }
    
    // Date range filter
    if (filters.dateRange) {
      const eventDate = new Date(marker.event.date);
      isVisible = isVisible && 
        eventDate >= filters.dateRange.start && 
        eventDate <= filters.dateRange.end;
    }
    
    marker.isVisible = isVisible;
  });
  
  redrawMarkers();
}

/**
 * Cleanup map module
 */
function cleanup() {
  mapState.markers = [];
  console.log('🧹 Map module cleaned up');
}

// Module event handling
eventBus.on('cleanup', cleanup);

// Export public interface
export {
  mapState,
  centerMapAt,
  zoomMap,
  focusOnEvent,
  addEventMarkers
};