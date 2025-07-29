"use client"
import { View, Alert, StyleSheet, ActivityIndicator, Text } from "react-native" 
import { router, useLocalSearchParams } from "expo-router"
import GradientContainer from "../components/ui/GradientContainer"
import StatusBar from "../components/ui/StatusBar"
import SessionTimer from "../components/session/SessionTimer"
import ConnectionStatus from "../components/session/ConnectionStatus"
import VoiceControls from "../components/session/VoiceControls"
import useTimer from "../hooks/useTimer"
import useAgora from "../hooks/useAgora"
import firestoreService from "../services/firestoreService"
import { PLANS } from "../utils/constants" 

export default function VoiceCall() {
  const params = useLocalSearchParams()
  const { ventText, plan, channelName, isHost, sessionId } = params

  
  if (!channelName || !sessionId || typeof isHost === 'undefined' || !plan) {
    Alert.alert("Error", "Missing call parameters. Returning to dashboard.")
    router.replace("/dashboard") 
    return null 
  }

  const getDurationInSeconds = (planName) => {
    const planData = PLANS.find((p) => p.name === planName)
   
    return planData ? planData.duration : 20 * 60 
  }

  const initialCallDuration = getDurationInSeconds(plan)

  const handleTimeUp = useCallback(async () => {
    // This is called when the timer runs out
    Alert.alert("Session Ended", "Your session has ended automatically due to time limit.", [
      {
        text: "OK",
        onPress: async () => {
          
          await leaveChannel() 
          if (sessionId) {
            try {
             
              await firestoreService.endSession(sessionId, sessionTime, 'auto-ended')
            } catch (error) {
              console.error("Error ending session in Firestore (auto-ended):", error)
            }
          }
          router.replace({ 
            pathname: "/session-ended",
            params: {
              sessionTime: sessionTime.toString(),
              plan,
              autoEnded: "true",
            },
          })
        },
      },
    ])
  }, [leaveChannel, sessionId, sessionTime, plan]); 

  const { sessionTime, timeRemaining, stopTimer } = useTimer(initialCallDuration, handleTimeUp)
  const { joined, remoteUsers, muted, speakerEnabled, error: agoraError, toggleMute, toggleSpeaker, leaveChannel } = useAgora(channelName)

  
  useEffect(() => {
    if (agoraError) {
    
      console.error("VoiceCall Screen: Agora reported an error:", agoraError)
      
    }
  }, [agoraError]);

  const handleEndCall = useCallback(async () => {
    Alert.alert("End Session", "Are you sure you want to end this session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End",
        onPress: async () => {
          try {
            stopTimer() // Stop the timer immediately
            await leaveChannel() // Disconnect from Agora

            if (sessionId) {
              try {
                // Mark session as ended in Firestore
                await firestoreService.endSession(sessionId, sessionTime, 'manual-ended')
              } catch (error) {
                console.error("Error ending session in Firestore (manual-ended):", error)
                Alert.alert("Firestore Error", "Failed to update session status. Check your internet connection.")
              }
            }

            router.replace({ 
              pathname: "/session-ended",
              params: {
                sessionTime: sessionTime.toString(), // Ensure this is a string
                plan,
                autoEnded: "false",
              },
            })
          } catch (error) {
            console.error("Error during manual call ending process:", error)
            Alert.alert("Error", "Failed to end call cleanly. Please restart the app if issues persist.")
          }
        },
      },
    ])
  }, [stopTimer, leaveChannel, sessionId, sessionTime, plan]); 

  
  if (!joined && remoteUsers.length === 0 && !agoraError) {
    return (
      <GradientContainer>
        <StatusBar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Connecting to session...</Text>
          <Text style={styles.loadingSubText}>Please ensure your internet connection is stable.</Text>
          {/* Optionally add a cancel button here */}
          <Button title="Cancel Connection" onPress={handleEndCall} variant="outline" style={styles.cancelButton} />
        </View>
      </GradientContainer>
    );
  }

 
  if (agoraError) {
    return (
      <GradientContainer>
        <StatusBar />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Connection Failed</Text>
          <Text style={styles.errorMessage}>{agoraError}</Text>
          <Button title="Try Again" onPress={() => router.replace("/dashboard")} variant="primary" /> {/* Go back to dashboard to retry */}
          <Button title="Go Back to Dashboard" onPress={() => router.replace("/dashboard")} variant="outline" style={{ marginTop: 10 }} />
        </View>
      </GradientContainer>
    );
  }


  return (
    <GradientContainer>
      <StatusBar />
      <View style={styles.container}>
        <SessionTimer sessionTime={sessionTime} timeRemaining={timeRemaining} plan={plan} />
       
        <ConnectionStatus joined={joined} remoteUsers={remoteUsers} timeRemaining={timeRemaining} agoraError={agoraError} />
        <VoiceControls
          muted={muted}
          speakerEnabled={speakerEnabled}
          onToggleMute={toggleMute}
          onToggleSpeaker={toggleSpeaker}
          onEndCall={handleEndCall}
          disabled={!joined} // Disable controls if not joined
        />
      </View>
    </GradientContainer>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
  },
  loadingSubText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: 30,
    minWidth: 180,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  errorTitle: {
    color: 'red',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorMessage: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
})