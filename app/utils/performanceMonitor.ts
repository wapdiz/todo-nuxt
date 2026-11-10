/**
 * Performance monitoring utility for Vue applications
 * Helps track and optimize application performance
 */

interface RenderEntry {
  time: number;
  timestamp: number;
}

interface NavigationEntry {
  time: number;
  timestamp: number;
}

interface ResourceEntry {
  name: string;
  duration: number;
  size: number;
  type: string;
  timestamp: number;
}

interface MemoryEntry {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}

interface Metrics {
  componentRenderTimes: Record<string, RenderEntry[]>;
  navigationTimes: Record<string, NavigationEntry>;
  resourceLoadTimes: ResourceEntry[];
  memoryUsage: MemoryEntry[];
}

const metrics: Metrics = {
  componentRenderTimes: {},
  navigationTimes: {},
  resourceLoadTimes: [],
  memoryUsage: [],
};

// Development mode only - console output
const isDev = process.env.NODE_ENV === 'development';

// Configuration
const config = {
  renderTimeThreshold: 16.67, // 60fps threshold
  navigationTimeThreshold: 300,
  resourceSizeThreshold: 500000, // 500KB
  memorySamplingInterval: 10000, // 10 seconds
  maxEntries: {
    componentRender: 100,
    navigation: 50,
    resource: 200,
    memory: 100,
  },
};

/**
 * Track component render time
 */
export function trackRender<T>(componentName: string, callback: () => T): T {
  if (!isDev) return callback();

  const startTime = performance.now();
  const result = callback();
  const endTime = performance.now();
  const renderTime = endTime - startTime;

  if (!metrics.componentRenderTimes[componentName]) {
    metrics.componentRenderTimes[componentName] = [];
  }

  if (metrics.componentRenderTimes[componentName].length >= config.maxEntries.componentRender) {
    metrics.componentRenderTimes[componentName].shift();
  }

  metrics.componentRenderTimes[componentName].push({
    time: renderTime,
    timestamp: Date.now(),
  });

  if (renderTime > config.renderTimeThreshold) {
    console.warn(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
  }

  return result;
}

/**
 * Track navigation performance
 */
export function trackNavigation(from: string, to: string): void {
  if (!isDev) return;

  const navigationStart = performance.now();

  window.requestAnimationFrame(() => {
    const navigationEnd = performance.now();
    const navigationTime = navigationEnd - navigationStart;
    const navigationKey = `${from} → ${to}`;

    const entries = Object.keys(metrics.navigationTimes);
    if (entries.length >= config.maxEntries.navigation && entries[0] !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete metrics.navigationTimes[entries[0]];
    }

    metrics.navigationTimes[navigationKey] = {
      time: navigationTime,
      timestamp: Date.now(),
    };

    if (navigationTime > config.navigationTimeThreshold) {
      console.warn(`Slow navigation: ${from} → ${to} took ${navigationTime.toFixed(2)}ms`);
    }
  });
}

/**
 * Track memory usage
 */
export function trackMemory(): void {
  // расширяем тип Performance для доступа к memory
  const perfWithMemory = performance as Performance & {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  };

  if (!isDev || !perfWithMemory.memory) return;

  const sampleMemory = () => {
    if (metrics.memoryUsage.length >= config.maxEntries.memory) {
      metrics.memoryUsage.shift();
    }

    metrics.memoryUsage.push({
      usedJSHeapSize: perfWithMemory.memory!.usedJSHeapSize,
      totalJSHeapSize: perfWithMemory.memory!.totalJSHeapSize,
      jsHeapSizeLimit: perfWithMemory.memory!.jsHeapSizeLimit,
      timestamp: Date.now(),
    });

    const heapUsagePercentage = (perfWithMemory.memory!.usedJSHeapSize / perfWithMemory.memory!.jsHeapSizeLimit) * 100;
    if (heapUsagePercentage > 80) {
      console.warn(`High memory usage detected: ${heapUsagePercentage.toFixed(2)}% of heap limit`);
    }
  };

  sampleMemory();
  setInterval(sampleMemory, config.memorySamplingInterval);
}

/**
 * Get performance report
 */
export function getPerformanceReport() {
  return {
    ...metrics,
    navigation: performance.getEntriesByType('navigation'),
    resources: performance.getEntriesByType('resource'),
    timestamp: Date.now(),
    summary: calculateSummaryStatistics(),
  };
}

/**
 * Calculate summary statistics
 */
function calculateSummaryStatistics() {
  const componentAverages: Record<string, { avg: number; min: number; max: number; count: number }> = {};

  Object.entries(metrics.componentRenderTimes).forEach(([component, times]) => {
    const renderTimes = times.map((entry) => entry.time);
    componentAverages[component] = {
      avg: renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length,
      min: Math.min(...renderTimes),
      max: Math.max(...renderTimes),
      count: renderTimes.length,
    };
  });

  const navigationTimes = Object.values(metrics.navigationTimes).map((entry) => entry.time);
  const avgNavigationTime = navigationTimes.length
    ? navigationTimes.reduce((sum, time) => sum + time, 0) / navigationTimes.length
    : 0;

  return {
    componentAverages,
    avgNavigationTime,
    resourceCount: metrics.resourceLoadTimes.length,
    memorySnapshots: metrics.memoryUsage.length,
  };
}

/**
 * Reset performance metrics
 */
export function resetMetrics(): void {
  metrics.componentRenderTimes = {};
  metrics.navigationTimes = {};
  metrics.resourceLoadTimes = [];
  metrics.memoryUsage = [];
}

/**
 * Monitor resource loading
 */
export function monitorResources(): void {
  if (!isDev) return;

  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();

    entries.forEach((entry) => {
      if (entry.entryType === 'resource') {
        if (metrics.resourceLoadTimes.length >= config.maxEntries.resource) {
          metrics.resourceLoadTimes.shift();
        }

        const resourceEntry: ResourceEntry = {
          name: entry.name,
          duration: entry.duration,
          size: (entry as PerformanceResourceTiming).transferSize,
          type: (entry as PerformanceResourceTiming).initiatorType,
          timestamp: Date.now(),
        };

        metrics.resourceLoadTimes.push(resourceEntry);

        if (resourceEntry.size > config.resourceSizeThreshold) {
          console.warn(`Large resource detected: ${resourceEntry.name} (${Math.round(resourceEntry.size / 1024)}KB)`);
        }
      }
    });
  });

  observer.observe({ entryTypes: ['resource'] });
}

export default {
  trackRender,
  trackNavigation,
  trackMemory,
  getPerformanceReport,
  resetMetrics,
  monitorResources,
};
