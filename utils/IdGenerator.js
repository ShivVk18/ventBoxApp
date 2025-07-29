import * as Crypto from "expo-crypto"

class IdGenerator {
  // Generate a secure UUID v4 using Expo Crypto
  static async generateUUID() {
    try {
      // Generate 16 random bytes
      const randomBytes = await Crypto.getRandomBytesAsync(16)
      // Convert to hex string
      const hex = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")

      // Format as UUID v4
      const uuid = [
        hex.substring(0, 8),
        hex.substring(8, 12),
        "4" + hex.substring(13, 16), // Version 4
        ((Number.parseInt(hex.substring(16, 17), 16) & 0x3) | 0x8).toString(16) + hex.substring(17, 20), // Variant bits
        hex.substring(20, 32),
      ].join("-")

      return uuid
    } catch (error) {
      console.error("Error generating UUID:", error)
      // Fallback to timestamp-based ID
      return this.generateFallbackId()
    }
  }

  // Generate session ID (shorter, more readable)
  static async generateSessionId() {
    try {
      const randomBytes = await Crypto.getRandomBytesAsync(8)
      const hex = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
      return `session_${hex}`
    } catch (error) {
      console.error("Error generating session ID:", error)
      return this.generateFallbackId("session")
    }
  }

  // Generate channel name for Agora
  static async generateChannelName() {
    try {
      const randomBytes = await Crypto.getRandomBytesAsync(6)
      const hex = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
      const timestamp = Date.now().toString(36)
      return `ventbox_${timestamp}_${hex}`
    } catch (error) {
      console.error("Error generating channel name:", error)
      return this.generateFallbackId("ventbox")
    }
  }

  // Generate user ID
  static async generateUserId() {
    try {
      const randomBytes = await Crypto.getRandomBytesAsync(12)
      const hex = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
      return `user_${hex}`
    } catch (error) {
      console.error("Error generating user ID:", error)
      return this.generateFallbackId("user")
    }
  }

  // Generate secure token
  static async generateToken(length = 32) {
    try {
      const randomBytes = await Crypto.getRandomBytesAsync(length)
      return Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    } catch (error) {
      console.error("Error generating token:", error)
      return this.generateFallbackId("token")
    }
  }

  // Fallback ID generator (timestamp + random)
  static generateFallbackId(prefix = "id") {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substr(2, 9)
    return `${prefix}_${timestamp}_${random}`
  }

  // Generate short ID (for display purposes)
  static async generateShortId(length = 8) {
    try {
      const randomBytes = await Crypto.getRandomBytesAsync(Math.ceil(length / 2))
      return Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .substring(0, length)
        .toUpperCase()
    } catch (error) {
      console.error("Error generating short ID:", error)
      return Math.random().toString(36).substr(2, length).toUpperCase()
    }
  }

  // Validate UUID format
  static isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }

  // Generate hash from string
  static async generateHash(input) {
    try {
      const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input, {
        encoding: Crypto.CryptoEncoding.HEX,
      })
      return digest
    } catch (error) {
      console.error("Error generating hash:", error)
      return null
    }
  }
}

export default IdGenerator