class Logger {
  static log(message, data = null) {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] VentBox:`, message, data || "")

    // Also log to a file or remote service if needed
    this.logToFile(message, data)
  }

  static error(message, error = null) {
    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] VentBox ERROR:`, message, error || "")

    // Log error details
    if (error) {
      console.error("Error stack:", error.stack)
      console.error("Error message:", error.message)
    }

    this.logToFile(`ERROR: ${message}`, error)
  }

  static warn(message, data = null) {
    const timestamp = new Date().toISOString()
    console.warn(`[${timestamp}] VentBox WARNING:`, message, data || "")
    this.logToFile(`WARNING: ${message}`, data)
  }

  static logToFile(message, data) {
    // In a real app, you might want to save logs to AsyncStorage
    // or send to a remote logging service like Sentry
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        message,
        data: data ? JSON.stringify(data) : null,
      }

      // For now, just console log
      // In production, implement proper logging
    } catch (err) {
      console.error("Logging failed:", err)
    }
  }

  // Firebase specific logging
  static firebaseError(operation, error) {
    this.error(`Firebase ${operation} failed`, {
      code: error.code,
      message: error.message,
      stack: error.stack,
    })
  }

  // Auth specific logging
  static authError(operation, error) {
    this.error(`Auth ${operation} failed`, {
      code: error.code,
      message: error.message,
      uid: error.uid || "unknown",
    })
  }
}

export default Logger
