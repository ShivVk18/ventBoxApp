import * as Crypto from "expo-crypto"

export const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || "23b770c730a44a9d8bad353e5538a571"

export const agoraConfig = {
  appId: AGORA_APP_ID,
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

export const generateAgoraToken = async (channelName, uid) => {
  const backendUrl = "https://agora-backend-mkg6.onrender.com"

  try {
    console.log(`Agora: Requesting token from backend: ${backendUrl}`)

    // Add timeout to prevent hanging requests
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channelName: channelName,
        uid: uid,
        role: "publisher",
        expireTime: 3600,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Backend token generation failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    if (!data.token) {
      throw new Error("Backend did not return a token.")
    }

    console.log("Agora: Token generated successfully from backend.")
    return data.token
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("Agora: Token request timed out")
      throw new Error("Token request timed out. Please check your internet connection.")
    }

    console.error("Agora: Failed to generate token from backend:", error)
    throw new Error(`Failed to generate Agora token: ${error.message}`)
  }
}
