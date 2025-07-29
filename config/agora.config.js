// This file assumes you have a backend server for generating Agora tokens.
// If you do not have a backend, you cannot securely generate tokens,
// and you would rely on App ID authentication which is not recommended for production.

import * as Crypto from "expo-crypto"
import Constants from "expo-constants" // Import Constants for environment variables

// It's highly recommended to store these in environment variables (e.g., .env file)
// and expose them securely via Constants.manifest.extra or similar for Expo.
// For demonstration, directly using it, but best practice is ENV.
export const AGORA_APP_ID = Constants.manifest.extra.agoraAppId || "23b770c730a44a9d8bad353e5538a571" // Fallback or get from app.json/app.config.js extra section

export const agoraConfig = {
  appId: AGORA_APP_ID,
  // token and channelName are dynamic and not part of static config
  // token: null, // This should NOT be here as it's generated per session
  // channelName: null, // This is also generated dynamically
}

export const generateChannelName = async () => {
  try {
    const randomBytes = await Crypto.getRandomBytesAsync(6)
    const hex = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
    const timestamp = Date.now().toString(36)
    return `ventbox_${timestamp}_${hex}`
  } catch (error) {
    console.error("Error generating channel name:", error)
    // Fallback in case of crypto error
    return `ventbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * IMPORTANT: In a production environment, this function MUST call your secure backend
 * to generate the Agora RTM/RTC token using your Agora App Certificate.
 * NEVER embed your Agora App Certificate directly in client-side code.
 *
 * For development, you *might* temporarily return null (if your Agora project allows
 * for App ID authentication without tokens for testing), but it's not secure.
 * Or you can use Agora's temporary token generator for testing.
 */
export const generateAgoraToken = async (channelName, uid) => {
  if (__DEV__) { // Only in development mode, use a simplified approach or a dummy token
    console.warn("🔧 Development Mode: Using placeholder or null token for Agora. GET A BACKEND FOR PRODUCTION!")
    // Option 1: If Agora project is configured for App ID authentication without token (least secure, only for dev testing)
    // return null;

    // Option 2: Call a local development server or a publicly accessible token generator (not recommended)
    // For a real app, replace `your-backend-url` with your actual server endpoint
    try {
      // Replace with your actual backend endpoint that generates Agora tokens
      // Example: A Firebase Cloud Function or a Node.js server
      const response = await fetch('https://agora-backend-mkg6.onrender.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelName: channelName,
          uid: uid,
          role: 'publisher', // Assuming broadcaster role, adjust as needed
          expireTime: 3600 // Token valid for 1 hour
        }),
      });

      if (!response.ok) {
        const errorData = await response.text(); // Get raw text for better error messages
        throw new Error(`Backend token generation failed: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      if (!data.token) {
        throw new Error("Backend did not return a token.");
      }
      console.log("Agora: Token generated successfully from backend (dev).");
      return data.token;
    } catch (error) {
      console.error("Agora: Failed to generate token from backend:", error);
      Alert.alert("Agora Token Error", "Could not get a valid token. Voice call may not work. Please check your backend.");
      return null; // Return null if fetching fails
    }
  } else { // Production mode: ALWAYS call a secure backend
    try {
      
      const response = await fetch('https://agora-backend-mkg6.onrender.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelName: channelName,
          uid: uid,
          role: 'publisher',
          expireTime: 3600
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Production backend token generation failed: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      if (!data.token) {
        throw new Error("Production backend did not return a token.");
      }
      console.log("Agora: Token generated successfully (production).");
      return data.token;
    } catch (error) {
      console.error("Agora: Production token generation failed:", error);
      Alert.alert("Critical Error", "Failed to secure Agora token. Please contact support.");
      return null; // Critical failure, cannot proceed without a token
    }
  }
}