// Filters Module for Interactive Earth Story Map
import { store, storeUtils } from './store.js';

const FILTER_CONFIG = {
  debounceDelay: 300,
  animationDuration: 200
};

let filterState = {
  container: null,
  selects: {},
  debounceTimer: null,
  options: {
    instrument: [],
    anomalyType: [],
    year: []
  },
  isInitialized: false
};

export function initFilters(filtersSelector = '.controls-container') {
  try {
    console.log('🔍 Initializing filters...');
    
    filterState.container = document.querySelector(filtersSelector);
    if (!filterState.container) {
      console.error('Filters container not found:', filtersSelector);
      return false;
    }
    
    findFilterElements();
    setupFilterEventListeners();
    store.subscribe(handleStoreUpdate);
    
    filterState.isInitialized = true;
    console.log('✅ Filters initialized successfully');
    
    return true;
    
  } catch (error) {
    console.error('❌ Filters initialization failed:', error);
    return false;
  }
}

function findFilterElements() {
  filterState.selects = {
    instrument: document.querySelector('#instrument-select'),
    anomalyType: document.querySelector('#anomaly-type-select'),
    year: document.querySelector('#year-select')
  };
}

function setupFilterEventListeners() {
  Object.keys(filterState.selects).forEach(filterType => {
    const select = filterState.selects[filterType];
    if (select) {
      select.addEventListener('change', () => {
        debouncedApplyFilters();
      });
    }
  });
}

function handleStoreUpdate(newState, prevState, action) {
  if (!filterState.isInitialized) return;
  
  if (action === 'setEventsData') {
    populateFilterOptions(newState.events);
    applyFilters();
  }
}

function debouncedApplyFilters() {
  if (filterState.debounceTimer) {
    clearTimeout(filterState.debounceTimer);
  }
  
  filterState.debounceTimer = setTimeout(() => {
    applyFilters();
  }, FILTER_CONFIG.debounceDelay);
}

export function applyFilters(customFilters = null, skipDebounce = false) {
  if (!filterState.isInitialized && !skipDebounce) return;
  
  try {
    const state = store.getState();
    const allEvents = state.events || [];
    
    // Get current filter values
    const filters = customFilters || getCurrentFilters();
    
    console.log('🔍 Applying filters:', filters);
    
    // Filter events
    const filteredEvents = computeFilteredEvents(allEvents, filters);
    
    // Update store
    storeUtils.updateFilters(filters);
    storeUtils.setFilteredEvents(filteredEvents);
    
    console.log(`✅ Filtered ${allEvents.length} -> ${filteredEvents.length} events`);
    
  } catch (error) {
    console.error('❌ Filter application failed:', error);
  }
}

function getCurrentFilters() {
  return {
    instrument: filterState.selects.instrument?.value || '',
    anomalyType: filterState.selects.anomalyType?.value || '',
    year: filterState.selects.year?.value || ''
  };
}

export function computeFilteredEvents(events, filters) {
  return events.filter(event => {
    // Instrument filter
    if (filters.instrument && event.instrument !== filters.instrument) {
      return false;
    }
    
    // Anomaly type filter
    if (filters.anomalyType && event.type !== filters.anomalyType) {
      return false;
    }
    
    // Year filter
    if (filters.year) {
      const eventYear = new Date(event.date).getFullYear().toString();
      if (eventYear !== filters.year) {
        return false;
      }
    }
    
    return true;
  });
}

function populateFilterOptions(events) {
  if (!events || events.length === 0) return;
  
  // Extract unique options
  filterState.options = {
    instrument: [...new Set(events.map(e => e.instrument))].filter(Boolean).sort(),
    anomalyType: [...new Set(events.map(e => e.type))].filter(Boolean).sort(),
    year: [...new Set(events.map(e => new Date(e.date).getFullYear().toString()))].filter(Boolean).sort()
  };
  
  // Populate select elements
  populateSelect('instrument', 'All Instruments');
  populateSelect('anomalyType', 'All Types');
  populateSelect('year', 'All Years');
  
  console.log('📝 Filter options populated:', filterState.options);
}

function populateSelect(filterType, defaultLabel) {
  const select = filterState.selects[filterType];
  if (!select) return;
  
  const currentValue = select.value;
  
  // Clear existing options except the first one
  while (select.children.length > 1) {
    select.removeChild(select.lastChild);
  }
  
  // Update default option text
  if (select.firstElementChild) {
    select.firstElementChild.textContent = defaultLabel;
  }
  
  // Add new options
  filterState.options[filterType].forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option;
    optionElement.textContent = formatOptionText(filterType, option);
    select.appendChild(optionElement);
  });
  
  // Restore previous value if it still exists
  if (currentValue && filterState.options[filterType].includes(currentValue)) {
    select.value = currentValue;
  }
}

function formatOptionText(filterType, value) {
  switch (filterType) {
    case 'anomalyType':
      return value.charAt(0).toUpperCase() + value.slice(1).replace('_', ' ');
    case 'instrument':
      return value.toUpperCase();
    case 'year':
      return value;
    default:
      return value;
  }
}

export function resetFilters() {
  console.log('🔄 Resetting filters');
  
  Object.values(filterState.selects).forEach(select => {
    if (select) {
      select.selectedIndex = 0;
    }
  });
  
  applyFilters({
    instrument: '',
    anomalyType: '',
    year: ''
  }, true);
}

export function setFilter(filterType, value) {
  const select = filterState.selects[filterType];
  if (select) {
    select.value = value;
    debouncedApplyFilters();
  }
}

export function getFilterSummary() {
  const filters = getCurrentFilters();
  const activeFilters = Object.entries(filters)
    .filter(([key, value]) => value)
    .map(([key, value]) => `${key}: ${value}`);
  
  return activeFilters.length > 0 ? activeFilters.join(', ') : 'No filters applied';
}

export const filterUtils = {
  getCurrentFilters,
  resetFilters,
  setFilter,
  getFilterSummary,
  populateFilterOptions
};

export function cleanupFilters() {
  if (filterState.debounceTimer) {
    clearTimeout(filterState.debounceTimer);
  }
  
  filterState.isInitialized = false;
  
  console.log('🧹 Filters cleaned up');
}

export { filterState, FILTER_CONFIG };