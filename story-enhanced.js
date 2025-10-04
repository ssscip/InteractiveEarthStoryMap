/**
 * @fileoverview Enhanced Story Mode with State Machine Integration
 * Provides guided storytelling through climate events with formal state management
 */

import { store, actions, eventBus } from './js/store.js';
import { StoryStateMachine } from './js/storyStateMachine.js';
import { formatDate } from './js/utils/format.js';
import { qs, el, on, debounce } from './js/utils/dom.js';
import { clamp } from './js/utils/math.js';

/**
 * Enhanced Story Controller
 */
class EnhancedStoryController {
  constructor() {
    this.stateMachine = new StoryStateMachine();
    this.stories = [];
    this.currentStoryIndex = 0;
    this.autoplay = false;
    this.elements = {};
    this.config = {
      speeds: {
        slow: 8000,
        normal: 5000,
        fast: 3000
      },
      defaultDuration: 5000,
      transitionDuration: 800
    };
    
    this.bindStateMachineEvents();
  }

  /**
   * Bind state machine events
   */
  bindStateMachineEvents() {
    this.stateMachine.on('stateChanged', (data) => {
      this.handleStateChange(data);
    });

    this.stateMachine.on('stepChanged', (data) => {
      this.handleStepChange(data);
    });

    this.stateMachine.on('error', (error) => {
      console.error('Story State Machine Error:', error);
      this.showError('Story playback error: ' + error.message);
    });

    this.stateMachine.on('analytics', (event) => {
      this.trackAnalytics(event);
    });
  }

  /**
   * Initialize story mode
   */
  async init() {
    try {
      await this.loadStories();
      this.initElements();
      this.bindEvents();
      this.setupKeyboardShortcuts();
      
      // Initialize state machine with first story
      if (this.stories.length > 0) {
        await this.stateMachine.loadStory(this.stories[0]);
      }
      
      console.log('Enhanced Story Mode initialized');
    } catch (error) {
      console.error('Story initialization failed:', error);
      this.showError('Failed to initialize Story Mode');
    }
  }

  /**
   * Load stories from data
   */
  async loadStories() {
    try {
      const response = await fetch('./data/stories.json');
      if (!response.ok) throw new Error('Failed to load stories');
      
      const data = await response.json();
      this.stories = data.stories || [];
      
      console.log(`Loaded ${this.stories.length} stories`);
    } catch (error) {
      console.error('Error loading stories:', error);
      // Fallback to generating stories from events
      this.stories = await this.generateStoriesFromEvents();
    }
  }

  /**
   * Generate stories from events (fallback)
   */
  async generateStoriesFromEvents() {
    const events = store.getState().events.list;
    if (events.length === 0) return [];

    // Group events by month for story creation
    const monthlyGroups = this.groupEventsByMonth(events);
    
    return Object.entries(monthlyGroups).map(([month, monthEvents]) => ({
      id: `auto-${month}`,
      title: `Climate Events in ${month}`,
      description: `Exploring ${monthEvents.length} climate anomalies recorded in ${month}`,
      steps: monthEvents.map((event, index) => ({
        id: `step-${index}`,
        type: 'event',
        eventId: event.id,
        duration: this.config.defaultDuration,
        narration: this.generateNarration(event),
        camera: {
          center: [event.latitude, event.longitude],
          zoom: 8
        },
        filters: {
          instrument: event.instrument,
          anomaly_type: event.anomaly_type
        }
      }))
    }));
  }

