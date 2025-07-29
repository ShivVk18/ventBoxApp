"use client"

import { useState, useEffect } from "react"
import { db } from "../config/firebase"
import { doc, onSnapshot } from "firebase/firestore"
import DatabaseInitializer from "../scripts/initializeDatabase"

const useDatabase = () => {
  const [dbStatus, setDbStatus] = useState("checking")
  const [error, setError] = useState(null)

  useEffect(() => {
    checkDatabaseStatus()
  }, [])

  const checkDatabaseStatus = async () => {
    try {
      // Check if stats document exists
      const statsRef = doc(db, "stats", "queue")

      const unsubscribe = onSnapshot(
        statsRef,
        (doc) => {
          if (doc.exists()) {
            setDbStatus("ready")
            console.log("✅ Database is ready")
          } else {
            setDbStatus("needs_init")
            console.log("⚠️ Database needs initialization")
          }
        },
        (error) => {
          console.error("❌ Database connection error:", error)
          setError(error.message)
          setDbStatus("error")
        },
      )

      return unsubscribe
    } catch (error) {
      console.error("❌ Database check failed:", error)
      setError(error.message)
      setDbStatus("error")
    }
  }

  const initializeDatabase = async () => {
    try {
      setDbStatus("initializing")
      await DatabaseInitializer.initializeDatabase()
      setDbStatus("ready")
    } catch (error) {
      console.error("❌ Database initialization failed:", error)
      setError(error.message)
      setDbStatus("error")
    }
  }

  return {
    dbStatus,
    error,
    initializeDatabase,
    isReady: dbStatus === "ready",
    needsInit: dbStatus === "needs_init",
  }
}

export default useDatabase
