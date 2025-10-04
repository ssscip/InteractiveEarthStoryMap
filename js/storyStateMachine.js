/**
 * @fileoverview Story Mode State Machine
 * Manages story playback with formal state transitions and analytics
 */

/**
 * Story Mode States
 */
export const STORY_STATES = {
  IDLE: 'idle',
  LOADING: 'loading', 
  PLAYING: 'playing',
  PAUSED: 'paused',
  FINISHED: 'finished',
  ERROR: 'error'
};

/**
 * Story Mode Events (actions that trigger state transitions)
 */
export const STORY_EVENTS = {
  INIT: 'init',
  PLAY: 'play',
  PAUSE: 'pause',
  NEXT: 'next',
  PREV: 'prev',
  RESET: 'reset',
  FINISH: 'finish',
  ERROR: 'error',
  STEP_COMPLETE: 'step_complete'
};

/**
 * Story State Machine class
 */
export class StoryStateMachine {
  constructor() {
    this.currentState = STORY_STATES.IDLE;
    this.previousState = null;
    this.listeners = new Map();
    this.history = [];
    
    // Story data
    this.currentStory = null;
    this.currentStepIndex = 0;
    this.steps = [];
    this.analytics = {
      startTime: null,
      totalSteps: 0,
      completedSteps: 0,
      skippedSteps: 0,
      pauseCount: 0,
      totalPauseTime: 0
    };
    
    console.log('🎭 Story State Machine initialized');
  }
  
  /**
   * Get current state
   * @returns {string} Current state
   */
  getState() {
    return this.currentState;
  }
  
  /**
   * Get current story data
   * @returns {Object|null} Current story
   */
  getCurrentStory() {
    return this.currentStory;
  }
  
  /**
   * Get current step data
   * @returns {Object|null} Current step
   */
  getCurrentStep() {
    if (!this.currentStory || this.currentStepIndex >= this.steps.length) {
      return null;
    }
    return this.steps[this.currentStepIndex];
  }
  
  /**
   * Get story progress
   * @returns {Object} Progress information
   */
  getProgress() {
    return {
      currentStep: this.currentStepIndex,
      totalSteps: this.steps.length,
      percentage: this.steps.length > 0 ? (this.currentStepIndex / this.steps.length) * 100 : 0,
      isComplete: this.currentStepIndex >= this.steps.length
    };
  }
  
  /**
   * Add state change listener
   * @param {Function} listener - Listener function
   * @returns {Function} Unsubscribe function
   */
  onStateChange(listener) {
    const id = Math.random().toString(36);
    this.listeners.set(id, listener);
    return () => this.listeners.delete(id);
  }
  
  /**
   * Transition to new state
   * @param {string} newState - Target state
   * @param {Object} context - Additional context
   */
  transition(newState, context = {}) {
    const oldState = this.currentState;
    
    if (!this.isValidTransition(oldState, newState)) {
      console.warn(`🎭 Invalid state transition: ${oldState} → ${newState}`);
      return false;
    }
    
    this.previousState = oldState;
    this.currentState = newState;
    
    // Add to history
    this.history.push({
      from: oldState,
      to: newState,
      timestamp: Date.now(),
      context
    });
    
    // Emit state change
    this.emit('stateChange', {
      from: oldState,
      to: newState,
      context
    });
    
    // Emit specific state events
    this.emit(`enter:${newState}`, context);
    this.emit(`exit:${oldState}`, context);
    
    console.log(`🎭 State transition: ${oldState} → ${newState}`, context);
    return true;
  }
  
  /**
   * Check if state transition is valid
   * @param {string} from - Current state
   * @param {string} to - Target state
   * @returns {boolean} Is transition valid
   */
  isValidTransition(from, to) {
    const transitions = {
      [STORY_STATES.IDLE]: [STORY_STATES.LOADING, STORY_STATES.ERROR],
      [STORY_STATES.LOADING]: [STORY_STATES.PLAYING, STORY_STATES.ERROR, STORY_STATES.IDLE],
      [STORY_STATES.PLAYING]: [STORY_STATES.PAUSED, STORY_STATES.FINISHED, STORY_STATES.ERROR, STORY_STATES.IDLE],
      [STORY_STATES.PAUSED]: [STORY_STATES.PLAYING, STORY_STATES.FINISHED, STORY_STATES.ERROR, STORY_STATES.IDLE],
      [STORY_STATES.FINISHED]: [STORY_STATES.IDLE, STORY_STATES.PLAYING],
      [STORY_STATES.ERROR]: [STORY_STATES.IDLE]
    };
    
    return transitions[from]?.includes(to) || false;
  }
  
