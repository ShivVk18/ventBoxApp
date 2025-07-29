// Database initialization script
import { db } from "../config/firebase"
import { doc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore"

class DatabaseInitializer {
  // Initialize database collections and documents
  async initializeDatabase() {
    try {
      console.log("🔥 Initializing VentBox Database...")

      // 1. Initialize stats collection
      await this.initializeStats()

      // 2. Create sample data (for testing)
      await this.createSampleData()

      // 3. Set up security rules (instructions)
      this.logSecurityRulesInstructions()

      console.log("✅ Database initialized successfully!")
    } catch (error) {
      console.error("❌ Database initialization failed:", error)
      throw error
    }
  }

  // Initialize stats document
  async initializeStats() {
    const statsRef = doc(db, "stats", "queue")

    const initialStats = {
      ventersWaiting: 0,
      listenersWaiting: 0,
      activeSessions: 0,
      totalSessions: 0,
      totalUsers: 0,
      lastUpdated: serverTimestamp(),
      createdAt: serverTimestamp(),
    }

    await setDoc(statsRef, initialStats)
    console.log("📊 Stats collection initialized")
  }

  // Create sample data for testing
  async createSampleData() {
    // Sample session data
    const sessionsRef = collection(db, "sessions")

    const sampleSession = {
      sessionId: "sample_session_001",
      venterId: "sample_venter_001",
      listenerId: "sample_listener_001",
      ventText: "This is a sample vent for testing purposes",
      channelName: "ventbox_sample_channel",
      startTime: serverTimestamp(),
      endTime: null,
      duration: 0,
      status: "completed",
      plan: "20-Min Vent",
    }

    await addDoc(sessionsRef, sampleSession)
    console.log("📝 Sample session created")
  }

  // Log security rules instructions
  logSecurityRulesInstructions() {
    console.log(`
🔒 IMPORTANT: Set up Firestore Security Rules

Go to Firebase Console > Firestore Database > Rules and paste:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Queue collection - allow read/write for authenticated users
    match /queue/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Sessions collection - allow read/write for authenticated users
    match /sessions/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Stats collection - allow read for all, write for authenticated
    match /stats/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // User profiles (if you add them later)
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
    `)
  }
}

// Export for use
export default new DatabaseInitializer()

// Run initialization if called directly
if (typeof window === "undefined") {
  // Node.js environment
  const init = new DatabaseInitializer()
  init.initializeDatabase()
}
