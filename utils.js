// DOM Utilities for Interactive Earth Story Map
// Provides safe DOM manipulation and accessibility helpers

/**
 * Create element with attributes and content
 * @param {string} tagName - HTML tag name
 * @param {object} attributes - Element attributes
 * @param {string|Node} content - Element content
 * @returns {HTMLElement} Created element
 */
export function el(tagName, attributes = {}, content = null) {
  try {
    const element = document.createElement(tagName);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else if (key === 'className' || key === 'class') {
        element.className = value;
      } else if (key === 'dataset') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue;
        });
      } else if (key.startsWith('aria-') || key.startsWith('data-') || 
                 ['id', 'role', 'tabindex', 'title'].includes(key)) {
        element.setAttribute(key, value);
      } else {
        element[key] = value;
      }
    });
    
    // Set content
    if (content !== null) {
      if (typeof content === 'string') {
        element.innerHTML = content;
      } else if (content instanceof Node) {
        element.appendChild(content);
      }
    }
    
    return element;
    
  } catch (error) {
    console.error('❌ Element creation failed:', error);
    return document.createElement('div'); // Fallback
  }
}

/**
 * Query selector with error handling
 * @param {string} selector - CSS selector
 * @param {Element} context - Search context (default: document)
 * @returns {Element|null} Found element or null
 */
export function qs(selector, context = document) {
  try {
    if (!selector || typeof selector !== 'string') {
      console.warn('⚠️ Invalid selector provided to qs()');
      return null;
    }
    
    return context.querySelector(selector);
    
  } catch (error) {
    console.error('❌ Query selector failed:', selector, error);
    return null;
  }
}

/**
 * Query selector all with error handling
 * @param {string} selector - CSS selector
 * @param {Element} context - Search context (default: document)
 * @returns {NodeList} Found elements
 */
export function qsa(selector, context = document) {
  try {
    if (!selector || typeof selector !== 'string') {
      console.warn('⚠️ Invalid selector provided to qsa()');
      return [];
    }
    
    return context.querySelectorAll(selector);
    
  } catch (error) {
    console.error('❌ Query selector all failed:', selector, error);
    return [];
  }
}

/**
 * Add event listener with delegation and cleanup
 * @param {Element|string} target - Target element or selector
 * @param {string} eventType - Event type
 * @param {Function|string} handler - Event handler or selector for delegation
 * @param {object} options - Event options
 * @returns {Function} Cleanup function
 */
export function on(target, eventType, handler, options = {}) {
  try {
    let element = target;
    
    // Handle string selector
    if (typeof target === 'string') {
      element = qs(target);
      if (!element) {
        console.warn('⚠️ Element not found for event listener:', target);
        return () => {}; // Return no-op cleanup
      }
    }
    
    let actualHandler = handler;
    
    // Handle delegation
    if (typeof handler === 'string') {
      const delegateSelector = handler;
      actualHandler = (event) => {
        const delegateTarget = event.target.closest(delegateSelector);
        if (delegateTarget) {
          options.originalHandler?.(event, delegateTarget);
        }
      };
    }
    
    // Add listener
    element.addEventListener(eventType, actualHandler, options);
    
    // Return cleanup function
    return () => {
      element.removeEventListener(eventType, actualHandler, options);
    };
    
  } catch (error) {
    console.error('❌ Event listener setup failed:', error);
    return () => {}; // Return no-op cleanup
  }
}

// Focus management state
let focusState = {
  traps: new Map(),
  trapCounter: 0,
  previousFocus: null
};

/**
 * Trap focus within a container
 * @param {Element|string} container - Container element or selector
 * @param {object} options - Trap options
 * @returns {string} Trap ID for cleanup
 */
export function trapFocus(container, options = {}) {
  try {
    const element = typeof container === 'string' ? qs(container) : container;
    
    if (!element) {
      console.warn('⚠️ Focus trap container not found');
      return null;
    }
    
    const trapId = `trap-${++focusState.trapCounter}`;
    
    // Store current focus
    focusState.previousFocus = document.activeElement;
    
    // Get focusable elements
    const focusableElements = getFocusableElements(element);
    
    if (focusableElements.length === 0) {
      console.warn('⚠️ No focusable elements found in trap container');
      return null;
    }
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    // Trap handler
    const trapHandler = (event) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
      
      if (event.key === 'Escape' && options.escapeToClose) {
        releaseFocus(trapId);
        options.onEscape?.();
      }
    };
    
    // Add listener
    document.addEventListener('keydown', trapHandler);
    
    // Focus first element
    if (options.initialFocus !== false) {
      firstElement.focus();
    }
    
    // Store trap info
    focusState.traps.set(trapId, {
      element,
      handler: trapHandler,
      focusableElements,
      options
    });
    
    console.log('🎯 Focus trapped:', trapId);
    
    return trapId;
    
  } catch (error) {
    console.error('❌ Focus trap failed:', error);
    return null;
  }
}

