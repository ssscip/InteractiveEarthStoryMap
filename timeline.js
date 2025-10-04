/**
 * @fileoverview Enhanced Timeline module with virtualization and performance optimizations
 * Provides high-performance interactive timeline for large datasets
 */

import { store, actions, eventBus } from './js/store.js';
import { formatDate, getRelativeTime } from './js/utils/format.js';
import { qs, el, on, debounce } from './js/utils/dom.js';
import { clamp } from './js/utils/math.js';

/**
 * Timeline configuration
 */
const TIMELINE_CONFIG = {
  // Virtualization settings
  VIRTUAL_THRESHOLD: 200, // Enable virtualization above this count
  BUFFER_SIZE: 50, // Extra items to render outside viewport
  ITEM_WIDTH: 120, // Width of each timeline item in pixels
  ITEM_HEIGHT: 60, // Height of each timeline item
  
  // Performance settings
  DEBOUNCE_DELAY: 150, // Filter debounce delay in ms
  SCROLL_DEBOUNCE: 16, // Scroll debounce for 60fps
  
  // UX settings
  AUTO_CENTER: true,
  SMOOTH_SCROLL: true,
  HOVER_DELAY: 300, // Hover popup delay
  
  // Animation
  SCROLL_DURATION: 500,
  TRANSITION_DURATION: 250
};

/**
 * Timeline state with virtualization support
 * @type {import('./js/types.js').TimelineState}
 */
let timelineState = {
  // Core state
  isVisible: true,
  currentDate: null,
  dateRange: { start: null, end: null },
  playbackSpeed: 1.0,
  isPlaying: false,
  selectedPeriod: 'all',
  zoom: 1.0,
  
  // Virtualization state
  events: [],
  filteredEvents: [],
  visibleEvents: [],
  scrollPosition: 0,
  viewportWidth: 0,
  totalWidth: 0,
  
  // Performance state
  isVirtualized: false,
  renderStartIndex: 0,
  renderEndIndex: 0,
  
  // Active states
  activeEventId: null,
  hoveredEventId: null
};

/**
 * Timeline DOM elements
 */
let timelineElements = {
  container: null,
  viewport: null,
  scrollContainer: null,
  itemsContainer: null,
  controls: null,
  
  // Controls
  playButton: null,
  dateDisplay: null,
  speedControl: null,
  periodSelector: null,
  zoomControls: null,
  
  // Hover popup
  hoverPopup: null,
  
  // Intersection observer
  observer: null
};

/**
 * Animation and timing
 */
let animationFrameId = null;
let scrollAnimationId = null;
let hoverTimeout = null;

/**
 * Debounced functions
 */
const debouncedFilter = debounce(applyFilters, TIMELINE_CONFIG.DEBOUNCE_DELAY);
const debouncedScroll = debounce(handleScroll, TIMELINE_CONFIG.SCROLL_DEBOUNCE);
const debouncedResize = debounce(handleResize, 250);

/**
 * Initialize timeline module
 * @returns {boolean} Success status
 */
export function initTimeline() {
  try {
    console.log('📈 Initializing enhanced timeline module...');
    
    // Get DOM elements
    timelineElements.container = qs('.timeline-container');
    if (!timelineElements.container) {
      console.warn('Timeline container not found');
      return false;
    }
    
    // Build timeline UI
    buildTimelineUI();
    
    // Setup event listeners
    setupTimelineEvents();
    
    // Setup intersection observer for hover optimization
    setupIntersectionObserver();
    
    // Subscribe to store updates
    store.subscribe((state) => {
      updateTimelineFromState(state);
    });
    
    // Initialize from current state
    const currentState = store.getState();
    if (currentState.events?.length > 0) {
      loadEvents(currentState.events);
    }
    
    console.log('✅ Enhanced timeline module initialized');
    return true;
    
  } catch (error) {
    console.error('❌ Timeline initialization failed:', error);
    return false;
  }
}

