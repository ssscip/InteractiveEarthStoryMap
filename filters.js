/**
 * @fileoverview Filters module for event filtering and search
 * Provides comprehensive filtering capabilities for event data
 */

import { store, actions, eventBus } from './js/store.js';
import { formatDate } from './js/utils/format.js';
import { qs, el, on, debounce } from './js/utils/dom.js';

/**
 * Filter state
 * @type {import('./js/types.js').FilterState}
 */
let filterState = {
  eventTypes: [],
  severityLevels: [],
  dateRange: { start: null, end: null },
  regions: [],
  searchQuery: '',
  isActive: false
};

/**
 * Filter DOM elements
 */
let filterElements = {
  container: null,
  typeCheckboxes: null,
  severitySlider: null,
  dateInputs: null,
  regionSelector: null,
  searchInput: null,
  clearButton: null,
  activeCount: null
};

/**
 * Available filter options
 */
const FILTER_OPTIONS = {
  eventTypes: [
    { id: 'fire', label: 'Wildfire', color: '#FF4444' },
    { id: 'flood', label: 'Flood', color: '#4444FF' },
    { id: 'earthquake', label: 'Earthquake', color: '#FF8800' },
    { id: 'hurricane', label: 'Hurricane', color: '#8844FF' },
    { id: 'drought', label: 'Drought', color: '#FFAA00' },
    { id: 'tornado', label: 'Tornado', color: '#44FF44' },
    { id: 'volcano', label: 'Volcanic Activity', color: '#FF0088' }
  ],
  severityLevels: [
    { id: 1, label: 'Minor', color: '#90EE90' },
    { id: 2, label: 'Moderate', color: '#FFD700' },
    { id: 3, label: 'Major', color: '#FF8C00' },
    { id: 4, label: 'Severe', color: '#FF6347' },
    { id: 5, label: 'Extreme', color: '#DC143C' }
  ],
  regions: [
    { id: 'north_america', label: 'North America' },
    { id: 'south_america', label: 'South America' },
    { id: 'europe', label: 'Europe' },
    { id: 'asia', label: 'Asia' },
    { id: 'africa', label: 'Africa' },
    { id: 'oceania', label: 'Oceania' },
    { id: 'antarctica', label: 'Antarctica' }
  ]
};

/**
 * Initialize filters module
 * @returns {boolean} Success status
 */
export function initFilters() {
  try {
    console.log('🔍 Initializing filters module...');
    
    // Get DOM elements
    filterElements.container = qs('.filters');
    if (!filterElements.container) {
      console.warn('Filters container not found');
      return false;
    }
    
    // Build filters UI
    buildFiltersUI();
    
    // Setup event listeners
    setupFilterEvents();
    
    // Subscribe to store updates
    store.subscribe((state) => {
      updateFiltersFromState(state);
    });
    
    // Initialize from current state
    const currentState = store.getState();
    if (currentState.events?.length > 0) {
      initializeFilterOptions(currentState.events);
    }
    
    console.log('✅ Filters module initialized');
    return true;
    
  } catch (error) {
    console.error('❌ Filters initialization failed:', error);
    return false;
  }
}

/**
 * Build filters user interface
 */
