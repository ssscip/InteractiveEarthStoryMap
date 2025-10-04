// Timeline Module for Interactive Earth Story Map
import { store, storeUtils, STORY_STATUS } from './store.js';

const TIMELINE_CONFIG = {
  itemWidth: 8,
  itemHeight: 6,
  itemSpacing: 2,
  animationDuration: 300,
  hoverDelay: 500
};

let timelineState = {
  container: null,
  track: null,
  items: [],
  sortedEvents: [],
  selectedItem: null,
  hoverTimeout: null,
  isInitialized: false
};

export function initTimeline(containerSelector = '.timeline-container') {
  try {
    console.log('🕐 Initializing timeline...');
    
    timelineState.container = document.querySelector(containerSelector);
    if (!timelineState.container) {
      console.error('Timeline container not found:', containerSelector);
      return false;
    }
    
    timelineState.track = timelineState.container.querySelector('.timeline-track');
    if (!timelineState.track) {
      timelineState.track = document.createElement('div');
      timelineState.track.className = 'timeline-track';
      timelineState.track.setAttribute('role', 'slider');
      timelineState.track.setAttribute('aria-label', 'Timeline navigation');
      timelineState.track.setAttribute('tabindex', '0');
      timelineState.container.appendChild(timelineState.track);
    }
    
    setupTimelineEventListeners();
    store.subscribe(handleStoreUpdate);
    
    timelineState.isInitialized = true;
    console.log('✅ Timeline initialized successfully');
    
    return true;
    
  } catch (error) {
    console.error('❌ Timeline initialization failed:', error);
    return false;
  }
}

function handleStoreUpdate(newState, prevState, action) {
  if (!timelineState.isInitialized) return;
  
  if (action === 'setEventsData' || action === 'setFilteredEvents') {
    renderTimeline();
  }
  
  if (action === 'setActiveEvent') {
    updateTimelineSelection(newState.activeEventId);
  }
  
  if (action === 'setStoryStatus' || action === 'setStoryIndex') {
    updateStoryModeIndicator(newState.story);
  }
}

export function renderTimeline() {
  if (!timelineState.isInitialized) {
    console.warn('⚠️ Timeline not initialized');
    return;
  }
  
  try {
    const state = store.getState();
    const events = state.filteredEvents || [];
    
    console.log('🎨 Rendering timeline with', events.length, 'events');
    
    timelineState.sortedEvents = [...events].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    clearTimeline();
    
    const placeholder = timelineState.track.querySelector('.timeline-placeholder');
    if (placeholder) {
      placeholder.remove();
    }
    
    if (timelineState.sortedEvents.length === 0) {
      showTimelinePlaceholder('No events to display');
      return;
    }
    
    timelineState.items = [];
    const trackWidth = calculateTrackWidth(timelineState.sortedEvents.length);
    timelineState.track.style.width = trackWidth + 'px';
    
    timelineState.sortedEvents.forEach((event, index) => {
      const item = createTimelineItem(event, index);
      timelineState.track.appendChild(item);
      timelineState.items.push(item);
    });
    
    updateResultsCounter(timelineState.sortedEvents.length);
    
    console.log('✅ Timeline rendered successfully');
    
  } catch (error) {
    console.error('❌ Timeline rendering failed:', error);
    showTimelinePlaceholder('Error rendering timeline');
  }
}

function createTimelineItem(event, index) {
  const item = document.createElement('div');
  item.className = 'timeline-item timeline-item--' + event.type;
  item.dataset.eventId = event.id;
  item.dataset.eventIndex = index;
  
  item.setAttribute('role', 'button');
  item.setAttribute('tabindex', '0');
  item.setAttribute('aria-label', 
    event.title + ' on ' + formatDate(event.date) + '. ' + event.type + ' event with ' + event.severity + ' severity.');
  
  const leftPosition = index * (TIMELINE_CONFIG.itemWidth + TIMELINE_CONFIG.itemSpacing);
  item.style.left = leftPosition + 'px';
  item.style.width = TIMELINE_CONFIG.itemWidth + 'px';
  item.style.height = TIMELINE_CONFIG.itemHeight + 'px';
  
  if (event.severity) {
    item.classList.add('timeline-item--' + event.severity);
  }
  
  item.innerHTML = '<span class="visually-hidden">' + event.title + '</span><div class="timeline-item-indicator" data-type="' + event.type + '"></div>';
  
  return item;
}

export function selectTimelineItem(eventId, itemElement = null) {
  if (!timelineState.isInitialized) return;
  
  try {
    if (timelineState.selectedItem) {
      timelineState.selectedItem.classList.remove('timeline-item--selected');
      timelineState.selectedItem.setAttribute('aria-selected', 'false');
    }
    
    const item = itemElement || timelineState.track.querySelector('[data-event-id="' + eventId + '"]');
    
    if (item && eventId) {
      item.classList.add('timeline-item--selected');
      item.setAttribute('aria-selected', 'true');
      timelineState.selectedItem = item;
      
      scrollTimelineToItem(item);
      
      console.log('🎯 Timeline item selected:', eventId);
    } else {
      timelineState.selectedItem = null;
      console.log('🎯 Timeline selection cleared');
    }
    
  } catch (error) {
    console.error('❌ Timeline selection failed:', error);
  }
}