  /**
   * Group events by month
   */
  groupEventsByMonth(events) {
    return events.reduce((groups, event) => {
      const date = new Date(event.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(event);
      
      return groups;
    }, {});
  }

  /**
   * Generate narration for event
   */
  generateNarration(event) {
    const date = formatDate(new Date(event.date));
    const location = `${event.latitude.toFixed(2)}, ${event.longitude.toFixed(2)}`;
    
    return `On ${date}, satellite ${event.instrument} detected a ${event.anomaly_type} anomaly at coordinates ${location}. ${event.description || 'This event represents a significant environmental change worth monitoring.'}`;
  }

  /**
   * Initialize DOM elements
   */
  initElements() {
    // Create story container if not exists
    this.elements.container = qs('#story-container') || this.createStoryContainer();
    this.elements.toolbar = qs('.story-toolbar', this.elements.container);
    this.elements.content = qs('.story-content', this.elements.container);
    this.elements.navigation = qs('.story-navigation', this.elements.container);
    this.elements.progress = qs('.story-progress', this.elements.container);
  }

  /**
   * Create story container
   */
  createStoryContainer() {
    const container = el('div', {
      id: 'story-container',
      className: 'story-container',
      innerHTML: `
        <div class="story-toolbar">
          <div class="story-controls">
            <button class="story-btn story-btn--play" data-action="play" aria-label="Play story">
              <span class="icon">▶</span>
            </button>
            <button class="story-btn story-btn--pause" data-action="pause" aria-label="Pause story">
              <span class="icon">⏸</span>
            </button>
            <button class="story-btn story-btn--stop" data-action="stop" aria-label="Stop story">
              <span class="icon">⏹</span>
            </button>
            <button class="story-btn story-btn--previous" data-action="previous" aria-label="Previous step">
              <span class="icon">⏮</span>
            </button>
            <button class="story-btn story-btn--next" data-action="next" aria-label="Next step">
              <span class="icon">⏭</span>
            </button>
          </div>
          
          <div class="story-info">
            <span class="story-title">Select a story to begin</span>
            <span class="story-step">Step 0 of 0</span>
          </div>
          
          <div class="story-options">
            <label class="story-option">
              <input type="checkbox" class="story-autoplay"> Autoplay
            </label>
            <select class="story-speed">
              <option value="slow">Slow</option>
              <option value="normal" selected>Normal</option>
              <option value="fast">Fast</option>
            </select>
          </div>
        </div>
        
        <div class="story-content">
          <div class="story-narration"></div>
        </div>
        
        <div class="story-navigation">
          <select class="story-selector">
            <option value="">Select a story...</option>
          </select>
        </div>
        
        <div class="story-progress">
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
          <div class="progress-text">0%</div>
        </div>
      `
    });
    
    document.body.appendChild(container);
    return container;
  }

  /**
   * Bind events
   */
  bindEvents() {
    // Story controls
    on(this.elements.toolbar, 'click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action) this.handleAction(action);
    });

    // Story selector
    on(qs('.story-selector', this.elements.container), 'change', (e) => {
      const storyId = e.target.value;
      if (storyId) this.selectStory(storyId);
    });

    // Autoplay toggle
    on(qs('.story-autoplay', this.elements.container), 'change', (e) => {
      this.autoplay = e.target.checked;
    });

    // Speed control
    on(qs('.story-speed', this.elements.container), 'change', (e) => {
      this.setSpeed(e.target.value);
    });

    // Listen for filter changes that might affect story
    eventBus.on('filtersChanged', debounce(() => {
      this.handleFiltersChanged();
    }, 300));
  }

  /**
   * Handle action buttons
   */
  async handleAction(action) {
    try {
      switch (action) {
        case 'play':
          await this.stateMachine.play();
          break;
        case 'pause':
          await this.stateMachine.pause();
          break;
        case 'stop':
          await this.stateMachine.stop();
          break;
        case 'previous':
          await this.stateMachine.previousStep();
          break;
        case 'next':
          await this.stateMachine.nextStep();
          break;
      }
    } catch (error) {
      console.error('Story action failed:', error);
    }
  }

  /**
   * Select story
   */
  async selectStory(storyId) {
    const story = this.stories.find(s => s.id === storyId);
    if (!story) return;

    try {
      await this.stateMachine.loadStory(story);
      this.updateStoryInfo(story);
    } catch (error) {
      console.error('Failed to select story:', error);
    }
  }

  /**
   * Handle state changes
   */
  handleStateChange({ from, to, data }) {
    console.log(`Story state: ${from} → ${to}`);
    
    this.updateControls(to);
    this.updateProgress();
    
    // Handle specific state transitions
    switch (to) {
      case 'LOADING':
        this.showLoading(true);
        break;
      case 'PLAYING':
        this.showLoading(false);
        this.startAutoplayIfEnabled();
        break;
      case 'PAUSED':
        this.stopAutoplay();
        break;
      case 'FINISHED':
        this.handleStoryFinished();
        break;
    }
  }

  /**
   * Handle step changes
   */
  handleStepChange({ step, index, total }) {
    this.updateStepContent(step);
    this.updateStepInfo(index, total);
    this.updateProgress(index, total);
    
    // Apply step filters and camera
    if (step.filters) {
      this.applyStepFilters(step.filters);
    }
    
    if (step.camera) {
      this.applyCameraPosition(step.camera);
    }
  }

  /**
   * Update step content
   */
  updateStepContent(step) {
    const narrationEl = qs('.story-narration', this.elements.content);
    if (narrationEl && step.narration) {
      narrationEl.textContent = step.narration;
    }
  }

  /**
   * Update story info
   */
  updateStoryInfo(story) {
    const titleEl = qs('.story-title', this.elements.toolbar);
    if (titleEl) {
      titleEl.textContent = story.title;
    }
    
    this.populateStorySelector();
  }

  /**
   * Update step info
   */
  updateStepInfo(current, total) {
    const stepEl = qs('.story-step', this.elements.toolbar);
    if (stepEl) {
      stepEl.textContent = `Step ${current + 1} of ${total}`;
    }
  }

  /**
   * Update progress
   */
  updateProgress(current = 0, total = 1) {
    const progress = total > 0 ? (current / total) * 100 : 0;
    
    const fillEl = qs('.progress-fill', this.elements.progress);
    const textEl = qs('.progress-text', this.elements.progress);
    
    if (fillEl) fillEl.style.width = `${progress}%`;
    if (textEl) textEl.textContent = `${Math.round(progress)}%`;
  }

