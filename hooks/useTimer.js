import { useState, useEffect, useRef, useCallback } from "react"

const useTimer = (initialDuration, onTimeUp) => {
  const [sessionTime, setSessionTime] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(initialDuration)
  const [isActive, setIsActive] = useState(false)
  const intervalRef = useRef(null)
  const startTimeRef = useRef(null)
  const isMountedRef = useRef(true)

  const startTimer = useCallback(() => {
    if (!isActive && isMountedRef.current) {
      setIsActive(true)
      startTimeRef.current = Date.now() - sessionTime * 1000
    }
  }, [isActive, sessionTime])

  const stopTimer = useCallback(() => {
    if (isMountedRef.current) {
      setIsActive(false)
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (isActive && isMountedRef.current) {
      intervalRef.current = setInterval(() => {
        if (!isMountedRef.current) {
          clearInterval(intervalRef.current)
          return
        }

        const now = Date.now()
        const elapsed = Math.floor((now - startTimeRef.current) / 1000)

        setSessionTime(elapsed)

        const remaining = Math.max(0, initialDuration - elapsed)
        setTimeRemaining(remaining)

        if (remaining === 0) {
          stopTimer()
          onTimeUp?.()
        }
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isActive, initialDuration, onTimeUp, stopTimer])

  useEffect(() => {
    isMountedRef.current = true
    startTimer()
    return () => {
      isMountedRef.current = false
      stopTimer()
    }
  }, [])

  return { sessionTime, timeRemaining, isActive, startTimer, stopTimer }
}

export default useTimer
