import AsyncStorage from "@react-native-async-storage/async-storage"
import { Alert } from "react-native"

class ErrorLogger {
  constructor() {
    this.logs = []
    this.maxLogs = 1000
    this.logKey = "ventbox_error_logs"
    this.init()
  }

  async init() {
    try {
      // Load existing logs
      const savedLogs = await AsyncStorage.getItem(this.logKey)
      if (savedLogs) {
        this.logs = JSON.parse(savedLogs)
      }

      // Set up global error handlers
      this.setupGlobalErrorHandlers()
    } catch (error) {
      console.error("ErrorLogger init failed:", error)
    }
  }

  setupGlobalErrorHandlers() {
    // Catch unhandled JavaScript errors
    const originalConsoleError = console.error
    console.error = (...args) => {
      this.logError("CONSOLE_ERROR", args.join(" "), { args })
      originalConsoleError.apply(console, args)
    }

    // Catch unhandled promise rejections
    if (typeof window !== "undefined") {
      window.addEventListener("unhandledrejection", (event) => {
        this.logError("UNHANDLED_PROMISE_REJECTION", event.reason, {
          promise: event.promise,
          reason: event.reason,
        })
      })
    }

    // React Native specific error boundary
    const ErrorUtils = require("ErrorUtils")
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      this.logError("GLOBAL_ERROR", error.message, {
        stack: error.stack,
        isFatal,
        name: error.name,
      })

      if (isFatal) {
        Alert.alert("Critical Error", "App encountered a critical error. Logs have been saved for debugging.", [
          { text: "OK" },
        ])
      }
    })
  }

  // Main logging function
  async logError(type, message, details = {}) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      type,
      message: String(message),
      details: this.sanitizeDetails(details),
      deviceInfo: await this.getDeviceInfo(),
      appState: await this.getAppState(),
    }

    // Add to memory
    this.logs.unshift(logEntry)

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }

    // Save to storage
    await this.saveLogs()

    // Console log for development
    console.error(`[${type}] ${message}`, details)

    return logEntry
  }

  // Specific error types
  async logFirebaseError(operation, error) {
    return this.logError("FIREBASE_ERROR", `${operation} failed`, {
      code: error.code,
      message: error.message,
      stack: error.stack,
      operation,
    })
  }

  async logAuthError(operation, error) {
    return this.logError("AUTH_ERROR", `Auth ${operation} failed`, {
      code: error.code,
      message: error.message,
      uid: error.uid || "unknown",
      operation,
    })
  }

  async logNetworkError(url, error) {
    return this.logError("NETWORK_ERROR", `Network request failed: ${url}`, {
      url,
      status: error.status,
      statusText: error.statusText,
      message: error.message,
    })
  }

  async logNavigationError(route, error) {
    return this.logError("NAVIGATION_ERROR", `Navigation to ${route} failed`, {
      route,
      message: error.message,
      stack: error.stack,
    })
  }

  async logAgoraError(operation, error) {
    return this.logError("AGORA_ERROR", `Agora ${operation} failed`, {
      operation,
      code: error.code,
      message: error.message,
      errorCode: error.errorCode,
    })
  }

  async logPermissionError(permission, error) {
    return this.logError("PERMISSION_ERROR", `Permission ${permission} denied`, {
      permission,
      message: error.message,
      granted: error.granted || false,
    })
  }

  async logStorageError(operation, key, error) {
    return this.logError("STORAGE_ERROR", `Storage ${operation} failed for key: ${key}`, {
      operation,
      key,
      message: error.message,
    })
  }

  async logComponentError(component, error, errorInfo) {
    return this.logError("COMPONENT_ERROR", `Component ${component} crashed`, {
      component,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
    })
  }

  // Utility functions
  sanitizeDetails(details) {
    try {
      // Remove sensitive information
      const sanitized = { ...details }

      // Remove passwords, tokens, etc.
      const sensitiveKeys = ["password", "token", "secret", "key", "auth"]
      sensitiveKeys.forEach((key) => {
        if (sanitized[key]) {
          sanitized[key] = "[REDACTED]"
        }
      })

      return sanitized
    } catch (error) {
      return { sanitizeError: error.message }
    }
  }

  async getDeviceInfo() {
    try {
      const { Platform, Dimensions } = require("react-native")
      const Constants = require("expo-constants").default

      return {
        platform: Platform.OS,
        version: Platform.Version,
        dimensions: Dimensions.get("window"),
        appVersion: Constants.expoConfig?.version || "unknown",
        deviceName: Constants.deviceName || "unknown",
      }
    } catch (error) {
      return { error: error.message }
    }
  }

  async getAppState() {
    try {
      const { AppState } = require("react-native")
      return {
        currentState: AppState.currentState,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return { error: error.message }
    }
  }

  async saveLogs() {
    try {
      await AsyncStorage.setItem(this.logKey, JSON.stringify(this.logs))
    } catch (error) {
      console.error("Failed to save logs:", error)
    }
  }

  // Get logs for debugging
  async getAllLogs() {
    return this.logs
  }

  async getLogsByType(type) {
    return this.logs.filter((log) => log.type === type)
  }

  async getRecentLogs(count = 50) {
    return this.logs.slice(0, count)
  }

  // Export logs
  async exportLogs() {
    try {
      const logs = await this.getAllLogs()
      const exportData = {
        exportTime: new Date().toISOString(),
        totalLogs: logs.length,
        logs,
      }

      return JSON.stringify(exportData, null, 2)
    } catch (error) {
      console.error("Failed to export logs:", error)
      return null
    }
  }

  // Clear logs
  async clearLogs() {
    try {
      this.logs = []
      await AsyncStorage.removeItem(this.logKey)
      console.log("All logs cleared")
    } catch (error) {
      console.error("Failed to clear logs:", error)
    }
  }

  // Send logs to remote server (for production)
  async sendLogsToServer() {
    try {
      const logs = await this.getRecentLogs(100)

      // In production, send to your logging service
      // Example: Sentry, LogRocket, or custom endpoint

      console.log("Logs ready to send:", logs.length)
      return logs
    } catch (error) {
      console.error("Failed to send logs:", error)
    }
  }
}

// Create singleton instance
const errorLogger = new ErrorLogger()

export default errorLogger
