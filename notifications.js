/**
 * @fileoverview Notifications module for user feedback
 * Provides toast notifications and status messages
 */

import { eventBus } from './js/store.js';
import { el, on } from './js/utils/dom.js';

/**
 * Notification state
 */
let notificationState = {
  container: null,
  notifications: new Map(),
  nextId: 1,
  maxNotifications: 5
};

/**
 * Notification configuration
 */
const NOTIFICATION_CONFIG = {
  types: {
    success: {
      icon: '✅',
      className: 'notification--success',
      defaultDuration: 4000
    },
    error: {
      icon: '❌',
      className: 'notification--error',
      defaultDuration: 6000
    },
    warning: {
      icon: '⚠️',
      className: 'notification--warning',
      defaultDuration: 5000
    },
    info: {
      icon: 'ℹ️',
      className: 'notification--info',
      defaultDuration: 4000
    },
    loading: {
      icon: '⏳',
      className: 'notification--loading',
      defaultDuration: 0 // Persistent until manually dismissed
    }
  },
  animations: {
    slideIn: 'notification--slide-in',
    slideOut: 'notification--slide-out',
    duration: 300
  }
};

/**
 * Initialize notifications module
 * @returns {boolean} Success status
 */
export function initNotifications() {
  try {
    console.log('🔔 Initializing notifications module...');
    
    // Create notification container
    createNotificationContainer();
    
    // Setup event listeners
    setupNotificationEvents();
    
    console.log('✅ Notifications module initialized');
    return true;
    
  } catch (error) {
    console.error('❌ Notifications initialization failed:', error);
    return false;
  }
}

/**
 * Create notification container
 */
function createNotificationContainer() {
  // Check if container already exists
  let container = document.querySelector('.notifications-container');
  
  if (!container) {
    container = el('div', {
      className: 'notifications-container',
      'aria-live': 'polite',
      'aria-label': 'Notifications'
    });
    
    document.body.appendChild(container);
  }
  
  notificationState.container = container;
}

/**
 * Setup notification event listeners
 */
function setupNotificationEvents() {
  // Listen for notification events
  eventBus.on('showNotification', (options) => {
    showNotification(options);
  });
  
  eventBus.on('hideNotification', (id) => {
    hideNotification(id);
  });
  
  eventBus.on('clearAllNotifications', () => {
    clearAllNotifications();
  });
  
  // Application events that trigger notifications
  eventBus.on('eventsLoaded', (events) => {
    showNotification({
      type: 'success',
      title: 'Events Loaded',
      message: `Successfully loaded ${events.length} climate events`,
      duration: 3000
    });
  });
  
  eventBus.on('eventSelected', (event) => {
    showNotification({
      type: 'info',
      title: 'Event Selected',
      message: `Selected: ${event.title}`,
      duration: 2000
    });
  });
  
  eventBus.on('storyStarted', () => {
    showNotification({
      type: 'info',
      title: 'Story Mode',
      message: 'Story mode started. Use space to pause/play.',
      duration: 4000
    });
  });
  
  eventBus.on('moduleError', (moduleName, error) => {
    showNotification({
      type: 'error',
      title: 'Module Error',
      message: `${moduleName} module failed to load: ${error.message}`,
      duration: 8000
    });
  });
  
  eventBus.on('appError', (error) => {
    showNotification({
      type: 'error',
      title: 'Application Error',
      message: error.message || 'An unexpected error occurred',
      duration: 0 // Persistent
    });
  });
}

/**
 * Show notification
 * @param {import('./js/types.js').NotificationOptions} options - Notification options
 * @returns {string} Notification ID
 */
