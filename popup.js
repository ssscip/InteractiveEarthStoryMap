/**
 * @fileoverview Popup module for modal dialogs and event details
 * Provides modal functionality for detailed event information
 */

import { store, eventBus } from './js/store.js';
import { formatDate } from './js/utils/format.js';
import { el, on, qs } from './js/utils/dom.js';

/**
 * Popup state
 */
let popupState = {
  container: null,
  overlay: null,
  isOpen: false,
  currentContent: null,
  focusTrap: null
};

/**
 * Popup configuration
 */
const POPUP_CONFIG = {
  animation: {
    duration: 300,
    fadeIn: 'popup--fade-in',
    fadeOut: 'popup--fade-out'
  },
  zIndex: 1000,
  closeOnOverlayClick: true,
  closeOnEscape: true
};

/**
 * Initialize popup module
 * @returns {boolean} Success status
 */
export function initPopup() {
  try {
    console.log('📋 Initializing popup module...');
    
    // Create popup structure
    createPopupStructure();
    
    // Setup event listeners
    setupPopupEvents();
    
    console.log('✅ Popup module initialized');
    return true;
    
  } catch (error) {
    console.error('❌ Popup initialization failed:', error);
    return false;
  }
}

/**
 * Create popup structure
 */
function createPopupStructure() {
  // Check if popup already exists
  let overlay = document.querySelector('.popup-overlay');
  
  if (!overlay) {
    // Create overlay
    overlay = el('div', {
      className: 'popup-overlay',
      'aria-hidden': 'true'
    });
    
    // Create popup container
    const container = el('div', {
      className: 'popup-container',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'popup-title'
    });
    
    overlay.appendChild(container);
    document.body.appendChild(overlay);
  }
  
  popupState.overlay = overlay;
  popupState.container = overlay.querySelector('.popup-container');
}

/**
 * Setup popup event listeners
 */
function setupPopupEvents() {
  // Listen for event selection to show details
  eventBus.on('eventSelected', (event) => {
    showEventDetails(event);
  });
  
  // Listen for popup events
  eventBus.on('showPopup', (options) => {
    showPopup(options);
  });
  
  eventBus.on('hidePopup', () => {
    hidePopup();
  });
  
  // Global keyboard handler
  on(document, 'keydown', (event) => {
    if (event.key === 'Escape' && popupState.isOpen && POPUP_CONFIG.closeOnEscape) {
      hidePopup();
    }
  });
  
  // Overlay click handler
  on(popupState.overlay, 'click', (event) => {
    if (event.target === popupState.overlay && POPUP_CONFIG.closeOnOverlayClick) {
      hidePopup();
    }
  });
}

/**
 * Show popup with content
 * @param {Object} options - Popup options
 */
export function showPopup(options) {
  const {
    title = '',
    content = '',
    size = 'medium',
    closable = true,
    actions = []
  } = options;
  
  if (popupState.isOpen) {
    hidePopup();
  }
  
  // Create popup content
  const popupHTML = `
    <div class="popup popup--${size}">
      <div class="popup__header">
        <h2 id="popup-title" class="popup__title">${title}</h2>
        ${closable ? '<button class="popup__close" aria-label="Close popup">×</button>' : ''}
      </div>
      <div class="popup__content">
        ${content}
      </div>
      ${actions.length > 0 ? createPopupActions(actions) : ''}
    </div>
  `;
  
  popupState.container.innerHTML = popupHTML;
  
  // Setup popup-specific events
  setupPopupContentEvents(actions);
  
  // Show popup
  openPopup();
  
  console.log(`📋 Popup shown: ${title}`);
}

/**
 * Create popup actions HTML
 * @param {Array} actions - Action buttons
 * @returns {string} Actions HTML
 */
function createPopupActions(actions) {
  const actionsHTML = actions.map((action, index) => `
    <button 
      class="popup__action popup__action--${action.type || 'default'}" 
      data-action-index="${index}"
    >
      ${action.label}
    </button>
  `).join('');
  
  return `<div class="popup__actions">${actionsHTML}</div>`;
}

/**
 * Setup popup content event listeners
 * @param {Array} actions - Action buttons
 */