/**
 * Build enhanced timeline UI with virtualization support
 */
function buildTimelineUI() {
  const container = timelineElements.container;
  
  container.innerHTML = `
    <div class=\"timeline-header\">
      <div class=\"timeline-controls\">
        <button class=\"timeline-btn timeline-play\" aria-label=\"Play timeline\">
          <span class=\"icon\">▶</span>
        </button>
        <div class=\"timeline-speed\">
          <label for=\"timeline-speed-select\">Speed:</label>
          <select id=\"timeline-speed-select\" class=\"timeline-speed-select\">
            <option value=\"0.5\">0.5x</option>
            <option value=\"1\" selected>1x</option>
            <option value=\"2\">2x</option>
            <option value=\"4\">4x</option>
          </select>
        </div>
        <div class=\"timeline-zoom\">
          <button class=\"timeline-zoom-out\" aria-label=\"Zoom out\">−</button>
          <span class=\"timeline-zoom-level\">100%</span>
          <button class=\"timeline-zoom-in\" aria-label=\"Zoom in\">+</button>
        </div>
      </div>
      <div class=\"timeline-info\">
        <span class=\"timeline-date-display\">Select an event</span>
        <span class=\"timeline-event-count\">0 events</span>
      </div>
    </div>
    
    <div class=\"timeline-viewport\" role=\"region\" aria-label=\"Timeline events\">
      <div class=\"timeline-scroll-container\">
        <div class=\"timeline-items-container\">
          <!-- Timeline items will be rendered here -->
        </div>
      </div>
    </div>
    
    <div class=\"timeline-hover-popup\" style=\"display: none;\">
      <div class=\"popup-content\">
        <div class=\"popup-title\"></div>
        <div class=\"popup-date\"></div>
        <div class=\"popup-type\"></div>
      </div>
    </div>
  `;
  
  // Cache element references
  timelineElements.viewport = qs('.timeline-viewport', container);
  timelineElements.scrollContainer = qs('.timeline-scroll-container', container);
  timelineElements.itemsContainer = qs('.timeline-items-container', container);
  timelineElements.playButton = qs('.timeline-play', container);
  timelineElements.dateDisplay = qs('.timeline-date-display', container);
  timelineElements.speedControl = qs('.timeline-speed-select', container);
  timelineElements.zoomControls = {
    zoomIn: qs('.timeline-zoom-in', container),
    zoomOut: qs('.timeline-zoom-out', container),
    level: qs('.timeline-zoom-level', container)
  };
  timelineElements.hoverPopup = qs('.timeline-hover-popup', container);
  timelineElements.eventCount = qs('.timeline-event-count', container);
}

/**
 * Setup timeline event listeners with performance optimizations
 */
function setupTimelineEvents() {
  // Play/pause button
  on(timelineElements.playButton, 'click', togglePlayback);
  
  // Speed control
  on(timelineElements.speedControl, 'change', (event) => {
    timelineState.playbackSpeed = parseFloat(event.target.value);
    updateSpeedDisplay();
  });
  
  // Zoom controls
  on(timelineElements.zoomControls.zoomIn, 'click', () => zoomTimeline(1.2));
  on(timelineElements.zoomControls.zoomOut, 'click', () => zoomTimeline(0.8));
  
  // Scroll handling with debouncing
  on(timelineElements.scrollContainer, 'scroll', debouncedScroll);
  
  // Window resize
  on(window, 'resize', debouncedResize);
  
  // Store events
  eventBus.on('eventsLoaded', (events) => {
    loadEvents(events);
  });
  
  eventBus.on('filtersChanged', debouncedFilter);
  
  eventBus.on('eventSelected', (event) => {
    setActiveEvent(event.id);
    scrollActiveIntoView(true);
  });
  
  eventBus.on('storyStep', (event) => {
    setActiveEvent(event.id);
    scrollActiveIntoView(true);
  });
}

