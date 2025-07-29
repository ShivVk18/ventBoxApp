// Complete Firebase setup script
import { db } from "../config/firebase"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"

class FirebaseSetup {
  async setupDatabase() {
    try {
      console.log("🔥 Setting up Firebase Database...")

      // 1. Create stats document
      await this.createStatsDocument()

      // 2. Log security rules
      this.logSecurityRules()

      // 3. Log index creation
      this.logIndexCreation()

      console.log("✅ Firebase setup complete!")
    } catch (error) {
      console.error("❌ Firebase setup failed:", error)
      throw error
    }
  }

  async createStatsDocument() {
    try {
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

      // Use setDoc to create/overwrite the document
      await setDoc(statsRef, initialStats)
      console.log("📊 Stats document created successfully")
    } catch (error) {
      console.error("❌ Failed to create stats document:", error)
      throw error
    }
  }

  logSecurityRules() {
    console.log(`
🔒 FIREBASE SECURITY RULES - Copy to Firebase Console:

Go to: https://console.firebase.google.com/project/ventbox-73392/firestore/rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all reads and writes (for development)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}

⚠️  WARNING: These are development rules - make them more secure for production!
    `)
  }

  logIndexCreation() {
    console.log(`
📋 FIRESTORE INDEXES - Create these in Firebase Console:

1. Go to: https://console.firebase.google.com/project/ventbox-73392/firestore/indexes

2. Create Composite Index for 'queue' collection:
   - Collection ID: queue
   - Fields:
     * userType (Ascending)
     * status (Ascending) 
     * timestamp (Ascending)

3. Or click this direct link:
   https://console.firebase.google.com/v1/r/project/ventbox-73392/firestore/indexes?create_composite=Cktwcm9qZWN0cy92ZW50Ym94LTczMzkyL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9xdWV1ZS9pbmRleGVzL18QARoKCgZzdGF0dXMQARoMCgh1c2VyVHlwZRABGg0KCXRpbWVzdGFtcBABGgwKCF9fbmFtZV9fEAE
    `)
  }
}

export default new FirebaseSetup()

// Auto-run if called directly
if (typeof require !== "undefined" && require.main === module) {
  const setup = new FirebaseSetup()
  setup.setupDatabase()
}