function setupPopupContentEvents(actions) {
  // Close button
  const closeBtn = qs('.popup__close', popupState.container);
  if (closeBtn) {
    on(closeBtn, 'click', hidePopup);
  }
  
  // Action buttons
  const actionBtns = popupState.container.querySelectorAll('.popup__action');
  actionBtns.forEach((btn, index) => {
    on(btn, 'click', () => {
      const action = actions[index];
      if (action && action.handler) {
        const result = action.handler();
        
        // Close popup unless action returns false
        if (result !== false) {
          hidePopup();
        }
      }
    });
  });
}

/**
 * Show event details popup
 * @param {import('./js/types.js').EventRecord} event - Event data
 */
export function showEventDetails(event) {
  if (!event) return;
  
  const content = createEventDetailsContent(event);
  
  showPopup({
    title: event.title,
    content: content,
    size: 'large',
    actions: [
      {
        label: 'View on Map',
        type: 'primary',
        handler: () => {
          eventBus.emit('focusOnEvent', event);
          return false; // Don't close popup
        }
      },
      {
        label: 'View Timeline',
        type: 'secondary',
        handler: () => {
          eventBus.emit('seekToDate', new Date(event.date));
          return false; // Don't close popup
        }
      },
      {
        label: 'Close',
        type: 'default',
        handler: () => true // Close popup
      }
    ]
  });
}

/**
 * Create event details content
 * @param {import('./js/types.js').EventRecord} event - Event data
 * @returns {string} HTML content
 */
function createEventDetailsContent(event) {
  const {
    title,
    description,
    date,
    type,
    severity,
    coordinates,
    location,
    affectedArea,
    casualties,
    economicImpact,
    sources
  } = event;
  
  return `
    <div class="event-details">
      <div class="event-details__meta">
        <div class="event-meta">
          <div class="event-meta__item">
            <label>Date:</label>
            <span>${formatDate(new Date(date))}</span>
          </div>
          <div class="event-meta__item">
            <label>Type:</label>
            <span class="event-type event-type--${type}">${formatEventType(type)}</span>
          </div>
          ${severity ? `
            <div class="event-meta__item">
              <label>Severity:</label>
              <span class="event-severity event-severity--${severity}">${formatSeverity(severity)}</span>
            </div>
          ` : ''}
          ${location ? `
            <div class="event-meta__item">
              <label>Location:</label>
              <span>${location}</span>
            </div>
          ` : ''}
          ${coordinates ? `
            <div class="event-meta__item">
              <label>Coordinates:</label>
              <span>${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}</span>
            </div>
          ` : ''}
        </div>
      </div>
      
      ${description ? `
        <div class="event-details__description">
          <h3>Description</h3>
          <p>${description}</p>
        </div>
      ` : ''}
      
      ${createImpactSection(event)}
      ${createSourcesSection(sources)}
    </div>
  `;
}

/**
 * Create impact section
 * @param {import('./js/types.js').EventRecord} event - Event data
 * @returns {string} Impact section HTML
 */
