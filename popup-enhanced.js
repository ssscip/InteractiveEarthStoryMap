/**
 * @fileoverview Enhanced Popup module with dynamic content, accessibility, and sharing
 * Provides advanced modal functionality with focus trap, lazy loading, and URL sharing
 */

import { store, eventBus } from './js/store.js';
import { el, on, qs, addClass, removeClass, setAttributes } from './js/utils/dom.js';

/**
 * Enhanced popup state with accessibility features
 */
let popupState = {
  container: null,
  overlay: null,
  content: null,
  header: null,
  body: null,
  footer: null,
  closeButton: null,
  isOpen: false,
  currentEvent: null,
  focusTrap: {
    active: false,
    focusableElements: [],
    firstFocusable: null,
    lastFocusable: null,
    previousFocus: null
  },
  shareUrl: null,
  lazyImages: []
};

/**
 * Enhanced popup configuration
 */
const POPUP_CONFIG = {
  animation: {
    duration: 300,
    fadeIn: 'popup--fade-in',
    fadeOut: 'popup--fade-out'
  },
  zIndex: 1000,
  closeOnOverlayClick: true,
  closeOnEscape: true,
  accessibility: {
    trapFocus: true,
    announceOpen: true,
    returnFocus: true
  },
  sharing: {
    hashPrefix: '#event/',
    copyTimeout: 2000
  },
  lazyLoading: {
    threshold: 0.1,
    rootMargin: '50px'
  }
};

/**
 * Date formatting utility
 */
function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return {
      full: date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      short: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      iso: date.toISOString(),
      relative: getRelativeTime(date)
    };
  } catch (error) {
    console.error('Date formatting error:', error);
    return {
      full: dateString,
      short: dateString,
      iso: dateString,
      relative: 'Unknown'
    };
  }
}

/**
 * Get relative time description
 */
function getRelativeTime(date) {
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

/**
 * Initialize enhanced popup module
 * @returns {boolean} Success status
 */
export function initPopup() {
  try {
    console.log('📋 Initializing enhanced popup module...');
    
    // Create popup structure
    createEnhancedPopupStructure();
    
    // Setup event listeners
    setupPopupEvents();
    
    // Setup URL hash handling for sharing
    setupUrlHashHandling();
    
    // Setup lazy loading observer
    setupLazyLoadingObserver();
    
    console.log('✅ Enhanced popup module initialized');
    return true;
    
  } catch (error) {
    console.error('❌ Popup initialization failed:', error);
    return false;
  }
}

/**
 * Create enhanced popup structure with accessibility features
 */
function createEnhancedPopupStructure() {
  // Remove existing popup if any
  const existingPopup = qs('#enhanced-popup');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  // Create main popup container
  popupState.container = el('div', {
    id: 'enhanced-popup',
    className: 'popup popup--enhanced',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'popup-title',
    'aria-describedby': 'popup-summary',
    hidden: true
  });
  
  // Create overlay
  popupState.overlay = el('div', {
    className: 'popup__overlay',
    'aria-hidden': 'true'
  });
  
  // Create content container
  popupState.content = el('div', {
    className: 'popup__content',
    role: 'document'
  });
  
  // Create header
  popupState.header = el('header', {
    className: 'popup__header'
  });
  
  // Create close button with accessibility
  popupState.closeButton = el('button', {
    className: 'popup__close',
    type: 'button',
    'aria-label': 'Close event details',
    innerHTML: `
      <span class="popup__close-icon" aria-hidden="true">×</span>
      <span class="popup__close-text visually-hidden">Close</span>
    `
  });
  
  // Create body
  popupState.body = el('div', {
    className: 'popup__body'
  });
  
  // Create footer with actions
  popupState.footer = el('footer', {
    className: 'popup__footer'
  });
  
  // Assemble popup structure
  popupState.header.appendChild(popupState.closeButton);
  popupState.content.appendChild(popupState.header);
  popupState.content.appendChild(popupState.body);
  popupState.content.appendChild(popupState.footer);
  popupState.container.appendChild(popupState.overlay);
  popupState.container.appendChild(popupState.content);
  
  // Append to document
  document.body.appendChild(popupState.container);
}

/**
 * Setup popup event listeners with enhanced accessibility
 */
function setupPopupEvents() {
  // Close button
  on(popupState.closeButton, 'click', closePopup);
  
  // Overlay click (if enabled)
  if (POPUP_CONFIG.closeOnOverlayClick) {
    on(popupState.overlay, 'click', closePopup);
  }
  
  // Keyboard events
  on(document, 'keydown', handleKeydown);
  
  // Prevent content click from closing popup
  on(popupState.content, 'click', (e) => {
    e.stopPropagation();
  });
  
  // Listen for event selection from other modules
  eventBus.on('event:selected', (event) => {
    showEventPopup(event);
  });
  
  // Handle hash changes for direct linking
  on(window, 'hashchange', handleHashChange);
}

/**
 * Setup URL hash handling for sharing
 */
function setupUrlHashHandling() {
  // Check if there's an event hash on page load
  const hash = window.location.hash;
  if (hash.startsWith(POPUP_CONFIG.sharing.hashPrefix)) {
    const eventId = hash.replace(POPUP_CONFIG.sharing.hashPrefix, '');
    loadEventFromId(eventId);
  }
}

/**
 * Setup lazy loading observer for images
 */
function setupLazyLoadingObserver() {
  if ('IntersectionObserver' in window) {
    popupState.lazyImageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          loadLazyImage(img);
          popupState.lazyImageObserver.unobserve(img);
        }
      });
    }, {
      threshold: POPUP_CONFIG.lazyLoading.threshold,
      rootMargin: POPUP_CONFIG.lazyLoading.rootMargin
    });
  }
}

