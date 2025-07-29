import { useState, useCallback, useRef, useEffect } from "react"
import { Alert } from "react-native"
import { router } from "expo-router"
import firestoreService from "../services/firestoreService"
import { useAuth } from "../context/AuthContext"

const useMatching = () => {
  const [isMatching, setIsMatching] = useState(false)
  const [matchData, setMatchData] = useState(null)
  const unsubscribeRef = useRef(null) 
  const timeoutRef = useRef(null) 
  const { userInfo } = useAuth()

 
  const stopMatching = useCallback(async () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current() 
      unsubscribeRef.current = null
      console.log("Matching: Firestore listener unsubscribed.")
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current) // Clear the no-match timeout
      timeoutRef.current = null
      console.log("Matching: No-match timeout cleared.")
    }

    if (matchData?.queueDocId && userInfo?.uid) {
      try {
        await firestoreService.removeFromQueue(matchData.queueDocId)
        console.log("Matching: Removed user from queue:", matchData.queueDocId)
      } catch (error) {
        console.error("Matching: Error removing from queue during stopMatching:", error)
        // Alert.alert("Error", "Failed to remove you from the queue. Please try again.");
      }
    }

    setIsMatching(false)
    setMatchData(null)
    console.log("Matching: Stopped matching process.")
  }, [matchData, userInfo]) // Dependencies for useCallback

  const startMatching = useCallback(
    async (userType, ventText = null, selectedPlan = null) => { 
      if (!userInfo?.uid) {
        Alert.alert("Authentication Required", "Please sign in to continue.")
        return false
      }

      if (isMatching) {
        Alert.alert("Already Matching", "You are already in the matching queue.")
        return false
      }

      // Ensure cleanup from any previous, failed, or interrupted matching attempts
      await stopMatching();

      try {
        setIsMatching(true)
        setMatchData(null) // Reset match data at start

        let queueData
        if (userType === "venter") {
          if (!ventText || ventText.trim().length === 0) {
            Alert.alert("Input Required", "Please provide a brief description of what you want to vent about.")
            setIsMatching(false)
            return false
          }
          queueData = await firestoreService.addToQueue(userInfo.uid, "venter", ventText.trim())
          console.log("Matching: Venter added to queue:", queueData.queueDocId)
        } else { // userType === "listener"
          queueData = await firestoreService.addToQueue(userInfo.uid, "listener")
          console.log("Matching: Listener added to queue:", queueData.queueDocId)
        }

        setMatchData(queueData) // Store queueDocId for later removal

        const oppositeType = userType === "venter" ? "listener" : "venter"

        // Setup a Firestore listener to find a match
        unsubscribeRef.current = firestoreService.listenToQueue(oppositeType, async (matches) => {
          console.log(`Matching: Found ${matches.length} potential ${oppositeType} matches.`)
          if (matches.length > 0) {
            const match = matches[0] // Take the first available match
            console.log("Matching: Found a match:", match.userId)

            try {
              let session
              if (userType === "venter") {
                // Venter creates session with listener's details
                session = await firestoreService.createSession(
                  userInfo.uid,
                  match.userId,
                  queueData.queueDocId, // venter's queue doc ID
                  match.docId,          // listener's queue doc ID
                  ventText,
                  selectedPlan          // Pass selectedPlan for venter
                )
              } else { // userType === "listener"
                // Listener creates session with venter's details
                session = await firestoreService.createSession(
                  match.userId,         // venter's userId
                  userInfo.uid,
                  match.docId,          // venter's queue doc ID
                  queueData.queueDocId, // listener's queue doc ID
                  match.ventText,
                  match.plan            // Listener gets the venter's selected plan
                )
              }

              console.log("Matching: Session created:", session.sessionId, "Channel:", session.channelName)

              // IMPORTANT: Clean up matching state before navigating
              await stopMatching()

              // Navigate to voice call screen
              router.push({
                pathname: "/voice-call",
                params: {
                  ventText: userType === "venter" ? ventText : match.ventText,
                  plan: userType === "venter" ? selectedPlan : match.plan, // Pass the selected plan
                  channelName: session.channelName,
                  isHost: userType === "venter", // Venter is typically the "host" in P2P session setup
                  sessionId: session.sessionId,
                },
              })
            } catch (error) {
              console.error("Matching: Session creation or navigation error:", error)
              Alert.alert("Error", "Failed to connect with match. Please try again.")
              await stopMatching() // Ensure cleanup on session creation error
            }
          }
        })

        // Set a timeout for no match found
        timeoutRef.current = setTimeout(async () => {
          Alert.alert("No Match Found", "We couldn't find a match for you at this moment. Please try again later.", [
            { text: "OK", onPress: () => stopMatching() } // Ensure stopMatching is called
          ])
        }, 300000) // 5 minutes timeout

        return true
      } catch (error) {
        console.error("Matching: Error starting matching process:", error)
        Alert.alert("Error", `Failed to start matching: ${error.message}. Please try again.`)
        await stopMatching() // Ensure cleanup if initial matching setup fails
        return false
      }
    },
    [userInfo, stopMatching, isMatching], 
  )

 
  useEffect(() => {
    return () => {
    
      stopMatching();
    };
  }, [stopMatching]);

  return { isMatching, matchData, startMatching, stopMatching }
}

export default useMatching