export function showNotification(options) {
  const {
    type = 'info',
    title = '',
    message = '',
    duration = null,
    actions = [],
    persistent = false
  } = options;
  
  // Validate type
  if (!NOTIFICATION_CONFIG.types[type]) {
    console.warn(`Unknown notification type: ${type}`);
    return null;
  }
  
  const config = NOTIFICATION_CONFIG.types[type];
  const id = `notification-${notificationState.nextId++}`;
  
  // Determine duration
  const notificationDuration = persistent ? 0 : 
    (duration !== null ? duration : config.defaultDuration);
  
  // Create notification element
  const notification = createNotificationElement({
    id,
    type,
    title,
    message,
    actions,
    config
  });
  
  // Add to container
  notificationState.container.appendChild(notification);
  
  // Store notification data
  notificationState.notifications.set(id, {
    element: notification,
    type,
    title,
    message,
    duration: notificationDuration,
    timestamp: Date.now()
  });
  
  // Trigger slide-in animation
  setTimeout(() => {
    notification.classList.add(NOTIFICATION_CONFIG.animations.slideIn);
  }, 10);
  
  // Auto-dismiss if not persistent
  if (notificationDuration > 0) {
    setTimeout(() => {
      hideNotification(id);
    }, notificationDuration);
  }
  
  // Manage notification limit
  manageNotificationLimit();
  
  console.log(`🔔 Notification shown: ${type} - ${title}`);
  return id;
}

/**
 * Create notification element
 * @param {Object} options - Element options
 * @returns {HTMLElement} Notification element
 */
function createNotificationElement(options) {
  const { id, type, title, message, actions, config } = options;
  
  const notification = el('div', {
    className: `notification ${config.className}`,
    id: id,
    role: 'alert',
    'aria-live': 'assertive'
  });
  
  notification.innerHTML = `
    <div class="notification__icon">${config.icon}</div>
    <div class="notification__content">
      ${title ? `<div class="notification__title">${title}</div>` : ''}
      ${message ? `<div class="notification__message">${message}</div>` : ''}
      ${actions.length > 0 ? createActionsHTML(actions) : ''}
    </div>
    <button class="notification__close" aria-label="Close notification">×</button>
  `;
  
  // Setup event listeners
  setupNotificationElementEvents(notification, id, actions);
  
  return notification;
}

/**
 * Create actions HTML
 * @param {Array} actions - Action buttons
 * @returns {string} Actions HTML
 */
function createActionsHTML(actions) {
  const actionsHTML = actions.map((action, index) => `
    <button class="notification__action" data-action-index="${index}">
      ${action.label}
    </button>
  `).join('');
  
  return `<div class="notification__actions">${actionsHTML}</div>`;
}

/**
 * Setup notification element event listeners
 * @param {HTMLElement} element - Notification element
 * @param {string} id - Notification ID
 * @param {Array} actions - Action buttons
 */
function setupNotificationElementEvents(element, id, actions) {
  // Close button
  const closeBtn = element.querySelector('.notification__close');
  on(closeBtn, 'click', () => {
    hideNotification(id);
  });
  
  // Action buttons
  const actionBtns = element.querySelectorAll('.notification__action');
  actionBtns.forEach((btn, index) => {
    on(btn, 'click', () => {
      const action = actions[index];
      if (action && action.handler) {
        action.handler();
      }
      
      // Auto-dismiss after action unless specified otherwise
      if (!action.keepOpen) {
        hideNotification(id);
      }
    });
  });
  
  // Auto-dismiss on click (except for actions and close button)
  on(element, 'click', (event) => {
    if (!event.target.closest('.notification__action, .notification__close')) {
      hideNotification(id);
    }
  });
  
  // Pause auto-dismiss on hover
  let originalTimeout = null;
  on(element, 'mouseenter', () => {
    // Implementation for pausing auto-dismiss would go here
  });
  
  on(element, 'mouseleave', () => {
    // Implementation for resuming auto-dismiss would go here
  });
}

/**
 * Hide notification
 * @param {string} id - Notification ID
 */
export function hideNotification(id) {
  const notificationData = notificationState.notifications.get(id);
  
  if (!notificationData) {
    console.warn(`Notification not found: ${id}`);
    return;
  }
  
  const { element } = notificationData;
  
  // Trigger slide-out animation
  element.classList.remove(NOTIFICATION_CONFIG.animations.slideIn);
  element.classList.add(NOTIFICATION_CONFIG.animations.slideOut);
  
  // Remove from DOM after animation
  setTimeout(() => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
    notificationState.notifications.delete(id);
  }, NOTIFICATION_CONFIG.animations.duration);
  
  console.log(`🔔 Notification hidden: ${id}`);
}