/**
 * Release focus trap
 * @param {string} trapId - Trap ID to release (optional, releases all if not provided)
 */
export function releaseFocus(trapId = null) {
  try {
    if (trapId) {
      const trap = focusState.traps.get(trapId);
      if (trap) {
        document.removeEventListener('keydown', trap.handler);
        focusState.traps.delete(trapId);
        
        console.log('🎯 Focus trap released:', trapId);
      }
    } else {
      // Release all traps
      focusState.traps.forEach((trap, id) => {
        document.removeEventListener('keydown', trap.handler);
      });
      focusState.traps.clear();
      
      console.log('🎯 All focus traps released');
    }
    
    // Restore previous focus
    if (focusState.previousFocus && focusState.traps.size === 0) {
      focusState.previousFocus.focus();
      focusState.previousFocus = null;
    }
    
  } catch (error) {
    console.error('❌ Focus release failed:', error);
  }
}

/**
 * Get focusable elements within a container
 * @param {Element} container - Container element
 * @returns {Array} Array of focusable elements
 */
function getFocusableElements(container) {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'textarea:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ];
  
  const elements = qsa(focusableSelectors.join(','), container);
  
  return Array.from(elements).filter(element => {
    return element.offsetWidth > 0 && element.offsetHeight > 0;
  });
}

/**
 * Safely focus an element
 * @param {Element|string} target - Element or selector to focus
 * @param {object} options - Focus options
 */
export function safeFocus(target, options = {}) {
  try {
    const element = typeof target === 'string' ? qs(target) : target;
    
    if (!element) {
      console.warn('⚠️ Focus target not found');
      return;
    }
    
    // Check if element is focusable
    if (element.tabIndex < 0 && !element.hasAttribute('tabindex')) {
      element.tabIndex = -1;
    }
    
    // Focus with optional scroll prevention
    element.focus({
      preventScroll: options.preventScroll || false
    });
    
    // Optional callback
    if (options.onFocus) {
      options.onFocus(element);
    }
    
  } catch (error) {
    console.error('❌ Safe focus failed:', error);
  }
}

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, delay) {
  let timeoutId;
  
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, delay) {
  let isThrottled = false;
  
  return function (...args) {
    if (!isThrottled) {
      func.apply(this, args);
      isThrottled = true;
      setTimeout(() => {
        isThrottled = false;
      }, delay);
    }
  };
}

/**
 * Check if element is visible
 * @param {Element} element - Element to check
 * @returns {boolean} Visibility status
 */
export function isVisible(element) {
  if (!element) return false;
  
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && 
         rect.top >= 0 && rect.left >= 0 &&
         rect.bottom <= window.innerHeight && 
         rect.right <= window.innerWidth;
}

/**
 * Smooth scroll to element
 * @param {Element|string} target - Target element or selector
 * @param {object} options - Scroll options
 */
export function scrollToElement(target, options = {}) {
  try {
    const element = typeof target === 'string' ? qs(target) : target;
    
    if (!element) {
      console.warn('⚠️ Scroll target not found');
      return;
    }
    
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
      ...options
    });
    
  } catch (error) {
    console.error('❌ Scroll to element failed:', error);
  }
}

// Utility object with commonly used functions
export const domUtils = {
  el,
  qs,
  qsa,
  on,
  trapFocus,
  releaseFocus,
  safeFocus,
  debounce,
  throttle,
  isVisible,
  scrollToElement,
  
  // Convenience methods
  addClass: (element, className) => element?.classList.add(className),
  removeClass: (element, className) => element?.classList.remove(className),
  toggleClass: (element, className) => element?.classList.toggle(className),
  hasClass: (element, className) => element?.classList.contains(className),
  
  // Attribute helpers
  setAttr: (element, name, value) => element?.setAttribute(name, value),
  getAttr: (element, name) => element?.getAttribute(name),
  removeAttr: (element, name) => element?.removeAttribute(name),
  
  // Style helpers
  setStyle: (element, property, value) => {
    if (element?.style) element.style[property] = value;
  },
  getStyle: (element, property) => {
    return element ? getComputedStyle(element)[property] : null;
  },
  
  // Content helpers
  setText: (element, text) => {
    if (element) element.textContent = text;
  },
  setHTML: (element, html) => {
    if (element) element.innerHTML = html;
  },
  
  // Visibility helpers
  show: (element) => {
    if (element) element.style.display = '';
  },
  hide: (element) => {
    if (element) element.style.display = 'none';
  }
};

// Export focus state for debugging
export { focusState };