  /**
   * Update controls based on state
   */
  updateControls(state) {
    const controls = {
      play: qs('.story-btn--play', this.elements.toolbar),
      pause: qs('.story-btn--pause', this.elements.toolbar),
      stop: qs('.story-btn--stop', this.elements.toolbar),
      previous: qs('.story-btn--previous', this.elements.toolbar),
      next: qs('.story-btn--next', this.elements.toolbar)
    };

    // Reset all controls
    Object.values(controls).forEach(btn => {
      if (btn) btn.disabled = false;
    });

    // Update based on current state
    switch (state) {
      case 'IDLE':
        if (controls.pause) controls.pause.disabled = true;
        if (controls.stop) controls.stop.disabled = true;
        break;
      case 'LOADING':
        Object.values(controls).forEach(btn => {
          if (btn) btn.disabled = true;
        });
        break;
      case 'PLAYING':
        if (controls.play) controls.play.disabled = true;
        break;
      case 'PAUSED':
        if (controls.pause) controls.pause.disabled = true;
        break;
    }
  }

  /**
   * Populate story selector
   */
  populateStorySelector() {
    const selector = qs('.story-selector', this.elements.container);
    if (!selector) return;

    selector.innerHTML = '<option value="">Select a story...</option>';
    
    this.stories.forEach(story => {
      const option = el('option', {
        value: story.id,
        textContent: story.title
      });
      selector.appendChild(option);
    });
  }

  /**
   * Apply step filters
   */
  applyStepFilters(filters) {
    // Apply filters through the store
    Object.entries(filters).forEach(([key, value]) => {
      actions.updateFilter(key, value);
    });
  }

  /**
   * Apply camera position
   */
  applyCameraPosition(camera) {
    // Emit camera change event for map module
    eventBus.emit('cameraChange', camera);
  }

  /**
   * Handle filters changed
   */
  async handleFiltersChanged() {
    const currentState = this.stateMachine.getState();
    
    // If story is active, rebuild current story with new filters
    if (currentState !== 'IDLE' && this.stateMachine.getCurrentStory()) {
      try {
        await this.stateMachine.handleFilterChange();
      } catch (error) {
        console.error('Failed to handle filter change:', error);
      }
    }
  }

  /**
   * Start autoplay if enabled
   */
  startAutoplayIfEnabled() {
    if (this.autoplay) {
      this.startAutoplay();
    }
  }

  /**
   * Start autoplay
   */
  startAutoplay() {
    this.stopAutoplay(); // Clear any existing timer
    
    const speed = qs('.story-speed', this.elements.container)?.value || 'normal';
    const duration = this.config.speeds[speed];
    
    this.autoplayTimer = setTimeout(() => {
      this.stateMachine.nextStep().catch(error => {
        console.error('Autoplay next step failed:', error);
      });
    }, duration);
  }

  /**
   * Stop autoplay
   */
  stopAutoplay() {
    if (this.autoplayTimer) {
      clearTimeout(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }

  /**
   * Handle story finished
   */
  handleStoryFinished() {
    this.stopAutoplay();
    this.showNotification('Story completed!');
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    on(document, 'keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          this.handleAction(this.stateMachine.getState() === 'PLAYING' ? 'pause' : 'play');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.handleAction('previous');
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.handleAction('next');
          break;
        case 'Escape':
          e.preventDefault();
          this.handleAction('stop');
          break;
      }
    });
  }

  /**
   * Show loading state
   */
  showLoading(show) {
    const container = this.elements.container;
    if (container) {
      container.classList.toggle('story-loading', show);
    }
  }

  /**
   * Show notification
   */
  showNotification(message) {
    // Emit notification event
    eventBus.emit('notification', {
      type: 'info',
      message: message,
      duration: 3000
    });
  }

  /**
   * Show error
   */
  showError(message) {
    // Emit error notification
    eventBus.emit('notification', {
      type: 'error',
      message: message,
      duration: 5000
    });
  }

  /**
   * Track analytics
   */
  trackAnalytics(event) {
    // In a real app, send to analytics service
    console.log('Story Analytics:', event);
  }

  /**
   * Set playback speed
   */
  setSpeed(speed) {
    if (this.config.speeds[speed]) {
      // If autoplay is active, restart with new speed
      if (this.autoplayTimer) {
        this.startAutoplay();
      }
    }
  }

  /**
   * Get current story state
   */
  getState() {
    return {
      state: this.stateMachine.getState(),
      story: this.stateMachine.getCurrentStory(),
      step: this.stateMachine.getCurrentStep(),
      autoplay: this.autoplay
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopAutoplay();
    this.stateMachine.destroy();
    
    if (this.elements.container) {
      this.elements.container.remove();
    }
  }
}

/**
 * Global story controller instance
 */
let storyController = null;

/**
 * Initialize enhanced story mode
 */
export async function initStoryMode() {
  try {
    storyController = new EnhancedStoryController();
    await storyController.init();
    
    // Make available globally for debugging
    window.storyController = storyController;
    
    return storyController;
  } catch (error) {
    console.error('Failed to initialize enhanced story mode:', error);
    throw error;
  }
}

/**
 * Get story controller instance
 */
export function getStoryController() {
  return storyController;
}

/**
 * Export for testing
 */
export { EnhancedStoryController };