/**
 * Setup intersection observer for performance optimization
 */
function setupIntersectionObserver() {
  if (!('IntersectionObserver' in window)) return;
  
  timelineElements.observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        const eventItem = entry.target;
        if (entry.isIntersecting) {
          eventItem.classList.add('is-visible');
        } else {
          eventItem.classList.remove('is-visible');
        }
      });
    },
    {
      root: timelineElements.viewport,
      rootMargin: '50px',
      threshold: 0.1
    }
  );
}

/**
 * Load events and setup virtualization if needed
 * @param {Object[]} events - Array of events
 */
function loadEvents(events) {
  timelineState.events = events;
  timelineState.filteredEvents = [...events];
  
  // Sort events by date
  timelineState.filteredEvents.sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );
  
  // Calculate date range
  if (timelineState.filteredEvents.length > 0) {
    timelineState.dateRange.start = new Date(timelineState.filteredEvents[0].timestamp);
    timelineState.dateRange.end = new Date(timelineState.filteredEvents[timelineState.filteredEvents.length - 1].timestamp);
  }
  
  // Check if virtualization is needed
  timelineState.isVirtualized = timelineState.filteredEvents.length > TIMELINE_CONFIG.VIRTUAL_THRESHOLD;
  
  console.log(`📈 Timeline loaded: ${events.length} events, virtualization: ${timelineState.isVirtualized ? 'ON' : 'OFF'}`);
  
  // Update viewport size
  updateViewportSize();
  
  // Render timeline
  renderTimeline();
  
  // Update info display
  updateTimelineInfo();
}

/**
 * Apply filters to events
 */
function applyFilters() {
  const state = store.getState();
  const { typeFilter, severityFilter, dateFilter } = state.filters || {};
  
  timelineState.filteredEvents = timelineState.events.filter(event => {
    // Type filter
    if (typeFilter && typeFilter !== 'all' && event.type !== typeFilter) {
      return false;
    }
    
    // Severity filter
    if (severityFilter && severityFilter !== 'all' && event.severity !== severityFilter) {
      return false;
    }
    
    // Date filter
    if (dateFilter) {
      const eventDate = new Date(event.timestamp);
      if (dateFilter.start && eventDate < dateFilter.start) return false;
      if (dateFilter.end && eventDate > dateFilter.end) return false;
    }
    
    return true;
  });
  
  // Re-sort filtered events
  timelineState.filteredEvents.sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );
  
  // Update virtualization status
  timelineState.isVirtualized = timelineState.filteredEvents.length > TIMELINE_CONFIG.VIRTUAL_THRESHOLD;
  
  // Update viewport and render
  updateViewportSize();
  renderTimeline();
  updateTimelineInfo();
  
  console.log(`📈 Timeline filtered: ${timelineState.filteredEvents.length} events visible`);
}

/**
 * Update viewport size calculations
 */
function updateViewportSize() {
  if (!timelineElements.viewport) return;
  
  timelineState.viewportWidth = timelineElements.viewport.clientWidth;
  timelineState.totalWidth = timelineState.filteredEvents.length * TIMELINE_CONFIG.ITEM_WIDTH * timelineState.zoom;
  
  // Update scroll container width
  timelineElements.scrollContainer.style.width = `${timelineState.totalWidth}px`;
}

/**
 * Handle scroll events with virtualization
 */
function handleScroll() {
  if (!timelineState.isVirtualized) return;
  
  timelineState.scrollPosition = timelineElements.scrollContainer.scrollLeft;
  
  // Calculate visible range
  calculateVisibleRange();
  
  // Re-render if needed
  renderVisibleItems();
}

/**
 * Calculate which items should be visible (virtualization)
 */
