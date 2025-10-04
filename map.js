// Map Module for Interactive Earth Story Map
import { store, storeUtils } from './store.js';

const MAP_CONFIG = {
  defaultZoom: 2,
  maxZoom: 18,
  minZoom: 1,
  hotspotSize: 12,
  focusZoom: 8,
  animationDuration: 1000
};

let mapState = {
  container: null,
  mapElement: null,
  hotspots: [],
  activeHotspot: null,
  isInitialized: false
};

export function initMap(containerSelector = '#mapContainer') {
  try {
    console.log('🗺️ Initializing map...');
    
    mapState.container = document.querySelector(containerSelector);
    if (!mapState.container) {
      console.error('Map container not found:', containerSelector);
      return false;
    }
    
    setupPlaceholderMap();
    setupMapEventListeners();
    store.subscribe(handleStoreUpdate);
    
    mapState.isInitialized = true;
    console.log('✅ Map initialized successfully');
    
    return true;
    
  } catch (error) {
    console.error('❌ Map initialization failed:', error);
    return false;
  }
}

function setupPlaceholderMap() {
  mapState.mapElement = document.createElement('div');
  mapState.mapElement.className = 'map-placeholder';
  mapState.mapElement.innerHTML = `
    <div class="map-background">
      <div class="map-grid"></div>
      <div class="map-title">Interactive Earth Map</div>
      <div class="map-subtitle">Climate Anomaly Visualization</div>
    </div>
  `;
  
  mapState.container.appendChild(mapState.mapElement);
}

function handleStoreUpdate(newState, prevState, action) {
  if (!mapState.isInitialized) return;
  
  if (action === 'setEventsData' || action === 'setFilteredEvents') {
    renderHotspots(newState.filteredEvents || []);
  }
  
  if (action === 'setActiveEvent') {
    focusHotspot(newState.activeEventId);
  }
}

export function renderHotspots(events = []) {
  if (!mapState.isInitialized) return;
  
  console.log('📍 Rendering', events.length, 'hotspots');
  
  // Clear existing hotspots
  mapState.hotspots.forEach(hotspot => hotspot.remove());
  mapState.hotspots = [];
  
  // Create new hotspots
  events.forEach(event => {
    const hotspot = createHotspot(event);
    mapState.mapElement.appendChild(hotspot);
    mapState.hotspots.push(hotspot);
  });
}

function createHotspot(event) {
  const hotspot = document.createElement('div');
  hotspot.className = `map-hotspot map-hotspot--${event.type}`;
  hotspot.dataset.eventId = event.id;
  hotspot.setAttribute('role', 'button');
  hotspot.setAttribute('tabindex', '0');
  hotspot.setAttribute('aria-label', `${event.title} - ${event.type} event`);
  
  // Position using percentage coordinates
  const { xPercent, yPercent } = event.location.mapPosition;
  hotspot.style.left = `${xPercent}%`;
  hotspot.style.top = `${yPercent}%`;
  
  // Add severity class
  if (event.severity) {
    hotspot.classList.add(`map-hotspot--${event.severity}`);
  }
  
  hotspot.innerHTML = `
    <div class="hotspot-indicator"></div>
    <div class="hotspot-pulse"></div>
  `;
  
  return hotspot;
}

function setupMapEventListeners() {
  if (!mapState.mapElement) return;
  
  mapState.mapElement.addEventListener('click', (event) => {
    const hotspot = event.target.closest('.map-hotspot');
    if (hotspot) {
      const eventId = hotspot.dataset.eventId;
      storeUtils.setActiveEvent(eventId);
    }
  });
  
  mapState.mapElement.addEventListener('keydown', (event) => {
    const hotspot = event.target.closest('.map-hotspot');
    if (!hotspot) return;
    
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      hotspot.click();
    }
  });
}

export function focusHotspot(eventId) {
  if (!mapState.isInitialized) return;
  
  // Clear previous focus
  mapState.hotspots.forEach(hotspot => {
    hotspot.classList.remove('map-hotspot--active');
  });
  
  if (!eventId) {
    mapState.activeHotspot = null;
    return;
  }
  
  // Find and focus hotspot
  const hotspot = mapState.mapElement.querySelector(`[data-event-id="${eventId}"]`);
  if (hotspot) {
    hotspot.classList.add('map-hotspot--active');
    mapState.activeHotspot = hotspot;
    
    console.log('🎯 Map hotspot focused:', eventId);
  }
}

export function emulateZoomToEvent(event) {
  if (!mapState.isInitialized || !event) return;
  
  console.log('🔍 Emulating zoom to event:', event.title);
  
  // Add zoom effect to map
  mapState.mapElement.classList.add('map--zoomed');
  
  setTimeout(() => {
    mapState.mapElement.classList.remove('map--zoomed');
  }, MAP_CONFIG.animationDuration);
}

export function disposeMap() {
  if (mapState.container && mapState.mapElement) {
    mapState.container.removeChild(mapState.mapElement);
  }
  
  mapState.hotspots = [];
  mapState.activeHotspot = null;
  mapState.isInitialized = false;
  
  console.log('🧹 Map disposed');
}

export { mapState, MAP_CONFIG };