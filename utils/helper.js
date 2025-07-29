// Utility helper functions
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

export const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  return `${minutes} minute${minutes !== 1 ? "s" : ""}`
}

export const validateVentText = (text) => {
  if (!text || typeof text !== "string") {
    return { isValid: false, error: "Vent text is required" }
  }

  const trimmedText = text.trim()

  if (trimmedText.length === 0) {
    return { isValid: false, error: "Please write something before submitting" }
  }

  if (trimmedText.length < 10) {
    return { isValid: false, error: "Please write at least 10 characters" }
  }

  if (trimmedText.length > 500) {
    return { isValid: false, error: "Vent text must be less than 500 characters" }
  }

  return { isValid: true, error: null }
}

export const getTimeColor = (timeRemaining) => {
  if (timeRemaining <= 60) return "#ef4444"
  if (timeRemaining <= 300) return "#f59e0b" 
  return "#4ade80" 
}

export const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

