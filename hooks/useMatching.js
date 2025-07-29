import { useState, useEffect, useCallback, useRef } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import firestoreService from "../services/firestoreService";
import { useAuth } from "../context/AuthContext";

const useMatching = () => {
  const [isMatching, setIsMatching] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [matchingStatus, setMatchingStatus] = useState("idle"); // idle, searching, found, failed
  const [estimatedWaitTime, setEstimatedWaitTime] = useState(null);

  const unsubscribeRef = useRef(null); // Firestore listener unsubscribe function
  const timeoutRef = useRef(null); // Timeout for no match found
  const matchDataRef = useRef(null); // Ref to hold current matchData for async operations
  const isMountedRef = useRef(true); // Tracks if the component instance is mounted
  const retryTimeoutRef = useRef(null); // Timeout for retry attempt after no match
  const { userInfo } = useAuth();

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
        hook: "useMatching",
        action,
        userId: userInfo?.uid || "unknown",
        currentIsMatching: isMatching, // Use current state from closure
        currentMatchingStatus: matchingStatus, // Use current state from closure
        ...data,
      };

      const logMessage = `🔍 [useMatching] ${action}`;

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
    [userInfo?.uid, isMatching, matchingStatus] // Dependencies ensure log data reflects current state
  );

  // Update ref when matchData changes, important for async operations
  useEffect(() => {
    matchDataRef.current = matchData;
    if (matchData) {
      debugLog("matchData_updated", { hasQueueDocId: !!matchData?.queueDocId });
    }
  }, [matchData, debugLog]);

  const calculateEstimatedWaitTime = useCallback(
    async (userType) => {
      debugLog("calculate_wait_time_start", { userType });
      try {
        const stats = await firestoreService.getQueueStats();
        const waitingCount = userType === "venter" ? stats.ventersWaiting : stats.listenersWaiting;
        const oppositeCount = userType === "venter" ? stats.listenersWaiting : stats.ventersWaiting;

        let estimatedTime;
        if (oppositeCount > 0) {
          estimatedTime = "< 30 seconds"; // Immediate match likely if someone is waiting
        } else if (waitingCount < 5) {
          estimatedTime = "1-3 minutes"; // Few people in own queue, still somewhat quick
        } else {
          estimatedTime = "3-5 minutes"; // More people in own queue, longer wait
        }

        setEstimatedWaitTime(estimatedTime);
        debugLog("wait_time_calculated", {
          userType,
          waitingCount,
          oppositeCount,
          estimatedTime,
        });
      } catch (error) {
        debugLog("calculate_wait_time_error", { error: error.message }, "error");
        setEstimatedWaitTime("Unknown");
      }
    },
    [debugLog]
  );

  const cleanupMatching = useCallback(async () => {
    debugLog("cleanup_start");

    // Clear all timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      debugLog("match_timeout_cleared");
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
      debugLog("retry_timeout_cleared");
    }

    // Unsubscribe from Firestore listener
    if (unsubscribeRef.current) {
      try {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
        debugLog("firestore_listener_unsubscribed");
      } catch (error) {
        debugLog("unsubscribe_error", { error: error.message }, "error");
      }
    }

    // Remove user from queue if they were added
    const currentMatchData = matchDataRef.current;
    if (currentMatchData?.queueDocId && userInfo?.uid) {
      try {
        await firestoreService.removeFromQueue(currentMatchData.queueDocId);
        debugLog("removed_from_queue_success", { queueDocId: currentMatchData.queueDocId });
      } catch (error) {
        debugLog("remove_from_queue_error", { error: error.message }, "error");
      }
    }

    // Reset all states if component is still mounted
    if (isMountedRef.current) {
      setIsMatching(false);
      setMatchData(null);
      setMatchingStatus("idle");
      setEstimatedWaitTime(null);
      debugLog("matching_states_reset");
    } else {
        debugLog("matching_states_reset_skipped_unmounted");
    }

    matchDataRef.current = null; // Clear the ref explicitly
    debugLog("cleanup_completed");
  }, [userInfo?.uid, debugLog]);

  const stopMatching = useCallback(async () => {
    if (!isMountedRef.current) {
      debugLog("stop_matching_skipped_unmounted");
      return;
    }
    debugLog("stop_matching_start");
    setMatchingStatus("idle"); // Update status first to prevent race conditions on match found
    await cleanupMatching();
    debugLog("stop_matching_completed");
  }, [cleanupMatching, debugLog]);

  const handleMatchFound = useCallback(
    async (match, userType, ventText, selectedPlan) => {
      debugLog("match_found_start", {
        matchUserId: match.userId,
        userType,
        currentStatus: matchingStatus // Log current status for debugging
      });

      // Prevent processing if not mounted or if matching status has changed
      // (e.g., another match was already found or stopped)
      if (!isMountedRef.current || matchingStatus !== "searching") {
        debugLog(
          "match_found_aborted",
          {
            reason: !isMountedRef.current ? "component_unmounted" : `status_not_searching (${matchingStatus})`,
          },
          "warn"
        );
        return;
      }

      setMatchingStatus("found"); // Indicate that a match is being processed

      try {
        const currentQueueData = matchDataRef.current; // Get the most recent queue data from ref
        if (!currentQueueData || !currentQueueData.queueDocId) {
          throw new Error("No valid queue data available for session creation.");
        }

        debugLog("creating_session", { userType, venterQueueDoc: userType === 'venter' ? currentQueueData.queueDocId : match.docId, listenerQueueDoc: userType === 'listener' ? currentQueueData.queueDocId : match.docId });

        let session;
        if (userType === "venter") {
          session = await firestoreService.createSession(
            userInfo.uid, // venterId
            match.userId, // listenerId
            currentQueueData.queueDocId, // venterQueueDocId
            match.docId, // listenerQueueDocId
            ventText,
            selectedPlan
          );
        } else {
          session = await firestoreService.createSession(
            match.userId, // venterId (from the match)
            userInfo.uid, // listenerId
            match.docId, // venterQueueDocId (from the match)
            currentQueueData.queueDocId, // listenerQueueDocId
            match.ventText,
            match.plan || "20-Min Vent" // Fallback plan
          );
        }

        debugLog("session_created_success", {
          sessionId: session.sessionId,
          channelName: session.channelName,
        });

        // Cleanup before navigation
        await cleanupMatching();

        const navigationParams = {
          pathname: "/voice-call",
          params: {
            ventText: userType === "venter" ? ventText : match.ventText,
            plan: userType === "venter" ? selectedPlan : match.plan || "20-Min Vent",
            channelName: session.channelName,
            isHost: (userType === "venter").toString(), // Pass as string for navigation params
            sessionId: session.sessionId,
          },
        };

        debugLog("navigating_to_voice_call", { params: navigationParams.params });
        router.push(navigationParams);
      } catch (error) {
        debugLog("match_processing_error", { error: error.message }, "error");

        if (isMountedRef.current) {
          setMatchingStatus("failed");
          Alert.alert("Connection Failed", "Failed to connect with your match. Please try again.", [
            { text: "Try Again", onPress: () => startMatching(userType, ventText, selectedPlan) }, // Offer to retry
            { text: "Cancel", onPress: () => stopMatching(), style: "cancel" },
          ]);
        }
        await stopMatching(); // Ensure full cleanup
      }
    },
    [userInfo?.uid, matchingStatus, cleanupMatching, stopMatching, debugLog]
  );

  const startMatching = useCallback(
    async (userType, ventText = null, selectedPlan = null) => {
      debugLog("start_matching_begin", { userType });

      // Validation checks
      if (!userInfo?.uid) {
        debugLog("start_matching_failed", { reason: "no_user_id" }, "error");
        Alert.alert("Authentication Required", "Please sign in to continue.");
        return false;
      }

      if (isMatching) {
        debugLog("start_matching_failed", { reason: "already_matching" }, "warn");
        Alert.alert("Already Matching", "You are already in the matching queue.");
        return false;
      }

      // Validate venter input
      if (userType === "venter") {
        if (!ventText || ventText.trim().length === 0) {
          debugLog("start_matching_failed", { reason: "no_vent_text" }, "error");
          Alert.alert("Input Required", "Please provide a brief description of what you want to vent about.");
          return false;
        }
        if (!selectedPlan) {
          debugLog("start_matching_failed", { reason: "no_plan_selected" }, "error");
          Alert.alert("Plan Required", "Please select a plan for your vent session.");
          return false;
        }
      }

      // Ensure a clean slate before starting
      await cleanupMatching();

      try {
        setIsMatching(true);
        setMatchingStatus("searching");
        setMatchData(null); // Clear previous match data
        matchDataRef.current = null; // Also clear the ref

        await calculateEstimatedWaitTime(userType);

        debugLog("adding_to_queue", { userType });
        let queueData;
        if (userType === "venter") {
          queueData = await firestoreService.addToQueue(userInfo.uid, "venter", ventText.trim(), selectedPlan);
        } else {
          queueData = await firestoreService.addToQueue(userInfo.uid, "listener");
        }

        debugLog("added_to_queue_success", { queueDocId: queueData?.queueDocId });
        setMatchData(queueData);
        matchDataRef.current = queueData; // Keep ref updated immediately

        const oppositeType = userType === "venter" ? "listener" : "venter";

        // Listen for potential matches
        unsubscribeRef.current = firestoreService.listenToQueue(oppositeType, async (matches) => {
          if (!isMountedRef.current || matchingStatus !== "searching") {
            debugLog("listener_callback_skipped", { reason: !isMountedRef.current ? "unmounted" : `status_not_searching (${matchingStatus})` }, "warn");
            return;
          }

          if (matches.length > 0) {
            const match = matches[0]; // Take the first available match
            debugLog("potential_match_found_in_listener", { matchUserId: match.userId });
            await handleMatchFound(match, userType, ventText, selectedPlan);
          }
        });

        // Set timeout for no match found (5 minutes)
        timeoutRef.current = setTimeout(async () => {
          if (isMountedRef.current && matchingStatus === "searching") {
            setMatchingStatus("failed");
            debugLog("no_match_timeout_reached");

            Alert.alert(
              "No Match Found",
              "We couldn't find a match for you at this moment. This might be because there aren't enough people online right now.",
              [
                {
                  text: "Try Again",
                  onPress: () => {
                    // Introduce a small delay before retrying to allow UI to update and prevent rapid retries
                    retryTimeoutRef.current = setTimeout(() => {
                      startMatching(userType, ventText, selectedPlan);
                    }, 2000); // 2-second delay before re-initiating match
                  },
                },
                { text: "Cancel", onPress: () => stopMatching(), style: "cancel" },
              ]
            );
          }
        }, 300000); // 5 minutes (300,000 milliseconds)

        debugLog("start_matching_success");
        return true;
      } catch (error) {
        debugLog("start_matching_error", { error: error.message, stack: error.stack }, "error");

        if (isMountedRef.current) {
          setMatchingStatus("failed");
          Alert.alert(
            "Matching Error",
            `Failed to start matching: ${error.message}. Please check your internet connection and try again.`,
            [{ text: "OK", onPress: () => stopMatching() }]
          );
        }

        await stopMatching(); // Ensure full cleanup on error
        return false;
      }
    },
    [
      userInfo?.uid,
      isMatching,
      matchingStatus,
      cleanupMatching,
      calculateEstimatedWaitTime,
      handleMatchFound,
      stopMatching,
      debugLog,
    ]
  );

  // --- Cleanup on unmount ---
  useEffect(() => {
    isMountedRef.current = true;
    debugLog("component_mounted");

    return () => {
      debugLog("component_unmounting");
      isMountedRef.current = false;
      // Ensure cleanup runs when the component unmounts
      cleanupMatching();
    };
  }, [cleanupMatching, debugLog]);

  return {
    isMatching,
    matchData,
    matchingStatus,
    estimatedWaitTime,
    startMatching,
    stopMatching,
  };
};

export default useMatching;