function setupTimelineEventListeners() {
  if (!timelineState.track) return;
  
  timelineState.track.addEventListener('click', (event) => {
    const item = event.target.closest('.timeline-item');
    if (item) {
      const eventId = item.dataset.eventId;
      storeUtils.setActiveEvent(eventId);
    }
  });
  
  timelineState.track.addEventListener('keydown', (event) => {
    const item = event.target.closest('.timeline-item');
    if (!item) return;
    
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        item.click();
        break;
        
      case 'ArrowLeft':
        event.preventDefault();
        navigateTimeline(item, -1);
        break;
        
      case 'ArrowRight':
        event.preventDefault();
        navigateTimeline(item, 1);
        break;
        
      case 'Home':
        event.preventDefault();
        focusTimelineItem(0);
        break;
        
      case 'End':
        event.preventDefault();
        focusTimelineItem(timelineState.items.length - 1);
        break;
    }
  });
  
  attachHoverPopups();
}

export function attachHoverPopups() {
  if (!timelineState.track) return;
  
  timelineState.track.addEventListener('mouseenter', (event) => {
    const item = event.target.closest('.timeline-item');
    if (item) {
      showTimelinePopup(item);
    }
  }, true);
  
  timelineState.track.addEventListener('mouseleave', (event) => {
    const item = event.target.closest('.timeline-item');
    if (item) {
      hideTimelinePopup();
    }
  }, true);
}

function showTimelinePopup(item) {
  if (timelineState.hoverTimeout) {
    clearTimeout(timelineState.hoverTimeout);
  }
  
  timelineState.hoverTimeout = setTimeout(() => {
    const eventId = item.dataset.eventId;
    const event = timelineState.sortedEvents.find(e => e.id === eventId);
    
    if (event) {
      createTimelinePopup(item, event);
    }
  }, TIMELINE_CONFIG.hoverDelay);
}

function hideTimelinePopup() {
  if (timelineState.hoverTimeout) {
    clearTimeout(timelineState.hoverTimeout);
    timelineState.hoverTimeout = null;
  }
  
  const existingPopup = document.querySelector('.timeline-popup');
  if (existingPopup) {
    existingPopup.remove();
  }
}

function createTimelinePopup(item, event) {
  hideTimelinePopup();
  
  const popup = document.createElement('div');
  popup.className = 'timeline-popup';
  popup.setAttribute('role', 'tooltip');
  
  popup.innerHTML = '<div class="timeline-popup-header"><h4 class="timeline-popup-title">' + event.title + '</h4><span class="timeline-popup-type">' + event.type + '</span></div><div class="timeline-popup-body"><div class="timeline-popup-date">' + formatDate(event.date) + '</div><div class="timeline-popup-location">' + event.location.name + '</div><div class="timeline-popup-severity">Severity: ' + event.severity + '</div><div class="timeline-popup-summary">' + event.summary + '</div></div>';
  
  const itemRect = item.getBoundingClientRect();
  const containerRect = timelineState.container.getBoundingClientRect();
  
  popup.style.position = 'absolute';
  popup.style.left = (itemRect.left - containerRect.left + (itemRect.width / 2)) + 'px';
  popup.style.top = (itemRect.top - containerRect.top - 10) + 'px';
  
  timelineState.container.appendChild(popup);
  
  setTimeout(() => {
    if (popup.parentNode) {
      popup.remove();
    }
  }, 3000);
}

function navigateTimeline(currentItem, direction) {
  const currentIndex = parseInt(currentItem.dataset.eventIndex);
  const newIndex = currentIndex + direction;
  
  if (newIndex >= 0 && newIndex < timelineState.items.length) {
    focusTimelineItem(newIndex);
  }
}

function focusTimelineItem(index) {
  if (index >= 0 && index < timelineState.items.length) {
    const item = timelineState.items[index];
    item.focus();
    scrollTimelineToItem(item);
  }
}

function scrollTimelineToItem(item) {
  if (!item || !timelineState.container) return;
  
  const itemRect = item.getBoundingClientRect();
  const containerRect = timelineState.container.getBoundingClientRect();
  
  if (itemRect.left < containerRect.left || itemRect.right > containerRect.right) {
    const scrollLeft = item.offsetLeft - (timelineState.container.clientWidth / 2);
    
    timelineState.container.scrollTo({
      left: Math.max(0, scrollLeft),
      behavior: 'smooth'
    });
  }
}

function updateTimelineSelection(activeEventId) {
  selectTimelineItem(activeEventId);
}

function updateStoryModeIndicator(storyState) {
  timelineState.track.classList.toggle('timeline-track--story-mode', 
    storyState.status !== STORY_STATUS.IDLE);
    
  if (storyState.status !== STORY_STATUS.IDLE && storyState.order.length > 0) {
    const currentEventId = storyState.order[storyState.index];
    selectTimelineItem(currentEventId);
  }
}

function clearTimeline() {
  if (timelineState.track) {
    timelineState.track.innerHTML = '';
    timelineState.items = [];
    timelineState.selectedItem = null;
  }
}

function showTimelinePlaceholder(message) {
  const placeholder = document.createElement('div');
  placeholder.className = 'timeline-placeholder';
  placeholder.textContent = message;
  placeholder.setAttribute('role', 'status');
  placeholder.setAttribute('aria-live', 'polite');
  
  timelineState.track.appendChild(placeholder);
}

function calculateTrackWidth(itemCount) {
  return Math.max(
    itemCount * (TIMELINE_CONFIG.itemWidth + TIMELINE_CONFIG.itemSpacing) + TIMELINE_CONFIG.itemSpacing,
    timelineState.container.clientWidth
  );
}

function updateResultsCounter(count) {
  const counter = document.querySelector('#results-count');
  if (counter) {
    counter.textContent = count;
    counter.setAttribute('aria-live', 'polite');
  }
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function cleanupTimeline() {
  hideTimelinePopup();
  clearTimeline();
  timelineState.isInitialized = false;
  
  console.log('🧹 Timeline cleaned up');
}

export { timelineState, TIMELINE_CONFIG };