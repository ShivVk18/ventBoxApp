import { useState, useEffect, useCallback, useRef } from "react";
import firestoreService from "../services/firestoreService";

// Global singleton state for queue data
// This approach ensures only one set of network requests/listeners
// is active across all instances of the hook, and all instances
// reflect the same up-to-date data.
let globalQueueState = {
  stats: {
    ventersWaiting: 0,
    listenersWaiting: 0,
    activeSessions: 0,
    totalUsers: 0,
    averageWaitTime: 0,
  },
  lastUpdated: null,
  loading: false,
  error: null,
  intervalId: null, // Store the interval ID for global management
  retryCount: 0, // Global retry count for the single fetch operation
  retryTimeoutId: null, // Global retry timeout ID
};

// Array to keep track of active components using this hook
const activeHookInstances = new Set();

const useQueue = () => {
  // Each component instance will have its own local state,
  // initialized with the global state.
  const [queueStats, setQueueStats] = useState(globalQueueState.stats);
  const [loading, setLoading] = useState(globalQueueState.loading);
  const [error, setError] = useState(globalQueueState.error);
  const [lastUpdated, setLastUpdated] = useState(globalQueueState.lastUpdated);

  const isMountedRef = useRef(true); // Tracks if the *current* component instance is mounted
  const instanceId = useRef(Math.random().toString(36).substr(2, 9)); // Unique ID for this hook instance

  // --- Throttled Debug Logging ---
  const loggedMessages = useRef(new Set());
  const debugLog = useCallback(
    (action, data = {}, level = "info") => {
      const logKey = `${level}-${action}`;
      // Skip if we've logged this specific action/level recently (within 1 second)
      if (loggedMessages.current.has(logKey)) {
        return;
      }

      loggedMessages.current.add(logKey);
      setTimeout(() => loggedMessages.current.delete(logKey), 1000); // Allow logging again after 1 second

      const timestamp = new Date().toISOString();
      const logData = {
        timestamp,
        hook: "useQueue",
        instance: instanceId.current,
        action,
        currentGlobalLoading: globalQueueState.loading,
        currentGlobalError: globalQueueState.error?.substring(0, 100),
        globalRetryCount: globalQueueState.retryCount,
        ...data,
      };

      const logMessage = `📊 [useQueue-${instanceId.current}] ${action}`;

      switch (level) {
        case "error":
          console.error(logMessage, logData);
          break;
        case "warn":
          console.warn(logMessage, logData);
          break;
        default:
          console.log(logMessage, logData);
      }
    },
    [] // Dependencies are intentionally empty as this only depends on internal state of the ref
  );

  // --- Core Data Fetching Logic (Singleton) ---
  const loadQueueStats = useCallback(
    async (isRetry = false) => {
      // Only proceed if this instance is still mounted when the async operation started
      if (!isMountedRef.current) {
        debugLog("load_stats_skipped", { reason: "component_unmounted_before_fetch_start" }, "warn");
        return;
      }

      // If a load is already in progress and this isn't a retry, just return.
      // The currently active load will update all instances when it completes.
      if (globalQueueState.loading && !isRetry) {
        debugLog("load_stats_skipped", { reason: "already_loading" }, "info");
        return;
      }

      // Only the first active instance (or the one initiating the fetch)
      // should set loading true globally and initiate the fetch.
      // Other instances will just reflect this global state.
      if (!isRetry && !globalQueueState.loading) {
        globalQueueState.loading = true;
        globalQueueState.error = null;
        setLoading(true); // Update local state
        setError(null);   // Update local state
        debugLog("global_loading_set_true");
      }

      debugLog("load_stats_start", { isRetry, retryCount: globalQueueState.retryCount });

      try {
        const stats = await firestoreService.getQueueStats();
        debugLog("raw_stats_received", { stats });

        // Ensure the component is still mounted after the async call
        if (!isMountedRef.current) {
          debugLog("load_stats_aborted", { reason: "component_unmounted_after_fetch" }, "warn");
          return;
        }

        const enhancedStats = {
          ...stats,
          totalUsers: stats.ventersWaiting + stats.listenersWaiting,
          averageWaitTime:
            stats.ventersWaiting > stats.listenersWaiting
              ? Math.max(30, stats.ventersWaiting * 15)
              : Math.min(30, Math.max(10, stats.listenersWaiting * 5)),
        };

        // Update global state cache
        globalQueueState.stats = enhancedStats;
        globalQueueState.lastUpdated = new Date();
        globalQueueState.error = null;
        globalQueueState.retryCount = 0;

        // Update local state of *this* hook instance
        setQueueStats(enhancedStats);
        setLastUpdated(globalQueueState.lastUpdated);
        setError(null);

        debugLog("stats_updated_success", { enhancedStats });
      } catch (error) {
        debugLog(
          "load_stats_error",
          {
            error: error.message,
            stack: error.stack?.substring(0, 200),
          },
          "error"
        );

        if (!isMountedRef.current) {
          debugLog("error_handling_skipped", { reason: "component_unmounted" }, "warn");
          return;
        }

        // Update global error state
        globalQueueState.error = error.message;
        setError(error.message); // Update local state

        globalQueueState.retryCount += 1;

        // Retry logic with exponential backoff
        if (globalQueueState.retryCount <= 3) {
          const retryDelay = Math.min(1000 * Math.pow(2, globalQueueState.retryCount), 10000); // Max 10 seconds
          debugLog("scheduling_retry", {
            retryAttempt: globalQueueState.retryCount,
            retryDelay,
            maxRetries: 3,
          });

          // Clear any existing retry timeout before setting a new one
          if (globalQueueState.retryTimeoutId) {
              clearTimeout(globalQueueState.retryTimeoutId);
          }
          globalQueueState.retryTimeoutId = setTimeout(() => {
            debugLog("executing_retry", { retryAttempt: globalQueueState.retryCount });
            loadQueueStats(true); // Pass true for isRetry
          }, retryDelay);
        } else {
          debugLog("max_retries_reached", { maxRetries: 3 }, "error");
          // Set fallback stats globally and locally
          const fallbackStats = {
            ventersWaiting: 0,
            listenersWaiting: 0,
            activeSessions: 0,
            totalUsers: 0,
            averageWaitTime: 0,
          };
          globalQueueState.stats = fallbackStats;
          setQueueStats(fallbackStats);
          debugLog("fallback_stats_set", { fallbackStats });
        }
      } finally {
        // Only set global loading to false if this was the initial (non-retry) fetch
        // and no further retries are scheduled.
        if (!isRetry && globalQueueState.retryCount === 0) {
            globalQueueState.loading = false;
            setLoading(false); // Update local state
            debugLog("global_loading_cleared");
        } else if (globalQueueState.retryCount > 0 && !globalQueueState.retryTimeoutId) {
            // If retries failed and no more are scheduled, clear loading state
            globalQueueState.loading = false;
            setLoading(false);
            debugLog("global_loading_cleared_after_retries_exhausted");
        }
      }
    },
    [debugLog]
  );

  const refreshStats = useCallback(async () => {
    debugLog("manual_refresh_start");
    // Reset retry count for a fresh manual refresh attempt
    globalQueueState.retryCount = 0;
    // Clear any pending retry timeout
    if (globalQueueState.retryTimeoutId) {
        clearTimeout(globalQueueState.retryTimeoutId);
        globalQueueState.retryTimeoutId = null;
    }
    await loadQueueStats();
    debugLog("manual_refresh_completed");
  }, [loadQueueStats, debugLog]);

  // --- Global Real-time Monitoring Setup ---
  const setupGlobalMonitoring = useCallback(() => {
    // Only set up the interval if it's not already running
    if (!globalQueueState.intervalId) {
      debugLog("setting_up_global_interval");
      globalQueueState.intervalId = setInterval(() => {
        // Trigger a silent update (isRetry=true)
        // This will reuse the existing global loading state if an update is still processing.
        loadQueueStats(true);
      }, 30000); // Update every 30 seconds
    } else {
      debugLog("global_interval_already_active", { intervalId: globalQueueState.intervalId });
    }
  }, [loadQueueStats, debugLog]);


  // --- Helper functions for UI/Logic ---
  const getQueueStatusMessage = useCallback(() => {
    // debugLog("generating_status_message", { loading, error, queueStats }); // Too chatty for throttled log
    if (loading) return "Loading queue information...";
    if (error) return "Unable to load queue information";

    const { ventersWaiting, listenersWaiting, activeSessions } = queueStats;

    if (ventersWaiting === 0 && listenersWaiting === 0) {
      return "No one is currently waiting. Be the first!";
    } else if (ventersWaiting > listenersWaiting) {
      return `${ventersWaiting} people need listeners. Great time to help!`;
    } else if (listenersWaiting > ventersWaiting) {
      return `${listenersWaiting} listeners are ready. Quick matching expected!`;
    } else {
      return `${activeSessions} active sessions. Balanced queue!`;
    }
  }, [queueStats, loading, error]);

  const getMatchingProbability = useCallback(
    (userType) => {
      // debugLog("calculating_matching_probability", { userType, loading, error, queueStats }); // Too chatty
      if (loading || error) return "unknown";

      const { ventersWaiting, listenersWaiting } = queueStats;
      const oppositeCount = userType === "venter" ? listenersWaiting : ventersWaiting;

      if (oppositeCount === 0) return "low";
      if (oppositeCount >= 3) return "high";
      return "medium";
    },
    [queueStats, loading, error]
  );

  // --- Initialization and Cleanup Effect ---
  useEffect(() => {
    isMountedRef.current = true;
    activeHookInstances.add(instanceId.current); // Add this instance to the active set
    debugLog("component_mounted", { totalInstances: activeHookInstances.size });

    // Initial data load (only triggered by the first instance or if no data is loaded)
    // All instances will get updated from the global state once loadQueueStats completes.
    loadQueueStats();
    setupGlobalMonitoring(); // Ensure the global interval is running

    // Sync local state with global state on mount (important for subsequent mounts)
    setQueueStats(globalQueueState.stats);
    setLastUpdated(globalQueueState.lastUpdated);
    setLoading(globalQueueState.loading);
    setError(globalQueueState.error);

    return () => {
      debugLog("component_unmounting", { totalInstances: activeHookInstances.size -1 });
      isMountedRef.current = false;
      activeHookInstances.delete(instanceId.current); // Remove this instance

      // Only clear the global interval if no other hook instances are active
      if (activeHookInstances.size === 0) {
        debugLog("all_instances_unmounted_clearing_global_interval");
        if (globalQueueState.intervalId) {
          clearInterval(globalQueueState.intervalId);
          globalQueueState.intervalId = null;
        }
        if (globalQueueState.retryTimeoutId) {
            clearTimeout(globalQueueState.retryTimeoutId);
            globalQueueState.retryTimeoutId = null;
        }
        // Optionally reset global state completely if no instances are left
        globalQueueState.stats = { ventersWaiting: 0, listenersWaiting: 0, activeSessions: 0, totalUsers: 0, averageWaitTime: 0 };
        globalQueueState.lastUpdated = null;
        globalQueueState.loading = false;
        globalQueueState.error = null;
        globalQueueState.retryCount = 0;
      }
    };
  }, [loadQueueStats, setupGlobalMonitoring, debugLog]);

  return {
    queueStats,
    loading,
    error,
    lastUpdated,
    refreshStats,
    getQueueStatusMessage,
    getMatchingProbability,
  };
};

export default useQueue;