/**
 * Load lazy image with fallback
 */
function loadLazyImage(img) {
  const src = img.dataset.src;
  if (!src) return;
  
  // Show loading skeleton
  img.classList.add('popup__image--loading');
  
  // Create new image to test loading
  const testImg = new Image();
  
  testImg.onload = () => {
    img.src = src;
    img.classList.remove('popup__image--loading');
    img.classList.add('popup__image--loaded');
    img.removeAttribute('data-src');
  };
  
  testImg.onerror = () => {
    img.classList.remove('popup__image--loading');
    img.classList.add('popup__image--error');
    showImageFallback(img);
  };
  
  testImg.src = src;
}

/**
 * Show image fallback/placeholder
 */
function showImageFallback(img) {
  img.src = 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
      <rect width="200" height="150" fill="#2a2a2a"/>
      <text x="100" y="75" text-anchor="middle" fill="#666" font-family="Arial" font-size="14">
        Image not available
      </text>
    </svg>
  `);
  img.alt = 'Image not available';
}

/**
 * Show event popup with dynamic content
 * @param {Object} event - Event data
 */
export function showEventPopup(event) {
  if (!event || !popupState.container) {
    console.error('Cannot show popup: missing event or container');
    return;
  }
  
  console.log('📋 Showing event popup:', event.id);
  
  // Store current event and previous focus
  popupState.currentEvent = event;
  popupState.focusTrap.previousFocus = document.activeElement;
  
  // Generate dynamic content
  generatePopupContent(event);
  
  // Setup share URL
  setupShareUrl(event);
  
  // Open popup with animation
  openPopupWithAnimation();
  
  // Setup focus trap
  if (POPUP_CONFIG.accessibility.trapFocus) {
    setupFocusTrap();
  }
  
  // Announce to screen readers
  if (POPUP_CONFIG.accessibility.announceOpen) {
    announcePopupOpen(event);
  }
}

/**
 * Generate dynamic popup content
 * @param {Object} event - Event data
 */
function generatePopupContent(event) {
  const formattedDate = formatDate(event.timestamp);
  
  // Generate header content
  popupState.header.innerHTML = `
    <div class="popup__title-section">
      <h2 id="popup-title" class="popup__title">${escapeHtml(event.title)}</h2>
      <p id="popup-summary" class="popup__summary">
        ${escapeHtml(event.type)} event detected ${formattedDate.relative}
      </p>
    </div>
    ${popupState.closeButton.outerHTML}
  `;
  
  // Re-get close button reference after innerHTML
  popupState.closeButton = popupState.header.querySelector('.popup__close');
  on(popupState.closeButton, 'click', closePopup);
  
  // Generate body content with conditional rendering
  popupState.body.innerHTML = `
    <div class="popup__content-grid">
      <div class="popup__main-content">
        <div class="popup__date-section">
          <time datetime="${formattedDate.iso}" class="popup__date">
            <span class="popup__date-primary">${formattedDate.short}</span>
            <span class="popup__date-secondary">${formattedDate.relative}</span>
          </time>
        </div>
        
        <div class="popup__description">
          <p>${escapeHtml(event.description || 'Detailed information about this environmental event.')}</p>
        </div>
        
        ${generateMetricsList(event)}
        
        ${event.additionalData ? generateAdditionalInfo(event.additionalData) : ''}
      </div>
      
      <div class="popup__media-content">
        ${generateMediaContent(event)}
      </div>
    </div>
  `;
  
  // Generate footer with actions
  popupState.footer.innerHTML = `
    <div class="popup__actions">
      <button type="button" class="popup__action popup__action--primary" data-action="share">
        <span class="popup__action-icon" aria-hidden="true">🔗</span>
        <span class="popup__action-text">Share Link</span>
      </button>
      
      <button type="button" class="popup__action popup__action--secondary" data-action="view-location">
        <span class="popup__action-icon" aria-hidden="true">📍</span>
        <span class="popup__action-text">View on Map</span>
      </button>
      
      ${event.externalUrl ? `
        <a href="${escapeHtml(event.externalUrl)}" target="_blank" rel="noopener noreferrer" 
           class="popup__action popup__action--external">
          <span class="popup__action-icon" aria-hidden="true">🔗</span>
          <span class="popup__action-text">External Source</span>
        </a>
      ` : ''}
    </div>
    
    <div class="popup__share-feedback" id="share-feedback" aria-live="polite" aria-atomic="true"></div>
  `;
  
  // Setup action button listeners
  setupActionButtons();
  
  // Setup lazy loading for images
  setupLazyImagesInPopup();
}

/**
 * Generate metrics list with conditional rendering
 * @param {Object} event - Event data
 * @returns {string} HTML string
 */
function generateMetricsList(event) {
  const metrics = [];
  
  // Add basic metrics
  if (event.severity) {
    metrics.push({
      label: 'Severity',
      value: event.severity,
      className: `popup__metric--severity-${event.severity.toLowerCase()}`
    });
  }
  
  if (event.instrument) {
    metrics.push({
      label: 'Instrument',
      value: event.instrument.toUpperCase(),
      className: 'popup__metric--instrument'
    });
  }
  
  if (event.coordinates) {
    metrics.push({
      label: 'Location',
      value: `${event.coordinates.lat.toFixed(2)}°, ${event.coordinates.lng.toFixed(2)}°`,
      className: 'popup__metric--coordinates'
    });
  }
  
  // Add custom metrics if available
  if (event.metrics) {
    Object.entries(event.metrics).forEach(([key, value]) => {
      metrics.push({
        label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        value: formatMetricValue(value),
        className: `popup__metric--${key.toLowerCase()}`
      });
    });
  }
  
  if (metrics.length === 0) {
    return '<p class="popup__no-metrics">No additional metrics available.</p>';
  }
  
  return `
    <div class="popup__metrics">
      <h3 class="popup__metrics-title">Event Metrics</h3>
      <dl class="popup__metrics-list">
        ${metrics.map(metric => `
          <div class="popup__metric ${metric.className || ''}">
            <dt class="popup__metric-label">${escapeHtml(metric.label)}</dt>
            <dd class="popup__metric-value">${escapeHtml(metric.value)}</dd>
          </div>
        `).join('')}
      </dl>
    </div>
  `;
}

/**
 * Generate media content with lazy loading
 * @param {Object} event - Event data
 * @returns {string} HTML string
 */
function generateMediaContent(event) {
  if (!event.media || event.media.length === 0) {
    return `
      <div class="popup__media popup__media--empty">
        <div class="popup__media-placeholder">
          <div class="popup__media-icon" aria-hidden="true">🌍</div>
          <p class="popup__media-text">No media available</p>
        </div>
      </div>
    `;
  }
  
  return `
    <div class="popup__media">
      <h3 class="popup__media-title">Related Media</h3>
      <div class="popup__media-grid">
        ${event.media.map((media, index) => `
          <div class="popup__media-item">
            <img 
              class="popup__image popup__image--lazy" 
              data-src="${escapeHtml(media.url)}"
              alt="${escapeHtml(media.alt || `Event image ${index + 1}`)}"
              loading="lazy"
              width="200"
              height="150"
            />
            ${media.caption ? `
              <p class="popup__media-caption">${escapeHtml(media.caption)}</p>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Generate additional information section
 * @param {Object} additionalData - Additional event data
 * @returns {string} HTML string
 */
function generateAdditionalInfo(additionalData) {
  return `
    <div class="popup__additional">
      <h3 class="popup__additional-title">Additional Information</h3>
      <div class="popup__additional-content">
        ${Object.entries(additionalData).map(([key, value]) => `
          <div class="popup__additional-item">
            <strong>${escapeHtml(key.replace(/([A-Z])/g, ' $1'))}:</strong>
            <span>${escapeHtml(value)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Setup action button event listeners
 */
function setupActionButtons() {
  const actionButtons = popupState.footer.querySelectorAll('[data-action]');
  
  actionButtons.forEach(button => {
    const action = button.dataset.action;
    
    switch (action) {
      case 'share':
        on(button, 'click', handleShareAction);
        break;
      case 'view-location':
        on(button, 'click', handleViewLocationAction);
        break;
    }
  });
}

/**
 * Handle share action
 */
function handleShareAction() {
  if (!popupState.shareUrl) return;
  
  const feedbackEl = qs('#share-feedback');
  
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(popupState.shareUrl)
      .then(() => {
        showShareFeedback('Link copied to clipboard!', 'success');
      })
      .catch(() => {
        showShareFeedback('Failed to copy link', 'error');
      });
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = popupState.shareUrl;
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      showShareFeedback('Link copied to clipboard!', 'success');
    } catch (err) {
      showShareFeedback('Failed to copy link', 'error');
    }
    
    document.body.removeChild(textArea);
  }
}

/**
 * Show share feedback message
 * @param {string} message - Feedback message
 * @param {string} type - Feedback type (success/error)
 */
function showShareFeedback(message, type) {
  const feedbackEl = qs('#share-feedback');
  if (!feedbackEl) return;
  
  feedbackEl.textContent = message;
  feedbackEl.className = `popup__share-feedback popup__share-feedback--${type}`;
  
  setTimeout(() => {
    feedbackEl.textContent = '';
    feedbackEl.className = 'popup__share-feedback';
  }, POPUP_CONFIG.sharing.copyTimeout);
}

/**
 * Handle view location action
 */
function handleViewLocationAction() {
  if (!popupState.currentEvent?.coordinates) return;
  
  // Close popup first
  closePopup();
  
  // Emit event to center map on location
  eventBus.emit('map:center', {
    lat: popupState.currentEvent.coordinates.lat,
    lng: popupState.currentEvent.coordinates.lng,
    zoom: 8
  });
}

/**
 * Setup lazy loading for images in popup
 */
function setupLazyImagesInPopup() {
  const lazyImages = popupState.container.querySelectorAll('.popup__image--lazy');
  
  lazyImages.forEach(img => {
    if (popupState.lazyImageObserver) {
      popupState.lazyImageObserver.observe(img);
    } else {
      // Fallback for browsers without IntersectionObserver
      loadLazyImage(img);
    }
  });
}

/**
 * Setup share URL for the event
 * @param {Object} event - Event data
 */
function setupShareUrl(event) {
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  popupState.shareUrl = `${baseUrl}${POPUP_CONFIG.sharing.hashPrefix}${event.id}`;
  
  // Update browser URL without triggering navigation
  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, '', popupState.shareUrl);
  }
}

/**
 * Setup focus trap for accessibility
 */
function setupFocusTrap() {
  const focusableElements = popupState.container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  popupState.focusTrap.focusableElements = Array.from(focusableElements);
  popupState.focusTrap.firstFocusable = popupState.focusTrap.focusableElements[0];
  popupState.focusTrap.lastFocusable = popupState.focusTrap.focusableElements[
    popupState.focusTrap.focusableElements.length - 1
  ];
  
  popupState.focusTrap.active = true;
  
  // Focus first element
  if (popupState.focusTrap.firstFocusable) {
    popupState.focusTrap.firstFocusable.focus();
  }
}

/**
 * Handle keyboard navigation and focus trap
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleKeydown(e) {
  if (!popupState.isOpen) return;
  
  // Close on Escape
  if (e.key === 'Escape' && POPUP_CONFIG.closeOnEscape) {
    e.preventDefault();
    closePopup();
    return;
  }
  
  // Handle Tab navigation for focus trap
  if (e.key === 'Tab' && popupState.focusTrap.active) {
    if (e.shiftKey) {
      // Shift + Tab (backward)
      if (document.activeElement === popupState.focusTrap.firstFocusable) {
        e.preventDefault();
        popupState.focusTrap.lastFocusable.focus();
      }
    } else {
      // Tab (forward)
      if (document.activeElement === popupState.focusTrap.lastFocusable) {
        e.preventDefault();
        popupState.focusTrap.firstFocusable.focus();
      }
    }
  }
}

/**
 * Open popup with animation
 */
function openPopupWithAnimation() {
  popupState.isOpen = true;
  popupState.container.hidden = false;
  
  // Add opening animation class
  addClass(popupState.container, POPUP_CONFIG.animation.fadeIn);
  
  // Prevent body scroll
  addClass(document.body, 'popup-open');
  
  setTimeout(() => {
    removeClass(popupState.container, POPUP_CONFIG.animation.fadeIn);
  }, POPUP_CONFIG.animation.duration);
}

/**
 * Close popup
 */
export function closePopup() {
  if (!popupState.isOpen) return;
  
  console.log('📋 Closing popup');
  
  // Add closing animation
  addClass(popupState.container, POPUP_CONFIG.animation.fadeOut);
  
  setTimeout(() => {
    popupState.container.hidden = true;
    removeClass(popupState.container, POPUP_CONFIG.animation.fadeOut);
    removeClass(document.body, 'popup-open');
    
    // Clean up focus trap
    popupState.focusTrap.active = false;
    
    // Return focus to previous element
    if (POPUP_CONFIG.accessibility.returnFocus && popupState.focusTrap.previousFocus) {
      popupState.focusTrap.previousFocus.focus();
    }
    
    // Clear URL hash
    if (window.history && window.history.replaceState) {
      const baseUrl = `${window.location.origin}${window.location.pathname}`;
      window.history.replaceState(null, '', baseUrl);
    }
    
    popupState.isOpen = false;
    popupState.currentEvent = null;
    popupState.shareUrl = null;
    
  }, POPUP_CONFIG.animation.duration);
}

/**
 * Handle hash change for direct linking
 */
function handleHashChange() {
  const hash = window.location.hash;
  
  if (hash.startsWith(POPUP_CONFIG.sharing.hashPrefix)) {
    const eventId = hash.replace(POPUP_CONFIG.sharing.hashPrefix, '');
    loadEventFromId(eventId);
  } else if (popupState.isOpen) {
    // Close popup if hash is cleared
    closePopup();
  }
}

/**
 * Load event from ID for direct linking
 * @param {string} eventId - Event ID
 */
async function loadEventFromId(eventId) {
  try {
    // Get events from store or load them
    const state = store.getState();
    let events = state.events;
    
    if (!events || events.length === 0) {
      // Load events if not available
      const { loadAllEvents } = await import('./js/dataLoader.js');
      events = await loadAllEvents();
    }
    
    // Find event by ID
    const event = events.find(e => e.id === eventId);
    
    if (event) {
      showEventPopup(event);
    } else {
      console.warn('Event not found for ID:', eventId);
    }
    
  } catch (error) {
    console.error('Failed to load event from ID:', error);
  }
}

/**
 * Announce popup open to screen readers
 * @param {Object} event - Event data
 */
function announcePopupOpen(event) {
  const announcement = `Event details opened for ${event.title}. Use Tab to navigate, Escape to close.`;
  
  // Create or update announcement element
  let announcer = qs('#popup-announcer');
  if (!announcer) {
    announcer = el('div', {
      id: 'popup-announcer',
      className: 'visually-hidden',
      'aria-live': 'polite',
      'aria-atomic': 'true'
    });
    document.body.appendChild(announcer);
  }
  
  announcer.textContent = announcement;
}

/**
 * Format metric value for display
 * @param {*} value - Metric value
 * @returns {string} Formatted value
 */
function formatMetricValue(value) {
  if (typeof value === 'number') {
    if (value > 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value > 1000) {
      return (value / 1000).toFixed(1) + 'K';
    } else {
      return value.toLocaleString();
    }
  }
  return String(value);
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return String(text);
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export main functions
export { showEventPopup, closePopup };

// Global popup functions for external access
window.showEventPopup = showEventPopup;
window.closePopup = closePopup;