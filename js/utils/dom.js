/**
 * @fileoverview DOM utility functions
 */

/**
 * Query selector with error handling
 * @param {string} selector - CSS selector
 * @param {Document|Element} [context] - Search context
 * @returns {Element|null}
 */
export function qs(selector, context = document) {
  try {
    return context.querySelector(selector);
  } catch (error) {
    console.error(`Invalid selector: ${selector}`, error);
    return null;
  }
}

/**
 * Query selector all with error handling
 * @param {string} selector - CSS selector
 * @param {Document|Element} [context] - Search context
 * @returns {NodeList}
 */
export function qsa(selector, context = document) {
  try {
    return context.querySelectorAll(selector);
  } catch (error) {
    console.error(`Invalid selector: ${selector}`, error);
    return [];
  }
}

/**
 * Create element with attributes and content
 * @param {string} tag - HTML tag name
 * @param {Object} [attrs] - Element attributes
 * @param {string|Node|Node[]} [content] - Element content
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, content = null) {
  const element = document.createElement(tag);
  
  // Set attributes
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'innerHTML') {
      element.innerHTML = value;
    } else if (key === 'textContent') {
      element.textContent = value;
    } else if (key.startsWith('data-')) {
      element.setAttribute(key, value);
    } else if (key in element) {
      element[key] = value;
    } else {
      element.setAttribute(key, value);
    }
  });
  
  // Set content
  if (content !== null) {
    if (typeof content === 'string') {
      element.textContent = content;
    } else if (content instanceof Node) {
      element.appendChild(content);
    } else if (Array.isArray(content)) {
      content.forEach(child => {
        if (child instanceof Node) {
          element.appendChild(child);
        }
      });
    }
  }
  
  return element;
}

/**
 * Add event listener with cleanup tracking
 * @param {Element} element - Target element
 * @param {string} event - Event type
 * @param {Function} handler - Event handler
 * @param {boolean|AddEventListenerOptions} [options] - Event options
 * @returns {Function} Cleanup function
 */
export function on(element, event, handler, options = false) {
  if (!element || typeof handler !== 'function') {
    console.warn('Invalid element or handler for event listener');
    return () => {};
  }
  
  element.addEventListener(event, handler, options);
  
  // Return cleanup function
  return () => {
    element.removeEventListener(event, handler, options);
  };
}

/**
 * Remove element from DOM safely
 * @param {Element} element - Element to remove
 */
export function removeElement(element) {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

/**
 * Toggle class on element
 * @param {Element} element - Target element
 * @param {string} className - Class name to toggle
 * @param {boolean} [force] - Force add/remove
 * @returns {boolean} Whether class is present after toggle
 */
export function toggleClass(element, className, force) {
  if (!element || !className) return false;
  
  if (typeof force === 'boolean') {
    if (force) {
      element.classList.add(className);
    } else {
      element.classList.remove(className);
    }
    return force;
  }
  
  return element.classList.toggle(className);
}

/**
 * Get element's position relative to viewport
 * @param {Element} element - Target element
 * @returns {DOMRect}
 */
export function getElementPosition(element) {
  if (!element) {
    return { top: 0, left: 0, width: 0, height: 0, right: 0, bottom: 0 };
  }
  
  return element.getBoundingClientRect();
}

/**
 * Check if element is visible in viewport
 * @param {Element} element - Target element
 * @param {number} [threshold] - Visibility threshold (0-1)
 * @returns {boolean}
 */
export function isElementVisible(element, threshold = 0) {
  if (!element) return false;
  
  const rect = getElementPosition(element);
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  const windowWidth = window.innerWidth || document.documentElement.clientWidth;
  
  const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
  const visibleWidth = Math.min(rect.right, windowWidth) - Math.max(rect.left, 0);
  
  const visibleArea = visibleHeight * visibleWidth;
  const totalArea = rect.height * rect.width;
  
  return totalArea > 0 && (visibleArea / totalArea) >= threshold;
}

/**
 * Smooth scroll to element
 * @param {Element} element - Target element
 * @param {ScrollIntoViewOptions} [options] - Scroll options
 */
export function scrollToElement(element, options = { behavior: 'smooth', block: 'center' }) {
  if (element && element.scrollIntoView) {
    element.scrollIntoView(options);
  }
}

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} [immediate] - Execute immediately on first call
 * @returns {Function} Debounced function
 */
export function debounce(func, wait, immediate = false) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(this, args);
  };
}

/**
 * Throttle function execution
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Wait for DOM content loaded
 * @returns {Promise<void>}
 */
export function domReady() {
  return new Promise(resolve => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', resolve, { once: true });
    } else {
      resolve();
    }
  });
}

console.log('🔧 DOM utils loaded');