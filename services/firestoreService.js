import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, query, where, onSnapshot, deleteDoc, getDocs } from 'firebase/firestore';
import { app } from '../config/firebase.config'; 
import { FIREBASE_COLLECTIONS } from '../utils/constants'; 
import { generateChannelName } from '../config/agora.config'; 

const db = getFirestore(app);

const firestoreService = {
  db, // Export db instance if other parts of the app need direct access

  async addToQueue(userId, userType, ventText = null) {
    try {
      const timestamp = new Date();
      const queueRef = collection(db, FIREBASE_COLLECTIONS.QUEUE);
      const docData = {
        userId,
        userType,
        timestamp,
        status: 'waiting', // New status field
      };

      if (userType === 'venter') {
        if (!ventText) throw new Error("Venter must provide vent text.");
        docData.ventText = ventText;
      }

      

      const docRef = await addDoc(queueRef, docData);
      console.log(`Firestore: Added ${userType} to queue with ID:`, docRef.id);
      return { queueDocId: docRef.id, userId, userType, ventText };
    } catch (error) {
      console.error("Firestore: Error adding to queue:", error);
      throw error; // Re-throw to be caught by useMatching
    }
  },

  async removeFromQueue(queueDocId) {
    try {
      const queueDocRef = doc(db, FIREBASE_COLLECTIONS.QUEUE, queueDocId);
      await deleteDoc(queueDocRef);
      console.log("Firestore: Removed from queue:", queueDocId);
    } catch (error) {
      console.error("Firestore: Error removing from queue:", error);
      // Don't necessarily re-throw here, as cleanup might tolerate this.
    }
  },

  // Listen for matches in the queue
  listenToQueue(oppositeUserType, callback) {
    console.log(`Firestore: Listening for ${oppositeUserType} in queue.`);
    const q = query(
      collection(db, FIREBASE_COLLECTIONS.QUEUE),
      where('userType', '==', oppositeUserType),
      where('status', '==', 'waiting') // Ensure only waiting users are matched
      // orderBy('timestamp', 'asc') // Order by timestamp to get oldest first
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const matches = snapshot.docs.map(doc => ({
        docId: doc.id,
        ...doc.data()
      }));
      callback(matches);
    }, (error) => {
      console.error("Firestore: Error listening to queue:", error);
      // Handle error, e.g., notify user
      Alert.alert("Queue Error", "Failed to get real-time updates for matching. Please check your internet.")
    });

    return unsubscribe;
  },

  async createSession(venterId, listenerId, venterQueueDocId, listenerQueueDocId, ventText, plan) {
    try {
      const channelName = await generateChannelName(); // Generate a unique Agora channel name
      const sessionRef = collection(db, FIREBASE_COLLECTIONS.SESSIONS);
      const timestamp = new Date();

      const newSession = {
        venterId,
        listenerId,
        ventText,
        plan, // Store the selected plan for the session
        channelName,
        startTime: timestamp,
        endTime: null,
        status: 'active', // 'active', 'ended', 'aborted'
        durationSeconds: 0,
        venterQueueDocId, // Link to queue documents for cleanup
        listenerQueueDocId,
      };

      const docRef = await addDoc(sessionRef, newSession);

      // Immediately update queue items to 'matched' to prevent double matching
      await updateDoc(doc(db, FIREBASE_COLLECTIONS.QUEUE, venterQueueDocId), { status: 'matched', sessionId: docRef.id });
      await updateDoc(doc(db, FIREBASE_COLLECTIONS.QUEUE, listenerQueueDocId), { status: 'matched', sessionId: docRef.id });

      console.log("Firestore: Created session:", docRef.id);
      return { sessionId: docRef.id, channelName, ...newSession };
    } catch (error) {
      console.error("Firestore: Error creating session:", error);
      throw error;
    }
  },

  async endSession(sessionId, durationSeconds, endType = 'manual-ended') {
    try {
      const sessionDocRef = doc(db, FIREBASE_COLLECTIONS.SESSIONS, sessionId);
      const sessionDoc = await getDoc(sessionDocRef);

      if (!sessionDoc.exists()) {
        console.warn("Firestore: Session not found for ending:", sessionId);
        return;
      }

      const sessionData = sessionDoc.data();
      const updateData = {
        endTime: new Date(),
        status: 'ended', // Mark as ended
        durationSeconds: Math.floor(durationSeconds), // Store rounded duration
        endType: endType, // 'auto-ended' or 'manual-ended'
      };

      await updateDoc(sessionDocRef, updateData);

      // Clean up related queue entries if they still exist and are marked 'matched'
      if (sessionData.venterQueueDocId) {
        const venterQueueRef = doc(db, FIREBASE_COLLECTIONS.QUEUE, sessionData.venterQueueDocId);
        try {
          const venterQueueDoc = await getDoc(venterQueueRef);
          if (venterQueueDoc.exists() && venterQueueDoc.data().status === 'matched') {
             await deleteDoc(venterQueueRef); // Or update status to 'completed'
          }
        } catch (e) { console.warn("Firestore: Venter queue cleanup failed:", e.message); }
      }
      if (sessionData.listenerQueueDocId) {
        const listenerQueueRef = doc(db, FIREBASE_COLLECTIONS.QUEUE, sessionData.listenerQueueDocId);
        try {
          const listenerQueueDoc = await getDoc(listenerQueueRef);
          if (listenerQueueDoc.exists() && listenerQueueDoc.data().status === 'matched') {
            await deleteDoc(listenerQueueRef); // Or update status to 'completed'
          }
        } catch (e) { console.warn("Firestore: Listener queue cleanup failed:", e.message); }
      }

      console.log("Firestore: Session ended:", sessionId);
    } catch (error) {
      console.error("Firestore: Error ending session:", error);
      throw error;
    }
  },

  async getQueueStats() {
    try {
      const queueRef = collection(db, FIREBASE_COLLECTIONS.QUEUE);
      const ventersQuery = query(queueRef, where('userType', '==', 'venter'), where('status', '==', 'waiting'));
      const listenersQuery = query(queueRef, where('userType', '==', 'listener'), where('status', '==', 'waiting'));
      const activeSessionsQuery = query(collection(db, FIREBASE_COLLECTIONS.SESSIONS), where('status', '==', 'active'));

      const [ventersSnapshot, listenersSnapshot, activeSessionsSnapshot] = await Promise.all([
        getDocs(ventersQuery),
        getDocs(listenersQuery),
        getDocs(activeSessionsQuery)
      ]);

      return {
        ventersWaiting: ventersSnapshot.size,
        listenersWaiting: listenersSnapshot.size,
        activeSessions: activeSessionsSnapshot.size,
      };
    } catch (error) {
      console.error("Firestore: Error getting queue stats:", error);
      return { ventersWaiting: 0, listenersWaiting: 0, activeSessions: 0 }; 
    }
  },

  
};

export default firestoreService;