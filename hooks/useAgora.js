import { useState, useEffect, useRef, useCallback } from "react"
import { Platform, PermissionsAndroid, Alert } from "react-native"
import RtcEngine, { ChannelProfile, ClientRole } from "react-native-agora"
import { agoraConfig, generateAgoraToken } from "../config/agora"

const useAgora = (channelName) => {
  const [joined, setJoined] = useState(false)
  const [remoteUsers, setRemoteUsers] = useState([])
  const [muted, setMuted] = useState(false)
  const [speakerEnabled, setSpeakerEnabled] = useState(true)
  const [error, setError] = useState(null) // New state to track Agora errors
  const engineRef = useRef(null)

  const requestPermissions = useCallback(async () => {
    try {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.MODIFY_AUDIO_SETTINGS,
        ])

        const audioGranted = granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED
        const settingsGranted = granted[PermissionsAndroid.PERMISSIONS.MODIFY_AUDIO_SETTINGS] === PermissionsAndroid.RESULTS.GRANTED

        if (!audioGranted || !settingsGranted) {
          Alert.alert(
            "Permissions Required",
            "Microphone and audio settings permissions are essential for voice calls. Please grant them in app settings."
          )
          return false
        }
        return true
      }
      return true
    } catch (error) {
      console.error("Permission request error:", error)
      setError("Failed to request permissions.")
      return false
    }
  }, [])

  const initializeEngine = useCallback(async () => {
    if (engineRef.current) return engineRef.current // Engine already initialized

    try {
      const hasPermissions = await requestPermissions()
      if (!hasPermissions) {
        setError("Missing required permissions for voice call.")
        return null
      }

      // Ensure Agora App ID is present
      if (!agoraConfig.appId) {
        console.error("Agora App ID is not configured!")
        setError("Agora App ID is missing.")
        Alert.alert("Configuration Error", "Agora App ID is not set. Please check config/agora.js.")
        return null
      }

      const agoraEngine = await RtcEngine.create(agoraConfig.appId)
      engineRef.current = agoraEngine

      await agoraEngine.setChannelProfile(ChannelProfile.Communication)
      await agoraEngine.setClientRole(ClientRole.Broadcaster) // Broadcaster is required to send audio
      await agoraEngine.enableAudio()
      await agoraEngine.setDefaultAudioRoutetoSpeakerphone(true)
      await agoraEngine.setEnableSpeakerphone(true)

      // Add comprehensive listeners for better debugging and state management
      agoraEngine.addListener("JoinChannelSuccess", (channel, uid, elapsed) => {
        console.log("Agora: Joined channel successfully:", channel, uid)
        setJoined(true)
        setError(null) // Clear any previous errors
      })

      agoraEngine.addListener("UserJoined", (uid, elapsed) => {
        console.log("Agora: User joined:", uid)
        setRemoteUsers((prev) => [...prev.filter((user) => user.uid !== uid), { uid }])
      })

      agoraEngine.addListener("UserOffline", (uid, reason) => {
        console.log("Agora: User left:", uid, reason)
        setRemoteUsers((prev) => prev.filter((user) => user.uid !== uid))
        // Consider if the other user leaving should end the session immediately
        // or prompt the current user. For now, just update remoteUsers.
      })

      agoraEngine.addListener("LeaveChannel", (stats) => {
        console.log("Agora: Left channel")
        setJoined(false)
        setRemoteUsers([])
      })

      agoraEngine.addListener("Error", (err) => {
        console.error("Agora Error:", err)
        setError(`Agora Error: ${err.code} - ${err.message}`)
        Alert.alert("Agora Error", `Code: ${err.code}\nMessage: ${err.message}`, [{ text: "OK" }])
        // Potentially leave channel or destroy engine on critical errors
      })

      agoraEngine.addListener("ConnectionLost", () => {
        console.warn("Agora: Connection lost!")
        setError("Connection lost. Trying to reconnect...")
      })

      agoraEngine.addListener("ConnectionInterrupted", () => {
        console.warn("Agora: Connection interrupted!")
        setError("Connection interrupted. Trying to reconnect...")
      })

      agoraEngine.addListener("ConnectionBanned", () => {
        console.error("Agora: Connection banned!")
        setError("Connection banned. Please check your Agora configuration or account status.")
      })

      agoraEngine.addListener("Warning", (warn) => {
        console.warn("Agora Warning:", warn)
      })

      return agoraEngine
    } catch (error) {
      console.error("Agora initialization error:", error)
      setError(`Failed to initialize voice call: ${error.message}`)
      Alert.alert("Connection Error", `Failed to initialize voice call: ${error.message}`)
      
      if (engineRef.current) {
        await engineRef.current.destroy()
        engineRef.current = null;
      }
      return null
    }
  }, [requestPermissions]) 

  const joinChannel = useCallback(async () => {
    if (!channelName) {
      console.error("Cannot join channel: channelName is undefined.")
      setError("Cannot join channel: Channel name missing.")
      return false
    }

    try {
      const agoraEngine = await initializeEngine()
      if (!agoraEngine) {
        console.error("Agora engine not initialized, cannot join channel.")
        return false
      }

      // This is the CRITICAL part. You NEED a valid token from a backend.
      // If you are testing locally WITHOUT a backend, you can temporarily
      // use null for UID (0) and token if your Agora project settings allow it (NOT SECURE FOR PROD).
      // For proper setup, uncomment the `token` generation line below.
      const token = await generateAgoraToken(channelName, 0) // UID 0 for now, replace with actual user UID if needed
      if (token === null) {
        // Only if generateAgoraToken can return null due to backend issues.
        // Your generateAgoraToken in agora.js currently *always* returns null.
        // This is the source of "flow nhi bnra".
        Alert.alert("Token Error", "Failed to get Agora token. Please check your network or try again.")
        setError("Failed to get Agora token.")
        return false
      }

      console.log("Attempting to join channel:", channelName, "with token:", token ? "generated" : "null")
      await agoraEngine.joinChannel(token, channelName, null, 0) // UID 0 for now, can be specific user ID
      return true
    } catch (error) {
      console.error("Join channel error:", error)
      setError(`Failed to join voice call: ${error.message}`)
      Alert.alert("Connection Error", `Failed to join voice call: ${error.message}`)
      return false
    }
  }, [channelName, initializeEngine])

  const leaveChannel = useCallback(async () => {
    try {
      if (engineRef.current) {
        // Remove all listeners before destroying to prevent memory leaks
        engineRef.current.removeAllListeners()
        await engineRef.current.leaveChannel()
        await engineRef.current.destroy()
        engineRef.current = null
        setJoined(false)
        setRemoteUsers([])
        setMuted(false)
        setSpeakerEnabled(true)
        setError(null)
      }
    } catch (error) {
      console.error("Leave channel error:", error)
      setError(`Failed to leave channel cleanly: ${error.message}`)
    }
  }, [])

  const toggleMute = useCallback(async () => {
    try {
      if (engineRef.current && joined) { // Only toggle if joined
        await engineRef.current.muteLocalAudioStream(!muted)
        setMuted((prev) => !prev)
      }
    } catch (error) {
      console.error("Toggle mute error:", error)
      setError(`Failed to toggle mute: ${error.message}`)
    }
  }, [muted, joined])

  const toggleSpeaker = useCallback(async () => {
    try {
      if (engineRef.current && joined) { // Only toggle if joined
        await engineRef.current.setEnableSpeakerphone(!speakerEnabled)
        setSpeakerEnabled((prev) => !prev)
      }
    } catch (error) {
      console.error("Toggle speaker error:", error)
      setError(`Failed to toggle speaker: ${error.message}`)
    }
  }, [speakerEnabled, joined])

  useEffect(() => {
    let cleanupPerformed = false; // Flag to prevent double cleanup
    if (channelName) {
      joinChannel().then(success => {
        if (!success && !cleanupPerformed) {
          // If join fails, attempt to clean up
          leaveChannel();
        }
      });
    }

    return () => {
      // Ensure cleanup only happens once
      if (!cleanupPerformed) {
        leaveChannel();
        cleanupPerformed = true;
      }
    };
  }, [channelName, joinChannel, leaveChannel]); // Dependencies for useEffect

  return {
    joined,
    remoteUsers,
    muted,
    speakerEnabled,
    error, // Expose error state
    joinChannel, // Expose for manual re-attempts if needed
    leaveChannel,
    toggleMute,
    toggleSpeaker,
  }
}

export default useAgora