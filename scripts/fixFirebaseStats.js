/// Script to fix Firebase stats document
import { db } from "../config/firebase"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"

class FirebaseStatsFixer {
  async createStatsDocument() {
    try {
      console.log("🔧 Creating Firebase stats document...")

      const statsRef = doc(db, "stats", "queue")

      const initialStats = {
        ventersWaiting: 0,
        listenersWaiting: 0,
        activeSessions: 0,
        totalSessions: 0,
        totalUsers: 0,
        lastUpdated: serverTimestamp(),
        createdAt: serverTimestamp(),
        dailyStats: {
          sessionsToday: 0,
          newUsersToday: 0,
          averageSessionLength: 0,
        },
      }

      // Use setDoc to create the document
      await setDoc(statsRef, initialStats, { merge: true })

      console.log("✅ Stats document created successfully!")
      return true
    } catch (error) {
      console.error("❌ Failed to create stats document:", error)
      return false
    }
  }

  async checkAndFixStats() {
    try {
      console.log("🔍 Checking Firebase stats...")

      const { getDoc } = await import("firebase/firestore")
      const statsRef = doc(db, "stats", "queue")
      const statsDoc = await getDoc(statsRef)

      if (!statsDoc.exists()) {
        console.log("📝 Stats document doesn't exist, creating...")
        return await this.createStatsDocument()
      } else {
        console.log("✅ Stats document already exists")
        return true
      }
    } catch (error) {
      console.error("❌ Error checking stats:", error)
      // Try to create anyway
      return await this.createStatsDocument()
    }
  }
}

export default new FirebaseStatsFixer()