function buildFiltersUI() {
  const container = filterElements.container;
  
  container.innerHTML = `
    <div class="filters__header">
      <h3 class="filters__title">Filters</h3>
      <div class="filters__status">
        <span class="filters__active-count">0 active</span>
        <button class="filters__clear" aria-label="Clear all filters">Clear All</button>
      </div>
    </div>
    
    <div class="filters__content">
      <!-- Search -->
      <div class="filter-group">
        <label class="filter-group__label">Search Events</label>
        <div class="search-box">
          <input 
            type="text" 
            class="search-box__input" 
            placeholder="Search by title, location, or description..."
            aria-label="Search events"
          >
          <button class="search-box__clear" aria-label="Clear search">×</button>
        </div>
      </div>
      
      <!-- Event Types -->
      <div class="filter-group">
        <label class="filter-group__label">Event Types</label>
        <div class="filter-checkboxes" id="event-type-checkboxes">
          <!-- Checkboxes will be generated here -->
        </div>
      </div>
      
      <!-- Severity Levels -->
      <div class="filter-group">
        <label class="filter-group__label">Severity Level</label>
        <div class="severity-filter">
          <input 
            type="range" 
            class="severity-slider" 
            min="1" 
            max="5" 
            value="1"
            aria-label="Minimum severity level"
          >
          <div class="severity-labels">
            <span>Minor</span>
            <span>Extreme</span>
          </div>
          <div class="severity-value">Level: <span id="severity-value">1+</span></div>
        </div>
      </div>
      
      <!-- Date Range -->
      <div class="filter-group">
        <label class="filter-group__label">Date Range</label>
        <div class="date-range-filter">
          <div class="date-input-group">
            <label for="date-start">From:</label>
            <input type="date" id="date-start" class="date-input">
          </div>
          <div class="date-input-group">
            <label for="date-end">To:</label>
            <input type="date" id="date-end" class="date-input">
          </div>
          <button class="date-preset-btn" data-preset="last30">Last 30 Days</button>
          <button class="date-preset-btn" data-preset="thisYear">This Year</button>
        </div>
      </div>
      
      <!-- Regions -->
      <div class="filter-group">
        <label class="filter-group__label">Geographic Region</label>
        <select class="region-selector" multiple aria-label="Select regions">
          <option value="">All Regions</option>
          <!-- Options will be generated here -->
        </select>
      </div>
    </div>
  `;
  
  // Cache element references
  filterElements.searchInput = qs('.search-box__input', container);
  filterElements.severitySlider = qs('.severity-slider', container);
  filterElements.dateInputs = {
    start: qs('#date-start', container),
    end: qs('#date-end', container)
  };
  filterElements.regionSelector = qs('.region-selector', container);
  filterElements.clearButton = qs('.filters__clear', container);
  filterElements.activeCount = qs('.filters__active-count', container);
  
  // Generate filter options
  generateEventTypeCheckboxes();
  generateRegionOptions();
}

/**
 * Generate event type checkboxes
 */
function generateEventTypeCheckboxes() {
  const container = qs('#event-type-checkboxes');
  if (!container) return;
  
  container.innerHTML = '';
  
  FILTER_OPTIONS.eventTypes.forEach(type => {
    const checkboxWrapper = el('div', { className: 'filter-checkbox' });
    
    checkboxWrapper.innerHTML = `
      <input 
        type="checkbox" 
        id="type-${type.id}" 
        value="${type.id}"
        class="filter-checkbox__input"
      >
      <label for="type-${type.id}" class="filter-checkbox__label">
        <span class="filter-checkbox__indicator" style="background-color: ${type.color}"></span>
        ${type.label}
      </label>
    `;
    
    container.appendChild(checkboxWrapper);
  });
  
  // Cache checkbox references
  filterElements.typeCheckboxes = container.querySelectorAll('input[type="checkbox"]');
}

/**
 * Generate region options
 */
function generateRegionOptions() {
  const select = filterElements.regionSelector;
  if (!select) return;
  
  // Clear existing options (except "All Regions")
  const allOption = select.querySelector('option[value=""]');
  select.innerHTML = '';
  if (allOption) {
    select.appendChild(allOption);
  }
  
  FILTER_OPTIONS.regions.forEach(region => {
    const option = el('option', {
      value: region.id,
      textContent: region.label
    });
    select.appendChild(option);
  });
}

/**
 * Setup filter event listeners
 */
function setupFilterEvents() {
  const {
    searchInput,
    severitySlider,
    dateInputs,
    regionSelector,
    clearButton,
    typeCheckboxes
  } = filterElements;
  
  // Search input
  on(searchInput, 'input', debounce((event) => {
    setSearchQuery(event.target.value);
  }, 300));
  
  // Search clear button
  const searchClear = qs('.search-box__clear');
  on(searchClear, 'click', () => {
    searchInput.value = '';
    setSearchQuery('');
  });
  
  // Event type checkboxes
  typeCheckboxes.forEach(checkbox => {
    on(checkbox, 'change', updateEventTypeFilters);
  });
  
  // Severity slider
  on(severitySlider, 'input', (event) => {
    updateSeverityFilter(parseInt(event.target.value));
  });
  
  // Date inputs
  on(dateInputs.start, 'change', updateDateRangeFilter);
  on(dateInputs.end, 'change', updateDateRangeFilter);
  
  // Date preset buttons
  document.querySelectorAll('.date-preset-btn').forEach(btn => {
    on(btn, 'click', (event) => {
      applyDatePreset(event.target.dataset.preset);
    });
  });
  
  // Region selector
  on(regionSelector, 'change', updateRegionFilters);
  
  // Clear all button
  on(clearButton, 'click', clearAllFilters);
  
  // Store events
  eventBus.on('eventsLoaded', (events) => {
    initializeFilterOptions(events);
  });
  
  eventBus.on('filterUpdate', (filters) => {
    applyFilters(filters);
  });
}

