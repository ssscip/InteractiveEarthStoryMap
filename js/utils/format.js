/**
 * @fileoverview Date formatting utilities
 */

/**
 * Format date to human readable string
 * @param {string|Date} date - Date to format
 * @param {Intl.DateTimeFormatOptions} [options] - Format options
 * @returns {string}
 */
export function formatDate(date, options = {}) {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(dateObj);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
}

/**
 * Format date to ISO string
 * @param {string|Date} date - Date to format
 * @returns {string}
 */
export function toISOString(date) {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString();
  } catch (error) {
    console.error('ISO date formatting error:', error);
    return '';
  }
}

/**
 * Get relative time string (e.g., "2 hours ago")
 * @param {string|Date} date - Date to compare
 * @param {string|Date} [relativeTo] - Reference date (default: now)
 * @returns {string}
 */
export function getRelativeTime(date, relativeTo = new Date()) {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const relativeObj = typeof relativeTo === 'string' ? new Date(relativeTo) : relativeTo;
    
    const diffMs = relativeObj.getTime() - dateObj.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (Math.abs(diffDays) >= 1) {
      return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ${diffDays > 0 ? 'ago' : 'from now'}`;
    } else if (Math.abs(diffHours) >= 1) {
      return `${Math.abs(diffHours)} hour${Math.abs(diffHours) === 1 ? '' : 's'} ${diffHours > 0 ? 'ago' : 'from now'}`;
    } else if (Math.abs(diffMinutes) >= 1) {
      return `${Math.abs(diffMinutes)} minute${Math.abs(diffMinutes) === 1 ? '' : 's'} ${diffMinutes > 0 ? 'ago' : 'from now'}`;
    } else {
      return 'Just now';
    }
  } catch (error) {
    console.error('Relative time formatting error:', error);
    return 'Unknown time';
  }
}

/**
 * Check if date is today
 * @param {string|Date} date - Date to check
 * @returns {boolean}
 */
export function isToday(date) {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    
    return dateObj.toDateString() === today.toDateString();
  } catch (error) {
    return false;
  }
}

/**
 * Get date range string
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {string}
 */
export function formatDateRange(startDate, endDate) {
  try {
    const start = formatDate(startDate, { month: 'short', day: 'numeric' });
    const end = formatDate(endDate, { month: 'short', day: 'numeric', year: 'numeric' });
    
    return `${start} - ${end}`;
  } catch (error) {
    console.error('Date range formatting error:', error);
    return 'Invalid Date Range';
  }
}

console.log('📅 Date utils loaded');