  /**
   * Emit event to listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('🎭 Story listener error:', error);
      }
    });
  }
  
  /**
   * Initialize story
   * @param {Object} storyData - Story configuration
   * @returns {Promise<boolean>} Success status
   */
  async initStory(storyData) {
    if (this.currentState !== STORY_STATES.IDLE) {
      console.warn('🎭 Cannot init story: not in idle state');
      return false;
    }
    
    try {
      this.transition(STORY_STATES.LOADING, { storyId: storyData.id });
      
      // Validate story data
      if (!this.validateStoryData(storyData)) {
        throw new Error('Invalid story data');
      }
      
      // Set story data
      this.currentStory = storyData;
      this.steps = storyData.steps || [];
      this.currentStepIndex = 0;
      
      // Reset analytics
      this.analytics = {
        startTime: null,
        totalSteps: this.steps.length,
        completedSteps: 0,
        skippedSteps: 0,
        pauseCount: 0,
        totalPauseTime: 0,
        storyId: storyData.id
      };
      
      this.emit('story:init', { story: this.currentStory });
      
      console.log(`🎭 Story initialized: ${storyData.title} (${this.steps.length} steps)`);
      return true;
      
    } catch (error) {
      console.error('🎭 Story init failed:', error);
      this.transition(STORY_STATES.ERROR, { error });
      return false;
    }
  }
  
  /**
   * Start story playback
   * @returns {boolean} Success status
   */
  play() {
    if (this.currentState === STORY_STATES.LOADING) {
      // Wait for loading to complete
      return false;
    }
    
    if (![STORY_STATES.IDLE, STORY_STATES.PAUSED, STORY_STATES.FINISHED].includes(this.currentState)) {
      console.warn('🎭 Cannot play: invalid state');
      return false;
    }
    
    // Reset if finished
    if (this.currentState === STORY_STATES.FINISHED) {
      this.currentStepIndex = 0;
      this.analytics.completedSteps = 0;
    }
    
    this.transition(STORY_STATES.PLAYING, { stepIndex: this.currentStepIndex });
    
    // Start analytics timer
    if (!this.analytics.startTime) {
      this.analytics.startTime = Date.now();
    }
    
    this.emit('story:start', { 
      story: this.currentStory,
      step: this.getCurrentStep()
    });
    
    // Execute current step
    this.executeCurrentStep();
    
    return true;
  }
  
  /**
   * Pause story playback
   * @returns {boolean} Success status
   */
  pause() {
    if (this.currentState !== STORY_STATES.PLAYING) {
      console.warn('🎭 Cannot pause: not playing');
      return false;
    }
    
    this.transition(STORY_STATES.PAUSED, { stepIndex: this.currentStepIndex });
    
    // Update analytics
    this.analytics.pauseCount++;
    
    this.emit('story:pause', {
      story: this.currentStory,
      step: this.getCurrentStep()
    });
    
    return true;
  }
  
  /**
   * Go to next step
   * @returns {boolean} Success status
   */
  next() {
    if (![STORY_STATES.PLAYING, STORY_STATES.PAUSED].includes(this.currentState)) {
      console.warn('🎭 Cannot advance: invalid state');
      return false;
    }
    
    if (this.currentStepIndex >= this.steps.length - 1) {
      return this.finish();
    }
    
    // Mark current step as completed
    this.analytics.completedSteps++;
    
    this.currentStepIndex++;
    
    this.emit('story:step', {
      story: this.currentStory,
      step: this.getCurrentStep(),
      stepIndex: this.currentStepIndex,
      progress: this.getProgress()
    });
    
    // Execute next step if playing
    if (this.currentState === STORY_STATES.PLAYING) {
      this.executeCurrentStep();
    }
    
    return true;
  }
  