/**
 * Initialize filter options from event data
 * @param {import('./js/types.js').EventRecord[]} events - Event data
 */
function initializeFilterOptions(events) {
  if (!events || events.length === 0) return;
  
  // Get date range from events
  const dates = events.map(event => new Date(event.date));
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  
  // Set date input limits
  if (filterElements.dateInputs.start) {
    filterElements.dateInputs.start.min = minDate.toISOString().split('T')[0];
    filterElements.dateInputs.start.max = maxDate.toISOString().split('T')[0];
  }
  
  if (filterElements.dateInputs.end) {
    filterElements.dateInputs.end.min = minDate.toISOString().split('T')[0];
    filterElements.dateInputs.end.max = maxDate.toISOString().split('T')[0];
  }
  
  console.log(`🔍 Filter options initialized for ${events.length} events`);
  console.log(`📅 Date range: ${formatDate(minDate)} to ${formatDate(maxDate)}`);
}

/**
 * Set search query filter
 * @param {string} query - Search query
 */
function setSearchQuery(query) {
  filterState.searchQuery = query.trim();
  updateFilterState();
  applyCurrentFilters();
  
  console.log(`🔍 Search query: "${query}"`);
}

/**
 * Update event type filters
 */
function updateEventTypeFilters() {
  const checkedTypes = Array.from(filterElements.typeCheckboxes)
    .filter(checkbox => checkbox.checked)
    .map(checkbox => checkbox.value);
  
  filterState.eventTypes = checkedTypes;
  updateFilterState();
  applyCurrentFilters();
  
  console.log(`🔍 Event types filter: ${checkedTypes.join(', ')}`);
}

/**
 * Update severity filter
 * @param {number} minSeverity - Minimum severity level
 */
function updateSeverityFilter(minSeverity) {
  filterState.severityLevels = Array.from(
    { length: 6 - minSeverity }, 
    (_, i) => minSeverity + i
  );
  
  // Update display
  const severityValue = qs('#severity-value');
  if (severityValue) {
    severityValue.textContent = `${minSeverity}+`;
  }
  
  updateFilterState();
  applyCurrentFilters();
  
  console.log(`🔍 Severity filter: ${minSeverity}+`);
}

/**
 * Update date range filter
 */
function updateDateRangeFilter() {
  const startDate = filterElements.dateInputs.start.value;
  const endDate = filterElements.dateInputs.end.value;
  
  filterState.dateRange = {
    start: startDate ? new Date(startDate) : null,
    end: endDate ? new Date(endDate) : null
  };
  
  updateFilterState();
  applyCurrentFilters();
  
  console.log(`🔍 Date range filter: ${startDate} to ${endDate}`);
}

/**
 * Apply date preset
 * @param {string} preset - Preset identifier
 */
function applyDatePreset(preset) {
  const now = new Date();
  let startDate, endDate;
  
  switch (preset) {
    case 'last30':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;
    case 'thisYear':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = now;
      break;
    default:
      return;
  }
  
  // Update inputs
  filterElements.dateInputs.start.value = startDate.toISOString().split('T')[0];
  filterElements.dateInputs.end.value = endDate.toISOString().split('T')[0];
  
  // Update filter state
  updateDateRangeFilter();
}

/**
 * Update region filters
 */
function updateRegionFilters() {
  const selectedOptions = Array.from(filterElements.regionSelector.selectedOptions)
    .map(option => option.value)
    .filter(value => value !== ''); // Exclude "All Regions"
  
  filterState.regions = selectedOptions;
  updateFilterState();
  applyCurrentFilters();
  
  console.log(`🔍 Regions filter: ${selectedOptions.join(', ')}`);
}

/**
 * Clear all filters
 */