/**
 * Clear all notifications
 */
export function clearAllNotifications() {
  const notifications = Array.from(notificationState.notifications.keys());
  
  notifications.forEach(id => {
    hideNotification(id);
  });
  
  console.log('🔔 All notifications cleared');
}

/**
 * Manage notification limit
 */
function manageNotificationLimit() {
  const notifications = Array.from(notificationState.notifications.values());
  
  if (notifications.length > notificationState.maxNotifications) {
    // Remove oldest notifications
    const sortedNotifications = notifications.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = sortedNotifications.slice(0, notifications.length - notificationState.maxNotifications);
    
    toRemove.forEach(notification => {
      const id = notification.element.id;
      hideNotification(id);
    });
  }
}

/**
 * Show loading notification
 * @param {string} message - Loading message
 * @returns {string} Notification ID
 */
export function showLoading(message = 'Loading...') {
  return showNotification({
    type: 'loading',
    title: 'Loading',
    message: message,
    persistent: true
  });
}

/**
 * Hide loading notification
 * @param {string} id - Loading notification ID
 */
export function hideLoading(id) {
  hideNotification(id);
}

/**
 * Show success notification
 * @param {string} title - Success title
 * @param {string} message - Success message
 * @returns {string} Notification ID
 */
export function showSuccess(title, message) {
  return showNotification({
    type: 'success',
    title: title,
    message: message
  });
}

/**
 * Show error notification
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @returns {string} Notification ID
 */
export function showError(title, message) {
  return showNotification({
    type: 'error',
    title: title,
    message: message,
    duration: 8000
  });
}

/**
 * Show warning notification
 * @param {string} title - Warning title
 * @param {string} message - Warning message
 * @returns {string} Notification ID
 */
export function showWarning(title, message) {
  return showNotification({
    type: 'warning',
    title: title,
    message: message
  });
}

/**
 * Show info notification
 * @param {string} title - Info title
 * @param {string} message - Info message
 * @returns {string} Notification ID
 */
export function showInfo(title, message) {
  return showNotification({
    type: 'info',
    title: title,
    message: message
  });
}

/**
 * Show confirmation notification with actions
 * @param {string} title - Confirmation title
 * @param {string} message - Confirmation message
 * @param {function} onConfirm - Confirm callback
 * @param {function} onCancel - Cancel callback
 * @returns {string} Notification ID
 */
export function showConfirmation(title, message, onConfirm, onCancel) {
  return showNotification({
    type: 'warning',
    title: title,
    message: message,
    persistent: true,
    actions: [
      {
        label: 'Confirm',
        handler: onConfirm,
        keepOpen: false
      },
      {
        label: 'Cancel',
        handler: onCancel || (() => {}),
        keepOpen: false
      }
    ]
  });
}

/**
 * Get notification count
 * @returns {number} Number of active notifications
 */
export function getNotificationCount() {
  return notificationState.notifications.size;
}

/**
 * Get notification by ID
 * @param {string} id - Notification ID
 * @returns {Object|null} Notification data
 */
export function getNotification(id) {
  return notificationState.notifications.get(id) || null;
}

/**
 * Update notification message
 * @param {string} id - Notification ID
 * @param {string} message - New message
 */
export function updateNotification(id, message) {
  const notification = notificationState.notifications.get(id);
  
  if (notification) {
    const messageEl = notification.element.querySelector('.notification__message');
    if (messageEl) {
      messageEl.textContent = message;
      notification.message = message;
    }
  }
}

/**
 * Cleanup notifications module
 */
function cleanup() {
  clearAllNotifications();
  
  if (notificationState.container && notificationState.container.parentNode) {
    notificationState.container.parentNode.removeChild(notificationState.container);
  }
  
  console.log('🧹 Notifications module cleaned up');
}

// Module event handling
eventBus.on('cleanup', cleanup);

// Export public interface
export {
  notificationState,
  showLoading,
  hideLoading,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showConfirmation,
  getNotificationCount,
  updateNotification
};