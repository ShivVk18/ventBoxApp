"use client"

import { useState, useEffect, useCallback } from "react"
import firestoreService from "../services/firestoreService"

const useQueue = () => {
  const [queueStats, setQueueStats] = useState({
    ventersWaiting: 0,
    listenersWaiting: 0,
    activeSessions: 0,
  })
  const [loading, setLoading] = useState(true)

  const loadQueueStats = useCallback(async () => {
    try {
      setLoading(true)
      const stats = await firestoreService.getQueueStats()
      setQueueStats(stats)
    } catch (error) {
      console.error("Load queue stats error:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadQueueStats()
    const interval = setInterval(loadQueueStats, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [loadQueueStats])

  return { queueStats, loading, refreshStats: loadQueueStats }
}

export default useQueue