function clearAllFilters() {
  // Reset filter state
  filterState = {
    eventTypes: [],
    severityLevels: [],
    dateRange: { start: null, end: null },
    regions: [],
    searchQuery: '',
    isActive: false
  };
  
  // Reset UI elements
  filterElements.searchInput.value = '';
  
  filterElements.typeCheckboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  
  filterElements.severitySlider.value = '1';
  const severityValue = qs('#severity-value');
  if (severityValue) {
    severityValue.textContent = '1+';
  }
  
  filterElements.dateInputs.start.value = '';
  filterElements.dateInputs.end.value = '';
  
  filterElements.regionSelector.selectedIndex = 0;
  
  updateFilterState();
  applyCurrentFilters();
  
  console.log('🔍 All filters cleared');
}

/**
 * Update filter state
 */
function updateFilterState() {
  // Check if any filters are active
  filterState.isActive = (
    filterState.eventTypes.length > 0 ||
    filterState.severityLevels.length > 0 ||
    filterState.dateRange.start ||
    filterState.dateRange.end ||
    filterState.regions.length > 0 ||
    filterState.searchQuery.length > 0
  );
  
  // Update active count display
  updateActiveFilterCount();
}

/**
 * Update active filter count display
 */
function updateActiveFilterCount() {
  let activeCount = 0;
  
  if (filterState.eventTypes.length > 0) activeCount++;
  if (filterState.severityLevels.length > 0) activeCount++;
  if (filterState.dateRange.start || filterState.dateRange.end) activeCount++;
  if (filterState.regions.length > 0) activeCount++;
  if (filterState.searchQuery.length > 0) activeCount++;
  
  if (filterElements.activeCount) {
    filterElements.activeCount.textContent = activeCount === 0 ? 
      'No active filters' : 
      `${activeCount} active filter${activeCount === 1 ? '' : 's'}`;
  }
  
  // Update clear button state
  if (filterElements.clearButton) {
    filterElements.clearButton.disabled = activeCount === 0;
  }
}

/**
 * Apply current filters
 */
function applyCurrentFilters() {
  // Update store with current filter state
  actions.setState({ filters: { ...filterState } }, 'updateFilters');
  
  // Emit filter change event
  eventBus.emit('filtersChanged', filterState);
}

/**
 * Apply filters to events
 * @param {import('./js/types.js').FilterState} filters - Filter state
 * @returns {function} Filter function
 */
function createEventFilter(filters) {
  return (event) => {
    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const searchableText = [
        event.title,
        event.description || '',
        event.location || ''
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(query)) {
        return false;
      }
    }
    
    // Event type filter
    if (filters.eventTypes.length > 0) {
      if (!filters.eventTypes.includes(event.type)) {
        return false;
      }
    }
    
    // Severity filter
    if (filters.severityLevels.length > 0) {
      const eventSeverity = event.severity || 1;
      if (!filters.severityLevels.includes(eventSeverity)) {
        return false;
      }
    }
    
    // Date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      const eventDate = new Date(event.date);
      
      if (filters.dateRange.start && eventDate < filters.dateRange.start) {
        return false;
      }
      
      if (filters.dateRange.end && eventDate > filters.dateRange.end) {
        return false;
      }
    }
    
    // Region filter
    if (filters.regions.length > 0) {
      const eventRegion = event.region || '';
      if (!filters.regions.includes(eventRegion)) {
        return false;
      }
    }
    
    return true;
  };
}

/**
 * Get filtered events from store
 * @returns {import('./js/types.js').EventRecord[]} Filtered events
 */
function getFilteredEvents() {
  const state = store.getState();
  const events = state.events || [];
  
  if (!filterState.isActive) {
    return events;
  }
  
  const filterFunction = createEventFilter(filterState);
  return events.filter(filterFunction);
}

/**
 * Update filters from store state
 * @param {import('./js/types.js').AppState} state - Application state
 */
function updateFiltersFromState(state) {
  if (state.filters && state.filters !== filterState) {
    Object.assign(filterState, state.filters);
    updateActiveFilterCount();
  }
}

/**
 * Cleanup filters module
 */
function cleanup() {
  console.log('🧹 Filters module cleaned up');
}

// Module event handling
eventBus.on('cleanup', cleanup);

// Export public interface
export {
  filterState,
  clearAllFilters,
  getFilteredEvents,
  createEventFilter,
  FILTER_OPTIONS
};