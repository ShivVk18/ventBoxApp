// Database seeding script for development/testing
import { db } from "../config/firebase"
import { collection, addDoc, doc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore"
import IdGenerator from "../utils/IdGenerator"

class DatabaseSeeder {
  async seedDatabase() {
    try {
      console.log("🌱 Seeding VentBox Database...")

      // Seed stats
      await this.seedStats()

      // Seed sample sessions
      await this.seedSessions()

      // Seed queue data (for testing)
      await this.seedQueue()

      console.log("✅ Database seeded successfully!")
    } catch (error) {
      console.error("❌ Database seeding failed:", error)
      throw error
    }
  }

  async seedStats() {
    const statsRef = doc(db, "stats", "queue")

    const stats = {
      ventersWaiting: 2,
      listenersWaiting: 5,
      activeSessions: 3,
      totalSessions: 147,
      totalUsers: 89,
      lastUpdated: serverTimestamp(),
      dailyStats: {
        sessionsToday: 12,
        newUsersToday: 3,
        averageSessionLength: 18.5,
      },
    }

    await setDoc(statsRef, stats)
    console.log("📊 Stats seeded")
  }

  async seedSessions() {
    const sessionsRef = collection(db, "sessions")

    const sampleSessions = [
      {
        sessionId: await IdGenerator.generateSessionId(),
        venterId: await IdGenerator.generateUserId(),
        listenerId: await IdGenerator.generateUserId(),
        ventText: "I'm feeling overwhelmed with work and need someone to listen",
        channelName: await IdGenerator.generateChannelName(),
        startTime: Timestamp.fromDate(new Date(Date.now() - 3600000)), // 1 hour ago
        endTime: Timestamp.fromDate(new Date(Date.now() - 2400000)), // 40 mins ago
        duration: 1200, // 20 minutes
        status: "completed",
        plan: "20-Min Vent",
      },
      {
        sessionId: await IdGenerator.generateSessionId(),
        venterId: await IdGenerator.generateUserId(),
        listenerId: await IdGenerator.generateUserId(),
        ventText: "Having relationship issues and need to talk it out",
        channelName: await IdGenerator.generateChannelName(),
        startTime: Timestamp.fromDate(new Date(Date.now() - 7200000)), // 2 hours ago
        endTime: Timestamp.fromDate(new Date(Date.now() - 6600000)), // 1h 50m ago
        duration: 600, // 10 minutes
        status: "completed",
        plan: "10-Min Vent",
      },
      {
        sessionId: await IdGenerator.generateSessionId(),
        venterId: await IdGenerator.generateUserId(),
        listenerId: await IdGenerator.generateUserId(),
        ventText: "Stressed about upcoming exams and future career",
        channelName: await IdGenerator.generateChannelName(),
        startTime: serverTimestamp(),
        endTime: null,
        duration: 0,
        status: "active",
        plan: "30-Min Vent",
      },
    ]

    for (const session of sampleSessions) {
      await addDoc(sessionsRef, session)
    }

    console.log("📝 Sample sessions seeded")
  }

  async seedQueue() {
    const queueRef = collection(db, "queue")

    const queueItems = [
      {
        userId: await IdGenerator.generateUserId(),
        userType: "venter",
        ventText: "Need to talk about family stress",
        timestamp: serverTimestamp(),
        status: "waiting",
        sessionId: await IdGenerator.generateSessionId(),
      },
      {
        userId: await IdGenerator.generateUserId(),
        userType: "listener",
        ventText: null,
        timestamp: serverTimestamp(),
        status: "waiting",
        sessionId: await IdGenerator.generateSessionId(),
      },
    ]

    for (const item of queueItems) {
      await addDoc(queueRef, item)
    }

    console.log("⏳ Queue data seeded")
  }

  // Clear all data (for testing)
  async clearDatabase() {
    console.log("🧹 Clearing database...")
    // Note: In production, you'd implement proper cleanup
    console.log("⚠️ Manual cleanup required in Firebase Console")
  }
}

export default new DatabaseSeeder()
