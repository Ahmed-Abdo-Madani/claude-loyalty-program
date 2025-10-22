/**
 * Simple in-memory metrics counter
 * 
 * Tracks counts of events for monitoring and alerting
 * In production, integrate with external metrics service (DataDog, Prometheus, etc.)
 */

class MetricsCounter {
  constructor() {
    this.counters = new Map()
    this.timers = new Map()
  }

  /**
   * Increment a counter
   */
  increment(name, value = 1, tags = {}) {
    const key = this.getKey(name, tags)
    const current = this.counters.get(key) || { count: 0, name, tags, firstSeen: Date.now(), lastSeen: Date.now() }
    current.count += value
    current.lastSeen = Date.now()
    this.counters.set(key, current)
  }

  /**
   * Decrement a counter
   */
  decrement(name, value = 1, tags = {}) {
    this.increment(name, -value, tags)
  }

  /**
   * Get counter value
   */
  get(name, tags = {}) {
    const key = this.getKey(name, tags)
    const counter = this.counters.get(key)
    return counter ? counter.count : 0
  }

  /**
   * Get all counters
   */
  getAll() {
    const result = []
    for (const [key, counter] of this.counters.entries()) {
      result.push({
        name: counter.name,
        count: counter.count,
        tags: counter.tags,
        firstSeen: new Date(counter.firstSeen).toISOString(),
        lastSeen: new Date(counter.lastSeen).toISOString()
      })
    }
    return result
  }

  /**
   * Reset counter
   */
  reset(name, tags = {}) {
    const key = this.getKey(name, tags)
    this.counters.delete(key)
  }

  /**
   * Reset all counters
   */
  resetAll() {
    this.counters.clear()
  }

  /**
   * Start a timer
   */
  startTimer(name, tags = {}) {
    const key = this.getKey(name, tags)
    this.timers.set(key, { start: Date.now(), name, tags })
  }

  /**
   * Stop timer and return duration
   */
  stopTimer(name, tags = {}) {
    const key = this.getKey(name, tags)
    const timer = this.timers.get(key)
    if (!timer) return 0
    
    const duration = Date.now() - timer.start
    this.timers.delete(key)
    
    // Also record as counter
    this.increment(`${name}.duration_ms`, duration, tags)
    
    return duration
  }

  /**
   * Generate unique key from name and tags
   */
  getKey(name, tags) {
    if (!tags || Object.keys(tags).length === 0) {
      return name
    }
    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',')
    return `${name}{${tagString}}`
  }

  /**
   * Check if counter exceeds threshold (for alerting)
   */
  checkThreshold(name, threshold, tags = {}) {
    const value = this.get(name, tags)
    return value >= threshold
  }

  /**
   * Get counter rate (per second) over last N seconds
   */
  getRate(name, windowSeconds = 60, tags = {}) {
    const key = this.getKey(name, tags)
    const counter = this.counters.get(key)
    if (!counter) return 0
    
    const now = Date.now()
    const windowMs = windowSeconds * 1000
    const elapsed = now - counter.firstSeen
    
    if (elapsed < windowMs) {
      // Not enough data, use elapsed time
      return counter.count / (elapsed / 1000)
    }
    
    // Use window
    return counter.count / windowSeconds
  }
}

// Singleton instance
const metrics = new MetricsCounter()

export default metrics