  /**
   * Go to previous step
   * @returns {boolean} Success status
   */
  prev() {
    if (![STORY_STATES.PLAYING, STORY_STATES.PAUSED].includes(this.currentState)) {
      console.warn('🎭 Cannot go back: invalid state');
      return false;
    }
    
    if (this.currentStepIndex <= 0) {
      console.warn('🎭 Already at first step');
      return false;
    }
    
    this.currentStepIndex--;
    this.analytics.completedSteps = Math.max(0, this.analytics.completedSteps - 1);
    
    this.emit('story:step', {
      story: this.currentStory,
      step: this.getCurrentStep(),
      stepIndex: this.currentStepIndex,
      progress: this.getProgress()
    });
    
    // Execute current step if playing
    if (this.currentState === STORY_STATES.PLAYING) {
      this.executeCurrentStep();
    }
    
    return true;
  }
  
  /**
   * Skip to specific step
   * @param {number} stepIndex - Target step index
   * @returns {boolean} Success status
   */
  skipTo(stepIndex) {
    if (![STORY_STATES.PLAYING, STORY_STATES.PAUSED].includes(this.currentState)) {
      return false;
    }
    
    if (stepIndex < 0 || stepIndex >= this.steps.length) {
      return false;
    }
    
    const wasSkipped = stepIndex > this.currentStepIndex;
    if (wasSkipped) {
      this.analytics.skippedSteps += stepIndex - this.currentStepIndex;
    }
    
    this.currentStepIndex = stepIndex;
    this.analytics.completedSteps = stepIndex;
    
    this.emit('story:skip', {
      story: this.currentStory,
      step: this.getCurrentStep(),
      stepIndex: this.currentStepIndex,
      progress: this.getProgress()
    });
    
    // Execute current step if playing
    if (this.currentState === STORY_STATES.PLAYING) {
      this.executeCurrentStep();
    }
    
    return true;
  }
  
  /**
   * Finish story
   * @returns {boolean} Success status
   */
  finish() {
    if (![STORY_STATES.PLAYING, STORY_STATES.PAUSED].includes(this.currentState)) {
      console.warn('🎭 Cannot finish: invalid state');
      return false;
    }
    
    this.transition(STORY_STATES.FINISHED, { 
      analytics: this.analytics,
      duration: this.analytics.startTime ? Date.now() - this.analytics.startTime : 0
    });
    
    this.emit('story:finish', {
      story: this.currentStory,
      analytics: this.analytics,
      progress: this.getProgress()
    });
    
    return true;
  }
  
  /**
   * Reset story to beginning
   * @returns {boolean} Success status
   */
  reset() {
    this.transition(STORY_STATES.IDLE);
    
    this.currentStory = null;
    this.currentStepIndex = 0;
    this.steps = [];
    
    this.emit('story:reset');
    
    return true;
  }
  
  /**
   * Execute current step
   */
  executeCurrentStep() {
    const step = this.getCurrentStep();
    if (!step) {
      this.finish();
      return;
    }
    
    this.emit('story:execute_step', {
      story: this.currentStory,
      step,
      stepIndex: this.currentStepIndex
    });
    
    // Auto-advance after delay
    if (step.delayMs && this.currentState === STORY_STATES.PLAYING) {
      setTimeout(() => {
        if (this.currentState === STORY_STATES.PLAYING) {
          this.next();
        }
      }, step.delayMs);
    }
  }
  
  /**
   * Validate story data structure
   * @param {Object} storyData - Story data to validate
   * @returns {boolean} Is valid
   */
  validateStoryData(storyData) {
    if (!storyData || typeof storyData !== 'object') {
      console.error('🎭 Story data is not an object');
      return false;
    }
    
    if (!storyData.id || !storyData.title) {
      console.error('🎭 Story missing required fields: id, title');
      return false;
    }
    
    if (!Array.isArray(storyData.steps) || storyData.steps.length === 0) {
      console.error('🎭 Story must have steps array');
      return false;
    }
    
    // Validate steps
    for (let i = 0; i < storyData.steps.length; i++) {
      const step = storyData.steps[i];
      if (!step.eventId) {
        console.error(`🎭 Step ${i} missing eventId`);
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Get analytics data
   * @returns {Object} Analytics data
   */
  getAnalytics() {
    return {
      ...this.analytics,
      currentState: this.currentState,
      currentStep: this.currentStepIndex,
      progress: this.getProgress(),
      duration: this.analytics.startTime ? Date.now() - this.analytics.startTime : 0
    };
  }
}

console.log('🎭 Story State Machine loaded');