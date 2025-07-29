import { useState, useEffect, useRef, useCallback } from "react"
import { Platform, PermissionsAndroid } from "react-native"

let RtcEngine, ChannelProfile, ClientRole, RtcEngineEventType
try {
  const AgoraModule = require("react-native-agora")
  RtcEngine = AgoraModule.default
  ChannelProfile = AgoraModule.ChannelProfile
  ClientRole = AgoraModule.ClientRole
  RtcEngineEventType = AgoraModule.RtcEngineEventType
} catch (error) {
  console.error("Failed to import Agora SDK:", error)
}

import { agoraConfig, generateAgoraToken } from "../config/agora.config"


let globalEngineInstance = null
let globalInitializationPromise = null

export default function useAgora(channelName, isVenter) {
  const [joined, setJoined] = useState(false)
  const [remoteUsers, setRemoteUsers] = useState([])
  const [muted, setMuted] = useState(false)
  const [speakerEnabled, setSpeakerEnabled] = useState(true)
  const [error, setError] = useState(null)
  const [connectionState, setConnectionState] = useState("disconnected")

  const isMountedRef = useRef(true)
  const tokenRef = useRef(null)
  const joinTimeoutRef = useRef(null)

  // Disable Agora completely if import failed
  const [agoraSdkAvailable, setAgoraSdkAvailable] = useState(!!RtcEngine)

  useEffect(() => {
    if (!RtcEngine) {
      setError("Agora SDK not available. Voice calls are disabled.")
      setConnectionState("failed")
    }
  }, [])

  if (!agoraSdkAvailable) {
    return {
      joined: false,
      remoteUsers: [],
      muted: false,
      speakerEnabled: true,
      error: "Agora SDK not available",
      connectionState: "failed",
      joinChannel: async () => false,
      leaveChannel: async () => {},
      toggleMute: async () => {},
      toggleSpeaker: async () => {},
    }
  }

  const requestPermissions = useCallback(async () => {
    try {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.MODIFY_AUDIO_SETTINGS,
        ])

        const audioGranted = granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED
        const settingsGranted =
          granted[PermissionsAndroid.PERMISSIONS.MODIFY_AUDIO_SETTINGS] === PermissionsAndroid.RESULTS.GRANTED

        return audioGranted && settingsGranted
      }
      return true
    } catch (error) {
      console.error("Permission request error:", error)
      return false
    }
  }, [])

  const destroyGlobalEngine = useCallback(async () => {
    if (globalEngineInstance) {
      try {
        console.log("Destroying global Agora engine")
        await globalEngineInstance.removeAllListeners()
        await globalEngineInstance.leaveChannel()
        await globalEngineInstance.destroy()
      } catch (error) {
        console.warn("Error destroying global engine:", error)
      } finally {
        globalEngineInstance = null
        globalInitializationPromise = null
      }
    }
  }, [])

  const initializeEngine = useCallback(async () => {
    // Return existing engine if available
    if (globalEngineInstance) {
      console.log("Using existing global Agora engine")
      return globalEngineInstance
    }

    // Return existing promise if initialization is in progress
    if (globalInitializationPromise) {
      console.log("Waiting for existing initialization")
      return globalInitializationPromise
    }

    // Start new initialization
    globalInitializationPromise = (async () => {
      try {
        console.log("Starting Agora engine initialization")

        // Check permissions first
        const hasPermissions = await requestPermissions()
        if (!hasPermissions) {
          throw new Error("Required permissions not granted")
        }

        if (!agoraConfig.appId) {
          throw new Error("Agora App ID is missing")
        }

        // Create engine with timeout
        const enginePromise = RtcEngine.create(agoraConfig.appId)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Engine creation timeout")), 10000),
        )

        const agoraEngine = await Promise.race([enginePromise, timeoutPromise])

        if (!agoraEngine) {
          throw new Error("Engine creation returned null")
        }

        console.log("Agora engine created successfully")

        // Configure engine with individual try-catch blocks
        try {
          await agoraEngine.setChannelProfile(ChannelProfile.Communication)
        } catch (e) {
          console.warn("Failed to set channel profile:", e)
        }

        try {
          await agoraEngine.setClientRole(ClientRole.Broadcaster)
        } catch (e) {
          console.warn("Failed to set client role:", e)
        }

        try {
          await agoraEngine.enableAudio()
        } catch (e) {
          console.warn("Failed to enable audio:", e)
        }

        // Add small delays between audio settings
        await new Promise((resolve) => setTimeout(resolve, 200))

        try {
          await agoraEngine.setDefaultAudioRoutetoSpeakerphone(true)
        } catch (e) {
          console.warn("Failed to set speaker route:", e)
        }

        await new Promise((resolve) => setTimeout(resolve, 200))

        try {
          await agoraEngine.setEnableSpeakerphone(true)
        } catch (e) {
          console.warn("Failed to enable speakerphone:", e)
        }

        // Store globally
        globalEngineInstance = agoraEngine
        console.log("Agora engine initialized and stored globally")

        return agoraEngine
      } catch (error) {
        console.error("Agora initialization failed:", error)
        globalInitializationPromise = null
        throw error
      }
    })()

    return globalInitializationPromise
  }, [requestPermissions])

  const addEventListeners = useCallback((engine) => {
    if (!engine || !isMountedRef.current) return

    try {
      // Join Channel Success
      engine.addListener(RtcEngineEventType.JoinChannelSuccess, (channel, uid, elapsed) => {
        if (!isMountedRef.current) return
        console.log("Agora: Joined channel successfully:", channel)
        setJoined(true)
        setError(null)
        setConnectionState("connected")

        // Clear join timeout
        if (joinTimeoutRef.current) {
          clearTimeout(joinTimeoutRef.current)
          joinTimeoutRef.current = null
        }
      })

      // User Joined
      engine.addListener(RtcEngineEventType.UserJoined, (uid, elapsed) => {
        if (!isMountedRef.current) return
        console.log("Agora: User joined:", uid)
        setRemoteUsers((prev) => (prev.includes(uid) ? prev : [...prev, uid]))
      })

      // User Offline
      engine.addListener(RtcEngineEventType.UserOffline, (uid, reason) => {
        if (!isMountedRef.current) return
        console.log("Agora: User left:", uid)
        setRemoteUsers((prev) => prev.filter((id) => id !== uid))
      })

      // Leave Channel
      engine.addListener(RtcEngineEventType.LeaveChannel, (stats) => {
        if (!isMountedRef.current) return
        console.log("Agora: Left channel")
        setJoined(false)
        setRemoteUsers([])
        setConnectionState("disconnected")
      })

      // Error
      engine.addListener(RtcEngineEventType.Error, (err) => {
        if (!isMountedRef.current) return
        console.error("Agora Error:", err)
        setError(`Agora Error: ${err.code}`)
        setConnectionState("failed")
      })

      // Connection Lost
      engine.addListener(RtcEngineEventType.ConnectionLost, () => {
        if (!isMountedRef.current) return
        console.warn("Agora: Connection lost")
        setError("Connection lost")
        setConnectionState("connecting")
      })

      console.log("Event listeners added successfully")
    } catch (error) {
      console.error("Failed to add event listeners:", error)
    }
  }, [])

  const joinChannel = useCallback(async () => {
    if (!channelName) {
      setError("Channel name is required")
      setConnectionState("failed")
      return false
    }

    try {
      setConnectionState("connecting")
      setError(null)

      console.log("Initializing engine for channel join")
      const engine = await initializeEngine()

      if (!engine) {
        throw new Error("Failed to initialize Agora engine")
      }

      // Add event listeners
      addEventListeners(engine)

      console.log("Generating token for channel:", channelName)
      const token = await generateAgoraToken(channelName, 0)

      if (!token) {
        throw new Error("Failed to generate token")
      }

      tokenRef.current = token

      console.log("Joining channel:", channelName)

      // Set join timeout
      joinTimeoutRef.current = setTimeout(() => {
        if (!joined && isMountedRef.current) {
          console.warn("Join channel timeout")
          setError("Connection timeout")
          setConnectionState("failed")
        }
      }, 20000) // 20 second timeout

      // Join channel with error handling
      try {
        await engine.joinChannel(token, channelName, null, 0)
        console.log("Join channel request sent")
        return true
      } catch (joinError) {
        console.error("Join channel failed:", joinError)
        throw new Error(`Failed to join: ${joinError.message}`)
      }
    } catch (error) {
      console.error("Join channel error:", error)
      if (isMountedRef.current) {
        setError(`Join failed: ${error.message}`)
        setConnectionState("failed")
      }

      // Clear timeout on error
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current)
        joinTimeoutRef.current = null
      }

      return false
    }
  }, [channelName, initializeEngine, addEventListeners, joined])

  const leaveChannel = useCallback(async () => {
    try {
      console.log("Leaving channel")
      setConnectionState("disconnected")

      // Clear join timeout
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current)
        joinTimeoutRef.current = null
      }

      if (globalEngineInstance) {
        try {
          await globalEngineInstance.leaveChannel()
          console.log("Left channel successfully")
        } catch (error) {
          console.warn("Error leaving channel:", error)
        }
      }

      if (isMountedRef.current) {
        setJoined(false)
        setRemoteUsers([])
        setMuted(false)
        setSpeakerEnabled(true)
        setError(null)
      }

      // Don't destroy the global engine here - let it be reused
      console.log("Channel left, engine preserved for reuse")
    } catch (error) {
      console.error("Leave channel error:", error)
    }
  }, [])

  const toggleMute = useCallback(async () => {
    if (!globalEngineInstance || !joined) return

    try {
      const newMutedState = !muted
      await globalEngineInstance.muteLocalAudioStream(newMutedState)
      if (isMountedRef.current) {
        setMuted(newMutedState)
      }
    } catch (error) {
      console.error("Toggle mute error:", error)
    }
  }, [muted, joined])

  const toggleSpeaker = useCallback(async () => {
    if (!globalEngineInstance || !joined) return

    try {
      const newSpeakerState = !speakerEnabled
      await globalEngineInstance.setEnableSpeakerphone(newSpeakerState)
      if (isMountedRef.current) {
        setSpeakerEnabled(newSpeakerState)
      }
    } catch (error) {
      console.error("Toggle speaker error:", error)
    }
  }, [speakerEnabled, joined])

  // Component lifecycle
  useEffect(() => {
    isMountedRef.current = true

    return () => {
      console.log("useAgora cleanup")
      isMountedRef.current = false

      // Clear timeout
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current)
        joinTimeoutRef.current = null
      }

      // Don't destroy global engine on component unmount
      // It will be reused by other components
    }
  }, [])

  // Auto-join when channel name is provided
  useEffect(() => {
    if (!channelName) return

    let cancelled = false

    const attemptJoin = async () => {
      // Add delay to prevent race conditions
      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (cancelled || !isMountedRef.current) return

      console.log("Auto-joining channel:", channelName)
      const success = await joinChannel()

      if (!success && !cancelled && isMountedRef.current) {
        console.log("Auto-join failed, cleaning up")
        await leaveChannel()
      }
    }

    attemptJoin()

    return () => {
      cancelled = true
    }
  }, [channelName, joinChannel, leaveChannel])

  return {
    joined,
    remoteUsers,
    muted,
    speakerEnabled,
    error,
    connectionState,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleSpeaker,
  }
}
