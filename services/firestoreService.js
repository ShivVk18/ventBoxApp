import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore"
import { Alert } from "react-native"
import { app } from "../config/firebase.config"
import { FIREBASE_COLLECTIONS } from "../utils/constants"
import { generateChannelName } from "../config/agora.config"

const db = getFirestore(app)

// Minimal debug logging - only for errors and critical operations
const debugLog = (action, data = {}, level = "info") => {
  // Only log errors and critical operations to reduce noise
  if (level === "error" || ["create_session_success", "end_session_success"].includes(action)) {
    const timestamp = new Date().toISOString()
    const logData = {
      timestamp,
      service: "firestoreService",
      action,
      ...data,
    }

    const logMessage = `🔥 [Firestore] ${action}`

    if (level === "error") {
      console.error(logMessage, logData)
    } else {
      console.log(logMessage, logData)
    }
  }
}

const firestoreService = {
  db,

  /**
   * Add user to matching queue
   */
  async addToQueue(userId, userType, ventText = null, selectedPlan = null) {
    try {
      const queueRef = collection(db, FIREBASE_COLLECTIONS.QUEUE)

      const docData = {
        userId,
        userType,
        timestamp: serverTimestamp(),
        status: "waiting",
        createdAt: new Date().toISOString(),
        retryCount: 0,
      }

      // Add venter-specific data
      if (userType === "venter") {
        if (!ventText || ventText.trim().length === 0) {
          throw new Error("Venter must provide vent text")
        }
        if (!selectedPlan) {
          throw new Error("Venter must select a plan")
        }

        docData.ventText = ventText.trim()
        docData.plan = selectedPlan
        docData.priority = "normal"
      }

      // Add listener-specific data
      if (userType === "listener") {
        docData.availability = "active"
        docData.sessionCount = 0
      }

      const docRef = await addDoc(queueRef, docData)

      return {
        queueDocId: docRef.id,
        userId,
        userType,
        ventText: docData.ventText,
        plan: docData.plan,
      }
    } catch (error) {
      debugLog("add_to_queue_error", { error: error.message, userId, userType }, "error")
      throw new Error(`Failed to join queue: ${error.message}`)
    }
  },

  /**
   * Remove user from queue
   */
  async removeFromQueue(queueDocId) {
    try {
      const queueDocRef = doc(db, FIREBASE_COLLECTIONS.QUEUE, queueDocId)
      const docSnap = await getDoc(queueDocRef)

      if (!docSnap.exists()) {
        return
      }

      await deleteDoc(queueDocRef)
    } catch (error) {
      debugLog("remove_from_queue_error", { error: error.message, queueDocId }, "error")
      // Don't throw here as this is cleanup
    }
  },

  /**
   * Listen for matches in queue
   */
  listenToQueue(oppositeUserType, callback) {
    try {
      const q = query(
        collection(db, FIREBASE_COLLECTIONS.QUEUE),
        where("userType", "==", oppositeUserType),
        where("status", "==", "waiting"),
        orderBy("timestamp", "asc"),
        limit(10),
      )

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          try {
            const matches = []

            snapshot.forEach((doc) => {
              const data = doc.data()
              const match = {
                docId: doc.id,
                ...data,
                timestamp: data.timestamp?.toDate() || new Date(data.createdAt),
              }
              matches.push(match)
            })

            callback(matches)
          } catch (error) {
            debugLog("snapshot_processing_error", { error: error.message }, "error")
            callback([])
          }
        },
        (error) => {
          debugLog("snapshot_listener_error", { error: error.message, code: error.code }, "error")

          let errorMessage = "Failed to get real-time updates for matching."
          if (error.code === "permission-denied") {
            errorMessage = "Permission denied. Please check your account status."
          } else if (error.code === "unavailable") {
            errorMessage = "Service temporarily unavailable. Please check your internet connection."
          }

          Alert.alert("Queue Error", errorMessage)
          callback([])
        },
      )

      return unsubscribe
    } catch (error) {
      debugLog("listen_to_queue_setup_error", { error: error.message, oppositeUserType }, "error")
      throw new Error(`Failed to set up matching: ${error.message}`)
    }
  },

  /**
   * Create a new session between matched users
   */
  async createSession(venterId, listenerId, venterQueueDocId, listenerQueueDocId, ventText, plan) {
    const batch = writeBatch(db)

    try {
      const channelName = await generateChannelName()
      const sessionRef = doc(collection(db, FIREBASE_COLLECTIONS.SESSIONS))
      const timestamp = serverTimestamp()

      const newSession = {
        venterId,
        listenerId,
        ventText: ventText || "",
        plan: plan || "20-Min Vent",
        channelName,
        startTime: timestamp,
        endTime: null,
        status: "active",
        durationSeconds: 0,
        venterQueueDocId,
        listenerQueueDocId,
        createdAt: new Date().toISOString(),
        endType: null,
        sessionVersion: "1.0",
        platform: "react-native",
      }

      // Add session document
      batch.set(sessionRef, newSession)

      // Update queue documents to matched status
      const venterQueueRef = doc(db, FIREBASE_COLLECTIONS.QUEUE, venterQueueDocId)
      const listenerQueueRef = doc(db, FIREBASE_COLLECTIONS.QUEUE, listenerQueueDocId)

      batch.update(venterQueueRef, {
        status: "matched",
        sessionId: sessionRef.id,
        matchedAt: timestamp,
      })

      batch.update(listenerQueueRef, {
        status: "matched",
        sessionId: sessionRef.id,
        matchedAt: timestamp,
      })

      // Commit all changes atomically
      await batch.commit()

      debugLog("create_session_success", {
        sessionId: sessionRef.id,
        channelName,
      })

      return {
        sessionId: sessionRef.id,
        channelName,
        ...newSession,
        startTime: new Date(),
      }
    } catch (error) {
      debugLog("create_session_error", { error: error.message, code: error.code }, "error")
      throw new Error(`Failed to create session: ${error.message}`)
    }
  },

  /**
   * End an active session
   */
  async endSession(sessionId, durationSeconds, endType = "manual-ended") {
    const batch = writeBatch(db)

    try {
      const sessionDocRef = doc(db, FIREBASE_COLLECTIONS.SESSIONS, sessionId)
      const sessionDoc = await getDoc(sessionDocRef)

      if (!sessionDoc.exists()) {
        return
      }

      const sessionData = sessionDoc.data()

      // Update session document
      const updateData = {
        endTime: serverTimestamp(),
        status: "ended",
        durationSeconds: Math.floor(durationSeconds || 0),
        endType: endType,
        endedAt: new Date().toISOString(),
      }

      batch.update(sessionDocRef, updateData)

      // Clean up queue documents
      const cleanupPromises = []

      if (sessionData.venterQueueDocId) {
        const venterQueueRef = doc(db, FIREBASE_COLLECTIONS.QUEUE, sessionData.venterQueueDocId)
        cleanupPromises.push(
          getDoc(venterQueueRef)
            .then((doc) => {
              if (doc.exists() && doc.data().status === "matched") {
                batch.delete(venterQueueRef)
              }
            })
            .catch((e) => console.warn("Venter queue cleanup warning:", e.message)),
        )
      }

      if (sessionData.listenerQueueDocId) {
        const listenerQueueRef = doc(db, FIREBASE_COLLECTIONS.QUEUE, sessionData.listenerQueueDocId)
        cleanupPromises.push(
          getDoc(listenerQueueRef)
            .then((doc) => {
              if (doc.exists() && doc.data().status === "matched") {
                batch.delete(listenerQueueRef)
              }
            })
            .catch((e) => console.warn("Listener queue cleanup warning:", e.message)),
        )
      }

      // Wait for cleanup checks
      await Promise.all(cleanupPromises)

      // Commit all changes
      await batch.commit()

      debugLog("end_session_success", { sessionId, endType, durationSeconds })
    } catch (error) {
      debugLog("end_session_error", { error: error.message, code: error.code, sessionId }, "error")
      throw new Error(`Failed to end session: ${error.message}`)
    }
  },

  /**
   * Get current queue statistics
   */
  async getQueueStats() {
    try {
      const queueRef = collection(db, FIREBASE_COLLECTIONS.QUEUE)
      const sessionsRef = collection(db, FIREBASE_COLLECTIONS.SESSIONS)

      // Create queries
      const ventersQuery = query(queueRef, where("userType", "==", "venter"), where("status", "==", "waiting"))
      const listenersQuery = query(queueRef, where("userType", "==", "listener"), where("status", "==", "waiting"))
      const activeSessionsQuery = query(sessionsRef, where("status", "==", "active"))

      // Execute queries in parallel
      const [ventersSnapshot, listenersSnapshot, activeSessionsSnapshot] = await Promise.all([
        getDocs(ventersQuery),
        getDocs(listenersQuery),
        getDocs(activeSessionsQuery),
      ])

      const stats = {
        ventersWaiting: ventersSnapshot.size,
        listenersWaiting: listenersSnapshot.size,
        activeSessions: activeSessionsSnapshot.size,
        lastUpdated: new Date().toISOString(),
      }

      return stats
    } catch (error) {
      debugLog("get_queue_stats_error", { error: error.message, code: error.code }, "error")

      // Return fallback stats instead of throwing
      return {
        ventersWaiting: 0,
        listenersWaiting: 0,
        activeSessions: 0,
        lastUpdated: new Date().toISOString(),
        error: error.message,
      }
    }
  },

  /**
   * Clean up stale queue entries (older than 10 minutes)
   */
  async cleanupStaleQueueEntries() {
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
      const queueRef = collection(db, FIREBASE_COLLECTIONS.QUEUE)

      const staleQuery = query(
        queueRef,
        where("status", "==", "waiting"),
        where("createdAt", "<", tenMinutesAgo.toISOString()),
      )

      const staleSnapshot = await getDocs(staleQuery)

      if (staleSnapshot.size === 0) {
        return
      }

      const batch = writeBatch(db)

      staleSnapshot.forEach((doc) => {
        batch.delete(doc.ref)
      })

      await batch.commit()
    } catch (error) {
      debugLog("cleanup_stale_entries_error", { error: error.message, code: error.code }, "error")
    }
  },
}

export default firestoreService