function createImpactSection(event) {
  const { affectedArea, casualties, economicImpact } = event;
  
  if (!affectedArea && !casualties && !economicImpact) {
    return '';
  }
  
  return `
    <div class="event-details__impact">
      <h3>Impact</h3>
      <div class="impact-grid">
        ${affectedArea ? `
          <div class="impact-item">
            <label>Affected Area:</label>
            <span>${affectedArea}</span>
          </div>
        ` : ''}
        ${casualties ? `
          <div class="impact-item">
            <label>Casualties:</label>
            <span>${casualties}</span>
          </div>
        ` : ''}
        ${economicImpact ? `
          <div class="impact-item">
            <label>Economic Impact:</label>
            <span>${economicImpact}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Create sources section
 * @param {Array} sources - Source URLs
 * @returns {string} Sources section HTML
 */
function createSourcesSection(sources) {
  if (!sources || sources.length === 0) {
    return '';
  }
  
  const sourceLinks = sources.map((source, index) => `
    <li>
      <a href="${source}" target="_blank" rel="noopener noreferrer">
        Source ${index + 1}
      </a>
    </li>
  `).join('');
  
  return `
    <div class="event-details__sources">
      <h3>Sources</h3>
      <ul class="sources-list">
        ${sourceLinks}
      </ul>
    </div>
  `;
}

/**
 * Format event type for display
 * @param {string} type - Event type
 * @returns {string} Formatted type
 */
function formatEventType(type) {
  const typeLabels = {
    fire: 'Wildfire',
    flood: 'Flood',
    earthquake: 'Earthquake',
    hurricane: 'Hurricane',
    drought: 'Drought',
    tornado: 'Tornado',
    volcano: 'Volcanic Activity'
  };
  
  return typeLabels[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Format severity level for display
 * @param {number} severity - Severity level
 * @returns {string} Formatted severity
 */
function formatSeverity(severity) {
  const severityLabels = {
    1: 'Minor',
    2: 'Moderate',
    3: 'Major',
    4: 'Severe',
    5: 'Extreme'
  };
  
  return severityLabels[severity] || `Level ${severity}`;
}

/**
 * Show confirmation dialog
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {function} onConfirm - Confirm callback
 * @param {function} onCancel - Cancel callback
 */
export function showConfirmation(title, message, onConfirm, onCancel) {
  showPopup({
    title: title,
    content: `<p>${message}</p>`,
    size: 'small',
    actions: [
      {
        label: 'Confirm',
        type: 'primary',
        handler: () => {
          if (onConfirm) onConfirm();
          return true;
        }
      },
      {
        label: 'Cancel',
        type: 'secondary',
        handler: () => {
          if (onCancel) onCancel();
          return true;
        }
      }
    ]
  });
}

/**
 * Show info dialog
 * @param {string} title - Dialog title
 * @param {string} content - Dialog content
 */
export function showInfo(title, content) {
  showPopup({
    title: title,
    content: content,
    size: 'medium',
    actions: [
      {
        label: 'OK',
        type: 'primary',
        handler: () => true
      }
    ]
  });
}

/**
 * Open popup
 */
function openPopup() {
  popupState.isOpen = true;
  
  // Show overlay
  popupState.overlay.style.display = 'flex';
  popupState.overlay.setAttribute('aria-hidden', 'false');
  
  // Trigger fade-in animation
  setTimeout(() => {
    popupState.overlay.classList.add(POPUP_CONFIG.animation.fadeIn);
  }, 10);
  
  // Setup focus trap
  setupFocusTrap();
  
  // Prevent body scroll
  document.body.classList.add('popup-open');
  
  eventBus.emit('popupOpened');
}

/**
 * Hide popup
 */
export function hidePopup() {
  if (!popupState.isOpen) return;
  
  popupState.isOpen = false;
  
  // Trigger fade-out animation
  popupState.overlay.classList.remove(POPUP_CONFIG.animation.fadeIn);
  popupState.overlay.classList.add(POPUP_CONFIG.animation.fadeOut);
  
  // Hide overlay after animation
  setTimeout(() => {
    popupState.overlay.style.display = 'none';
    popupState.overlay.setAttribute('aria-hidden', 'true');
    popupState.overlay.classList.remove(POPUP_CONFIG.animation.fadeOut);
    
    // Clear content
    popupState.container.innerHTML = '';
  }, POPUP_CONFIG.animation.duration);
  
  // Release focus trap
  releaseFocusTrap();
  
  // Restore body scroll
  document.body.classList.remove('popup-open');
  
  eventBus.emit('popupClosed');
  
  console.log('📋 Popup hidden');
}

/**
 * Setup focus trap
 */
function setupFocusTrap() {
  const popup = qs('.popup', popupState.container);
  if (!popup) return;
  
  const focusableElements = popup.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  if (focusableElements.length === 0) return;
  
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];
  
  // Focus first element
  firstFocusable.focus();
  
  // Trap focus within popup
  const trapFocus = (event) => {
    if (event.key === 'Tab') {
      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable.focus();
        }
      }
    }
  };
  
  popup.addEventListener('keydown', trapFocus);
  popupState.focusTrap = { element: popup, handler: trapFocus };
}

/**
 * Release focus trap
 */
function releaseFocusTrap() {
  if (popupState.focusTrap) {
    const { element, handler } = popupState.focusTrap;
    element.removeEventListener('keydown', handler);
    popupState.focusTrap = null;
  }
}

/**
 * Check if popup is open
 * @returns {boolean} Popup open status
 */
export function isPopupOpen() {
  return popupState.isOpen;
}

/**
 * Cleanup popup module
 */
function cleanup() {
  hidePopup();
  
  if (popupState.overlay && popupState.overlay.parentNode) {
    popupState.overlay.parentNode.removeChild(popupState.overlay);
  }
  
  document.body.classList.remove('popup-open');
  
  console.log('🧹 Popup module cleaned up');
}

// Module event handling
eventBus.on('cleanup', cleanup);

// Export public interface
export {
  showEventDetails,
  showConfirmation,
  showInfo,
  isPopupOpen
};