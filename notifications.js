// Notifications Module for Interactive Earth Story Map
const NOTIFICATION_CONFIG = {
  containerSelector: '#notifications',
  position: 'top-right',
  maxVisible: 5,
  defaultDuration: 5000,
  animationDuration: 300
};

const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  LOADING: 'loading'
};

let notificationState = {
  container: null,
  notifications: [],
  idCounter: 0,
  isInitialized: false
};

export function initNotifications(containerSelector = '#notifications', options = {}) {
  try {
    console.log('🔔 Initializing notifications...');
    
    const config = { ...NOTIFICATION_CONFIG, ...options };
    
    // Find or create container
    notificationState.container = document.querySelector(containerSelector);
    if (!notificationState.container) {
      notificationState.container = document.createElement('div');
      notificationState.container.id = 'notifications';
      notificationState.container.className = `notifications-container notifications-container--${config.position}`;
      notificationState.container.setAttribute('aria-live', 'polite');
      notificationState.container.setAttribute('aria-label', 'Notifications');
      document.body.appendChild(notificationState.container);
    }
    
    notificationState.isInitialized = true;
    console.log('✅ Notifications initialized successfully');
    
    return true;
    
  } catch (error) {
    console.error('❌ Notifications initialization failed:', error);
    return false;
  }
}

export function pushNotification(notification) {
  if (!notificationState.isInitialized) {
    console.warn('⚠️ Notifications not initialized');
    return null;
  }
  
  try {
    const id = ++notificationState.idCounter;
    
    const notificationData = {
      id,
      type: notification.type || NOTIFICATION_TYPES.INFO,
      title: notification.title || '',
      message: notification.message || '',
      duration: notification.duration || NOTIFICATION_CONFIG.defaultDuration,
      persistent: notification.persistent || false,
      actions: notification.actions || [],
      timestamp: Date.now()
    };
    
    const element = createNotificationElement(notificationData);
    
    // Add to container
    notificationState.container.appendChild(element);
    notificationState.notifications.push({ data: notificationData, element });
    
    // Trigger animation
    setTimeout(() => {
      element.classList.add('notification--visible');
    }, 10);
    
    // Auto-dismiss if not persistent
    if (!notificationData.persistent && notificationData.duration > 0) {
      autoDismiss(id, notificationData.duration);
    }
    
    // Remove old notifications if too many
    manageNotificationCount();
    
    console.log('🔔 Notification pushed:', notificationData.title);
    
    return id;
    
  } catch (error) {
    console.error('❌ Notification creation failed:', error);
    return null;
  }
}

function createNotificationElement(notification) {
  const element = document.createElement('div');
  element.className = `notification notification--${notification.type}`;
  element.dataset.notificationId = notification.id;
  element.setAttribute('role', 'alert');
  
  const iconMap = {
    [NOTIFICATION_TYPES.INFO]: 'ℹ️',
    [NOTIFICATION_TYPES.SUCCESS]: '✅',
    [NOTIFICATION_TYPES.WARNING]: '⚠️',
    [NOTIFICATION_TYPES.ERROR]: '❌',
    [NOTIFICATION_TYPES.LOADING]: '⏳'
  };
  
  const icon = iconMap[notification.type] || iconMap[NOTIFICATION_TYPES.INFO];
  
  element.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon">${icon}</div>
      <div class="notification-text">
        ${notification.title ? `<div class="notification-title">${notification.title}</div>` : ''}
        ${notification.message ? `<div class="notification-message">${notification.message}</div>` : ''}
      </div>
      <button class="notification-close" aria-label="Close notification">×</button>
    </div>
    ${notification.actions.length > 0 ? createActionsHTML(notification.actions) : ''}
  `;
  
  // Add event listeners
  setupNotificationListeners(element, notification);
  
  return element;
}

function createActionsHTML(actions) {
  const actionsHTML = actions.map(action => 
    `<button class="notification-action" data-action="${action.label}">${action.label}</button>`
  ).join('');
  
  return `<div class="notification-actions">${actionsHTML}</div>`;
}

function setupNotificationListeners(element, notification) {
  // Close button
  const closeBtn = element.querySelector('.notification-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      removeNotification(notification.id);
    });
  }
  
  // Action buttons
  const actionBtns = element.querySelectorAll('.notification-action');
  actionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const actionLabel = btn.dataset.action;
      const action = notification.actions.find(a => a.label === actionLabel);
      if (action && action.handler) {
        action.handler();
      }
      removeNotification(notification.id);
    });
  });
}

export function removeNotification(notificationId) {
  if (!notificationState.isInitialized) return;
  
  try {
    const index = notificationState.notifications.findIndex(n => n.data.id === notificationId);
    
    if (index !== -1) {
      const { element } = notificationState.notifications[index];
      
      // Animate out
      element.classList.add('notification--removing');
      
      setTimeout(() => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
        notificationState.notifications.splice(index, 1);
      }, NOTIFICATION_CONFIG.animationDuration);
      
      console.log('🗑️ Notification removed:', notificationId);
    }
    
  } catch (error) {
    console.error('❌ Notification removal failed:', error);
  }
}

export function autoDismiss(notificationId, duration) {
  setTimeout(() => {
    removeNotification(notificationId);
  }, duration);
}

function manageNotificationCount() {
  while (notificationState.notifications.length > NOTIFICATION_CONFIG.maxVisible) {
    const oldest = notificationState.notifications[0];
    if (!oldest.data.persistent) {
      removeNotification(oldest.data.id);
    } else {
      break;
    }
  }
}

// Convenience methods
export function showInfo(title, message, options = {}) {
  return pushNotification({
    type: NOTIFICATION_TYPES.INFO,
    title,
    message,
    ...options
  });
}

export function showSuccess(title, message, options = {}) {
  return pushNotification({
    type: NOTIFICATION_TYPES.SUCCESS,
    title,
    message,
    ...options
  });
}

export function showWarning(title, message, options = {}) {
  return pushNotification({
    type: NOTIFICATION_TYPES.WARNING,
    title,
    message,
    ...options
  });
}

export function showError(title, message, options = {}) {
  return pushNotification({
    type: NOTIFICATION_TYPES.ERROR,
    title,
    message,
    persistent: true,
    ...options
  });
}

export function showLoading(title, message, options = {}) {
  return pushNotification({
    type: NOTIFICATION_TYPES.LOADING,
    title,
    message,
    persistent: true,
    duration: 0,
    ...options
  });
}

export function clearAllNotifications(includePersistent = false) {
  const toRemove = includePersistent ? 
    [...notificationState.notifications] :
    notificationState.notifications.filter(n => !n.data.persistent);
  
  toRemove.forEach(notification => {
    removeNotification(notification.data.id);
  });
}

export function setNotificationPosition(position) {
  if (notificationState.container) {
    notificationState.container.className = `notifications-container notifications-container--${position}`;
  }
}

export const notificationUtils = {
  showInfo,
  showSuccess,
  showWarning,
  showError,
  showLoading,
  clearAllNotifications
};

export { notificationState, NOTIFICATION_CONFIG, NOTIFICATION_TYPES };