function calculateVisibleRange() {
  const itemWidth = TIMELINE_CONFIG.ITEM_WIDTH * timelineState.zoom;
  const bufferSize = TIMELINE_CONFIG.BUFFER_SIZE;
  
  const startIndex = Math.max(0, 
    Math.floor(timelineState.scrollPosition / itemWidth) - bufferSize
  );
  
  const endIndex = Math.min(timelineState.filteredEvents.length - 1,
    Math.ceil((timelineState.scrollPosition + timelineState.viewportWidth) / itemWidth) + bufferSize
  );
  
  timelineState.renderStartIndex = startIndex;
  timelineState.renderEndIndex = endIndex;
  
  timelineState.visibleEvents = timelineState.filteredEvents.slice(startIndex, endIndex + 1);
}

/**
 * Render timeline items (with virtualization support)
 */
function renderTimeline() {
  if (timelineState.isVirtualized) {
    calculateVisibleRange();
    renderVisibleItems();
  } else {
    renderAllItems();
  }
}

/**
 * Render all items (non-virtualized)
 */
function renderAllItems() {
  const container = timelineElements.itemsContainer;
  container.innerHTML = '';
  
  timelineState.filteredEvents.forEach((event, index) => {
    const item = createTimelineItem(event, index);
    container.appendChild(item);
    
    // Add to intersection observer
    if (timelineElements.observer) {
      timelineElements.observer.observe(item);
    }
  });
}

/**
 * Render only visible items (virtualized)
 */
function renderVisibleItems() {
  const container = timelineElements.itemsContainer;
  container.innerHTML = '';
  
  // Create spacer for items before visible range
  if (timelineState.renderStartIndex > 0) {
    const spacerBefore = el('div', {
      className: 'timeline-spacer',
      style: `width: ${timelineState.renderStartIndex * TIMELINE_CONFIG.ITEM_WIDTH * timelineState.zoom}px; height: 1px;`
    });
    container.appendChild(spacerBefore);
  }
  
  // Render visible items
  timelineState.visibleEvents.forEach((event, visibleIndex) => {
    const actualIndex = timelineState.renderStartIndex + visibleIndex;
    const item = createTimelineItem(event, actualIndex);
    container.appendChild(item);
  });
  
  // Create spacer for items after visible range
  const remainingItems = timelineState.filteredEvents.length - timelineState.renderEndIndex - 1;
  if (remainingItems > 0) {
    const spacerAfter = el('div', {
      className: 'timeline-spacer',
      style: `width: ${remainingItems * TIMELINE_CONFIG.ITEM_WIDTH * timelineState.zoom}px; height: 1px;`
    });
    container.appendChild(spacerAfter);
  }
}

/**
 * Create a timeline item element
 * @param {Object} event - Event data
 * @param {number} index - Event index
 * @returns {HTMLElement} Timeline item element
 */
function createTimelineItem(event, index) {
  const item = el('div', {
    className: `timeline-item timeline-item--${event.type}`,
    'data-event-id': event.id,
    'data-index': index,
    style: `width: ${TIMELINE_CONFIG.ITEM_WIDTH * timelineState.zoom}px;`
  });
  
  // Add state classes
  if (event.id === timelineState.activeEventId) {
    item.classList.add('is-active');
  }
  
  item.innerHTML = `
    <div class=\"timeline-item-content\">
      <div class=\"timeline-item-date\">${formatDate(event.timestamp, 'short')}</div>
      <div class=\"timeline-item-title\">${event.title}</div>
      <div class=\"timeline-item-type\" data-type=\"${event.type}\">${event.type}</div>
      <div class=\"timeline-item-severity timeline-item-severity--${event.severity}\"></div>
    </div>
  `;
  
  // Event listeners
  on(item, 'click', () => {
    actions.selectEvent(event);
    setActiveEvent(event.id);
  });
  
  // Optimized hover with debouncing
  on(item, 'mouseenter', (e) => {
    clearTimeout(hoverTimeout);
    hoverTimeout = setTimeout(() => {
      showHoverPopup(event, e.currentTarget);
    }, TIMELINE_CONFIG.HOVER_DELAY);
  });
  
  on(item, 'mouseleave', () => {
    clearTimeout(hoverTimeout);
    hideHoverPopup();
  });
  
  return item;
}

