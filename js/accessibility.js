/**
 * @fileoverview Accessibility utilities and focus management
 */

import { qs, qsa, on } from './utils/dom.js';

/**
 * Focus trap state
 * @type {Object|null}
 */
let activeFocusTrap = null;

/**
 * Focusable element selectors
 */
const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]'
].join(', ');

/**
 * Get all focusable elements within a container
 * @param {Element} container - Container element
 * @returns {Element[]}
 */
function getFocusableElements(container) {
  if (!container) return [];
  
  const elements = Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS));
  return elements.filter(el => {
    // Check if element is visible and not hidden
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           el.offsetParent !== null;
  });
}

/**
 * Focus management utilities
 */
export const focusManager = {
  /**
   * Set focus to element safely
   * @param {Element} element - Element to focus
   * @param {boolean} [preventScroll] - Prevent scrolling to element
   */
  focus(element, preventScroll = false) {
    if (!element || typeof element.focus !== 'function') {
      console.warn('Cannot focus invalid element:', element);
      return;
    }
    
    try {
      element.focus({ preventScroll });
    } catch (error) {
      console.warn('Focus failed:', error);
    }
  },

  /**
   * Get currently focused element
   * @returns {Element|null}
   */
  getActiveElement() {
    return document.activeElement;
  },

  /**
   * Check if element has focus
   * @param {Element} element - Element to check
   * @returns {boolean}
   */
  hasFocus(element) {
    return document.activeElement === element;
  },

  /**
   * Focus first focusable element in container
   * @param {Element} container - Container element
   * @returns {boolean} Success
   */
  focusFirst(container) {
    const focusable = getFocusableElements(container);
    if (focusable.length > 0) {
      this.focus(focusable[0]);
      return true;
    }
    return false;
  },

  /**
   * Focus last focusable element in container
   * @param {Element} container - Container element
   * @returns {boolean} Success
   */
  focusLast(container) {
    const focusable = getFocusableElements(container);
    if (focusable.length > 0) {
      this.focus(focusable[focusable.length - 1]);
      return true;
    }
    return false;
  }
};

/**
 * Focus trap implementation
 */
export const focusTrap = {
  /**
   * Activate focus trap within container
   * @param {Element} container - Container to trap focus within
   * @param {Object} [options] - Trap options
   * @returns {Function} Deactivate function
   */
  activate(container, options = {}) {
    if (!container) {
      console.warn('Cannot activate focus trap: invalid container');
      return () => {};
    }

    const {
      initialFocus = null,
      returnFocus = true,
      escapeKey = true
    } = options;

    // Store previous active element for return focus
    const previousActiveElement = document.activeElement;

    // Get focusable elements
    const focusableElements = getFocusableElements(container);
    
    if (focusableElements.length === 0) {
      console.warn('No focusable elements found in focus trap container');
      return () => {};
    }

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    /**
     * Handle tab key navigation
     * @param {KeyboardEvent} event - Keyboard event
     */
    function handleTabKey(event) {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift + Tab - go to previous element
        if (document.activeElement === firstFocusable) {
          event.preventDefault();
          focusManager.focus(lastFocusable);
        }
      } else {
        // Tab - go to next element
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          focusManager.focus(firstFocusable);
        }
      }
    }

    /**
     * Handle escape key
     * @param {KeyboardEvent} event - Keyboard event
     */
    function handleEscapeKey(event) {
      if (escapeKey && event.key === 'Escape') {
        deactivate();
      }
    }

    /**
     * Deactivate focus trap
     */
    function deactivate() {
      if (activeFocusTrap === trapState) {
        document.removeEventListener('keydown', handleTabKey);
        document.removeEventListener('keydown', handleEscapeKey);
        
        if (returnFocus && previousActiveElement) {
          focusManager.focus(previousActiveElement);
        }
        
        activeFocusTrap = null;
      }
    }

    // Deactivate any existing trap
    if (activeFocusTrap) {
      activeFocusTrap.deactivate();
    }

    // Create trap state
    const trapState = { deactivate, container };
    activeFocusTrap = trapState;

    // Add event listeners
    document.addEventListener('keydown', handleTabKey);
    document.addEventListener('keydown', handleEscapeKey);

    // Set initial focus
    if (initialFocus) {
      focusManager.focus(initialFocus);
    } else {
      focusManager.focus(firstFocusable);
    }

    return deactivate;
  },

  /**
   * Deactivate current focus trap
   */
  deactivate() {
    if (activeFocusTrap) {
      activeFocusTrap.deactivate();
    }
  },

  /**
   * Check if focus trap is active
   * @returns {boolean}
   */
  isActive() {
    return activeFocusTrap !== null;
  }
};

/**
 * Skip links functionality
 */
export const skipLinks = {
  /**
   * Create skip link element
   * @param {string} targetId - Target element ID
   * @param {string} text - Link text
   * @returns {HTMLElement}
   */
  create(targetId, text = `Skip to ${targetId}`) {
    const link = document.createElement('a');
    link.href = `#${targetId}`;
    link.className = 'skip-link';
    link.textContent = text;
    link.setAttribute('data-skip-link', '');

    // Handle click
    on(link, 'click', (event) => {
      event.preventDefault();
      const target = qs(`#${targetId}`);
      if (target) {
        target.setAttribute('tabindex', '-1');
        focusManager.focus(target);
        // Remove tabindex after blur to restore normal tab order
        on(target, 'blur', () => {
          target.removeAttribute('tabindex');
        }, { once: true });
      }
    });

    return link;
  },

  /**
   * Add skip links to page
   * @param {Array} links - Array of {targetId, text} objects
   */
  addToPage(links = []) {
    const skipContainer = document.createElement('div');
    skipContainer.className = 'skip-links';
    skipContainer.setAttribute('aria-label', 'Skip navigation links');

    links.forEach(({ targetId, text }) => {
      const link = this.create(targetId, text);
      skipContainer.appendChild(link);
    });

    // Insert at beginning of body
    if (document.body.firstChild) {
      document.body.insertBefore(skipContainer, document.body.firstChild);
    } else {
      document.body.appendChild(skipContainer);
    }
  }
};

/**
 * ARIA live region utilities
 */
export const liveRegion = {
  /**
   * Create live region element
   * @param {'polite'|'assertive'} [politeness] - Live region politeness
   * @returns {HTMLElement}
   */
  create(politeness = 'polite') {
    const region = document.createElement('div');
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.className = 'visually-hidden';
    region.id = `live-region-${Date.now()}`;
    
    document.body.appendChild(region);
    return region;
  },

  /**
   * Announce message to screen readers
   * @param {string} message - Message to announce
   * @param {'polite'|'assertive'} [politeness] - Announcement politeness
   */
  announce(message, politeness = 'polite') {
    const region = this.create(politeness);
    region.textContent = message;
    
    // Clean up after announcement
    setTimeout(() => {
      if (region.parentNode) {
        region.parentNode.removeChild(region);
      }
    }, 1000);
  }
};

/**
 * Initialize accessibility features
 */
export function initAccessibility() {
  // Add default skip links
  skipLinks.addToPage([
    { targetId: 'main', text: 'Skip to main content' },
    { targetId: 'filters', text: 'Skip to filters' },
    { targetId: 'storyControls', text: 'Skip to story controls' }
  ]);

  // Ensure main content has proper role
  const main = qs('main, #main');
  if (main && !main.getAttribute('role')) {
    main.setAttribute('role', 'main');
  }

  // Handle reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('reduce-motion');
  }

  console.log('♿ Accessibility features initialized');
}

export default {
  focusManager,
  focusTrap,
  skipLinks,
  liveRegion,
  initAccessibility
};