/**
 * QUERY LOGGER - Advanced debugging for query ping-pong issues
 * 
 * Features:
 * - Trace ID per bootstrap session
 * - Request ID per entity call
 * - Callsite stack traces
 * - Ring buffer in localStorage
 * - Query cache subscriber
 */

const MAX_LOG_ENTRIES = 200;
const STORAGE_KEY = 'promptster_query_debug_log';

// Generate trace ID per session
export function getOrCreateTraceId() {
  if (!window.__DEMO_TRACE_ID) {
    window.__DEMO_TRACE_ID = `trace_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
  return window.__DEMO_TRACE_ID;
}

// Ring buffer for localStorage
class LogRingBuffer {
  constructor(key, maxSize) {
    this.key = key;
    this.maxSize = maxSize;
  }

  add(entry) {
    try {
      const stored = JSON.parse(localStorage.getItem(this.key) || '[]');
      stored.push(entry);
      
      // Keep only last maxSize entries
      const trimmed = stored.slice(-this.maxSize);
      localStorage.setItem(this.key, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('[LOG_BUFFER] Failed to write:', e);
    }
  }

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.key) || '[]');
    } catch {
      return [];
    }
  }

  clear() {
    localStorage.removeItem(this.key);
  }
}

export const queryLogBuffer = new LogRingBuffer(STORAGE_KEY, MAX_LOG_ENTRIES);

// Extract callsite from stack
function getCallsite(stackDepth = 3) {
  try {
    const stack = new Error().stack;
    const lines = stack.split('\n').slice(stackDepth, stackDepth + 3);
    return lines.map(l => l.trim()).join(' → ');
  } catch {
    return 'unknown';
  }
}

// Log entity filter call
export function logEntityCall(entityName, filter, queryKey, resultCount, duration) {
  const traceId = getOrCreateTraceId();
  const reqId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const callsite = getCallsite(4);
  
  const entry = {
    timestamp: new Date().toISOString(),
    traceId,
    reqId,
    entity: entityName,
    filter: JSON.stringify(filter),
    queryKey: JSON.stringify(queryKey),
    resultCount,
    duration,
    callsite
  };

  // Console log (grouped)
  console.groupCollapsed(
    `[QUERY] ${entityName} ${JSON.stringify(filter)} → ${resultCount} results (${duration}ms)`
  );
  console.log('📊 Trace ID:', traceId);
  console.log('🆔 Request ID:', reqId);
  console.log('🔑 Query Key:', queryKey);
  console.log('📍 Callsite:', callsite);
  console.log('⏱️ Duration:', duration, 'ms');
  console.log('📦 Result Count:', resultCount);
  console.groupEnd();

  // Add to ring buffer
  queryLogBuffer.add(entry);

  return entry;
}

// Wrapper for entity filter calls
export function debugEntityFilter(entityName, filterFn, queryKey) {
  return async (filter) => {
    const startTime = performance.now();
    
    try {
      const result = await filterFn(filter);
      const duration = Math.round(performance.now() - startTime);
      const count = Array.isArray(result) ? result.length : 0;
      
      logEntityCall(entityName, filter, queryKey, count, duration);
      
      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      logEntityCall(entityName, filter, queryKey, 'ERROR', duration);
      throw error;
    }
  };
}

// Subscribe to React Query cache
export function subscribeToQueryCache(queryClient) {
  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (!event) return;

    const { type, query } = event;
    const queryKey = query?.queryKey;
    const queryHash = query?.queryHash;
    const state = query?.state;

    // Log significant events
    if (type === 'added' || type === 'updated') {
      const isFetching = state?.fetchStatus === 'fetching';
      const isInvalidated = state?.isInvalidated;
      const dataUpdatedAt = state?.dataUpdatedAt;

      if (isFetching || isInvalidated) {
        console.log(
          `[QUERY_CACHE] ${type.toUpperCase()}`,
          {
            queryKey,
            queryHash,
            isFetching,
            isInvalidated,
            dataUpdatedAt: dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null,
            fetchStatus: state?.fetchStatus,
            fetchFailureReason: state?.error?.message
          }
        );

        // Log to buffer
        queryLogBuffer.add({
          timestamp: new Date().toISOString(),
          traceId: getOrCreateTraceId(),
          type: 'query_cache_event',
          event: type,
          queryKey: JSON.stringify(queryKey),
          queryHash,
          isFetching,
          isInvalidated
        });
      }
    }
  });

  console.log('🔍 Query Cache Subscriber activated');
  return unsubscribe;
}

// Export logs for debugging
export function exportQueryLogs() {
  const logs = queryLogBuffer.getAll();
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `query-logs-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  console.log('📥 Query logs exported');
}

// Print summary
export function printQuerySummary() {
  const logs = queryLogBuffer.getAll();
  
  console.group('📊 QUERY SUMMARY');
  console.log('Total queries:', logs.length);
  
  // Group by entity
  const byEntity = {};
  logs.forEach(log => {
    if (log.entity) {
      byEntity[log.entity] = (byEntity[log.entity] || 0) + 1;
    }
  });
  
  console.log('By entity:', byEntity);
  
  // Find ping-pong patterns (same entity, alternating filters)
  const pingPong = [];
  for (let i = 1; i < logs.length; i++) {
    const prev = logs[i - 1];
    const curr = logs[i];
    
    if (prev.entity === curr.entity && 
        prev.entity === 'Thought' &&
        prev.filter !== curr.filter &&
        curr.timestamp - prev.timestamp < 100) {
      pingPong.push({ prev, curr });
    }
  }
  
  if (pingPong.length > 0) {
    console.warn('⚠️ PING-PONG DETECTED:', pingPong.length, 'alternating queries');
    console.table(pingPong.slice(0, 10));
  }
  
  console.groupEnd();
}

// Clear logs
export function clearQueryLogs() {
  queryLogBuffer.clear();
  console.log('🗑️ Query logs cleared');
}

// Expose to window for console debugging
if (typeof window !== 'undefined') {
  window.queryDebug = {
    export: exportQueryLogs,
    summary: printQuerySummary,
    clear: clearQueryLogs,
    logs: () => queryLogBuffer.getAll()
  };
  
  console.log('🐛 Query debug tools available: window.queryDebug');
}