/**
 * Set active event with visual feedback
 * @param {string} eventId - Event ID to activate
 */
function setActiveEvent(eventId) {
  // Remove previous active state
  const prevActive = qs('.timeline-item.is-active', timelineElements.container);
  if (prevActive) {
    prevActive.classList.remove('is-active');
  }
  
  // Set new active state
  timelineState.activeEventId = eventId;
  const newActive = qs(`[data-event-id=\"${eventId}\"]`, timelineElements.container);
  if (newActive) {
    newActive.classList.add('is-active');
  }
  
  // Update date display
  const event = timelineState.filteredEvents.find(e => e.id === eventId);
  if (event) {
    timelineElements.dateDisplay.textContent = formatDate(event.timestamp, 'full');
  }
}

/**
 * Scroll active event into view with smooth animation
 * @param {boolean} center - Whether to center the active event
 */
export function scrollActiveIntoView(center = true) {
  if (!timelineState.activeEventId) return;
  
  const activeItem = qs(`[data-event-id=\"${timelineState.activeEventId}\"]`, timelineElements.container);
  if (!activeItem) return;
  
  const itemIndex = parseInt(activeItem.dataset.index);
  const itemWidth = TIMELINE_CONFIG.ITEM_WIDTH * timelineState.zoom;
  const itemPosition = itemIndex * itemWidth;
  
  let targetScrollPosition;
  
  if (center) {
    // Center the item in viewport
    targetScrollPosition = itemPosition - (timelineState.viewportWidth / 2) + (itemWidth / 2);
  } else {
    // Just ensure it's visible
    const currentScroll = timelineElements.scrollContainer.scrollLeft;
    const itemStart = itemPosition;
    const itemEnd = itemPosition + itemWidth;
    
    if (itemStart < currentScroll) {
      targetScrollPosition = itemStart;
    } else if (itemEnd > currentScroll + timelineState.viewportWidth) {
      targetScrollPosition = itemEnd - timelineState.viewportWidth;
    } else {
      return; // Already visible
    }
  }
  
  // Clamp to valid range
  targetScrollPosition = clamp(targetScrollPosition, 0, timelineState.totalWidth - timelineState.viewportWidth);
  
  // Smooth scroll animation
  if (TIMELINE_CONFIG.SMOOTH_SCROLL) {
    smoothScrollTo(targetScrollPosition);
  } else {
    timelineElements.scrollContainer.scrollLeft = targetScrollPosition;
  }
}

/**
 * Smooth scroll animation
 * @param {number} targetPosition - Target scroll position
 */
function smoothScrollTo(targetPosition) {
  if (scrollAnimationId) {
    cancelAnimationFrame(scrollAnimationId);
  }
  
  const startPosition = timelineElements.scrollContainer.scrollLeft;
  const distance = targetPosition - startPosition;
  const duration = TIMELINE_CONFIG.SCROLL_DURATION;
  const startTime = performance.now();
  
  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function (ease-out)
    const easeOut = 1 - Math.pow(1 - progress, 3);
    
    const currentPosition = startPosition + (distance * easeOut);
    timelineElements.scrollContainer.scrollLeft = currentPosition;
    
    if (progress < 1) {
      scrollAnimationId = requestAnimationFrame(animate);
    } else {
      scrollAnimationId = null;
    }
  }
  
  scrollAnimationId = requestAnimationFrame(animate);
}

/**
 * Show hover popup with lazy positioning
 * @param {Object} event - Event data
 * @param {HTMLElement} target - Target element
 */
function showHoverPopup(event, target) {
  const popup = timelineElements.hoverPopup;
  const rect = target.getBoundingClientRect();
  const containerRect = timelineElements.container.getBoundingClientRect();
  
  // Update popup content
  qs('.popup-title', popup).textContent = event.title;
  qs('.popup-date', popup).textContent = formatDate(event.timestamp, 'full');
  qs('.popup-type', popup).textContent = `${event.type} • ${event.severity}`;
  
  // Position popup
  const popupWidth = 250; // Estimated width
  const popupHeight = 80; // Estimated height
  
  let left = rect.left - containerRect.left + (rect.width / 2) - (popupWidth / 2);
  let top = rect.top - containerRect.top - popupHeight - 10;
  
  // Keep popup in bounds
  const maxLeft = timelineElements.container.clientWidth - popupWidth - 10;
  left = clamp(left, 10, maxLeft);
  
  if (top < 10) {
    top = rect.bottom - containerRect.top + 10;
  }
  
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  popup.style.display = 'block';
}

/**
 * Hide hover popup
 */
function hideHoverPopup() {
  timelineElements.hoverPopup.style.display = 'none';
}

/**
 * Handle window resize
 */
function handleResize() {
  updateViewportSize();
  renderTimeline();
}

/**
 * Toggle timeline playback
 */
function togglePlayback() {
  if (timelineState.isPlaying) {
    pausePlayback();
  } else {
    startPlayback();
  }
}

/**
 * Start timeline playback
 */
function startPlayback() {
  timelineState.isPlaying = true;
  timelineElements.playButton.innerHTML = '<span class=\"icon\">⏸</span>';
  timelineElements.playButton.setAttribute('aria-label', 'Pause timeline');
  
  // TODO: Implement playback logic
  console.log('📈 Timeline playback started');
}

/**
 * Pause timeline playback
 */
function pausePlayback() {
  timelineState.isPlaying = false;
  timelineElements.playButton.innerHTML = '<span class=\"icon\">▶</span>';
  timelineElements.playButton.setAttribute('aria-label', 'Play timeline');
  
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  console.log('📈 Timeline playback paused');
}

/**
 * Zoom timeline
 * @param {number} factor - Zoom factor
 */
function zoomTimeline(factor) {
  const newZoom = clamp(timelineState.zoom * factor, 0.5, 3.0);
  
  if (newZoom !== timelineState.zoom) {
    timelineState.zoom = newZoom;
    updateViewportSize();
    renderTimeline();
    updateZoomDisplay();
  }
}

/**
 * Update zoom level display
 */
function updateZoomDisplay() {
  const percentage = Math.round(timelineState.zoom * 100);
  timelineElements.zoomControls.level.textContent = `${percentage}%`;
}

/**
 * Update speed display
 */
function updateSpeedDisplay() {
  console.log(`📈 Timeline speed: ${timelineState.playbackSpeed}x`);
}

/**
 * Update timeline info display
 */
function updateTimelineInfo() {
  const count = timelineState.filteredEvents.length;
  const total = timelineState.events.length;
  
  let text = `${count} events`;
  if (count !== total) {
    text += ` (${total} total)`;
  }
  
  timelineElements.eventCount.textContent = text;
}

/**
 * Update timeline from store state
 * @param {Object} state - Store state
 */
function updateTimelineFromState(state) {
  if (state.events && state.events !== timelineState.events) {
    loadEvents(state.events);
  }
  
  if (state.selectedEvent && state.selectedEvent.id !== timelineState.activeEventId) {
    setActiveEvent(state.selectedEvent.id);
  }
}

/**
 * Get timeline performance stats
 * @returns {Object} Performance statistics
 */
export function getTimelineStats() {
  return {
    totalEvents: timelineState.events.length,
    filteredEvents: timelineState.filteredEvents.length,
    visibleEvents: timelineState.visibleEvents.length,
    isVirtualized: timelineState.isVirtualized,
    zoom: timelineState.zoom,
    renderRange: [timelineState.renderStartIndex, timelineState.renderEndIndex]
  };
}

console.log('📈 Enhanced Timeline module loaded');