"use client"

import React, { useState } from "react"
import { View, Text, StyleSheet, Alert, ScrollView, RefreshControl } from "react-native"
import { router } from "expo-router"
import GradientContainer from "../components/ui/GradientContainer"
import StatusBar from "../components/ui/StatusBar"
import Button from "../components/ui/Button"
import Avatar from "../components/ui/Avatar"
import { useAuth } from "../context/AuthContext"
import useQueue from "../hooks/useQueue"
import useMatching from "../hooks/useMatching"
import { theme } from "../config/theme"

export default function ListenerScreen() {
  const [refreshing, setRefreshing] = useState(false)
  const { userInfo } = useAuth()
  const { queueStats, loading, refreshStats } = useQueue()
  const { isMatching, startMatching, stopMatching } = useMatching()

  const onRefresh = async () => {
    setRefreshing(true)
    await refreshStats()
    setRefreshing(false)
  }

  const handleStartListening = async () => {
    if (!userInfo?.uid) {
      Alert.alert("Error", "Please sign in to continue")
      return
    }

    const success = await startMatching("listener")
    if (!success) {
      Alert.alert("Error", "Failed to start listening. Please try again.")
    }
  }

  const handleStopListening = async () => {
    Alert.alert(
      "Stop Listening",
      "Are you sure you want to stop listening? You won't be matched with anyone who needs to vent.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Stop", onPress: stopMatching },
      ],
    )
  }

  const getEstimatedWaitMessage = () => {
    const ventersWaiting = queueStats.ventersWaiting || 0
    if (ventersWaiting > 0) {
      return `${ventersWaiting} ${ventersWaiting === 1 ? "person" : "people"} waiting - Match likely soon!`
    }
    return "Waiting for someone to vent..."
  }

  return (
    <GradientContainer>
      <StatusBar />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <Text style={styles.anonymousText}>
          {userInfo?.isAnonymous ? "You are anonymous" : `Welcome, ${userInfo?.displayName || "Listener"}`}
        </Text>

        <View style={styles.mainContent}>
          <Avatar emoji="👂" size={120} />
          <Text style={styles.title}>Ready to{"\n"}Listen?</Text>

          <View style={styles.queueContainer}>
            <Text style={styles.queueTitle}>Current Queue</Text>
            <Text style={styles.queueNumber}>{loading ? "..." : queueStats.ventersWaiting}</Text>
            <Text style={styles.queueLabel}>
              {queueStats.ventersWaiting === 1 ? "person waiting" : "people waiting"} to vent
            </Text>
            {!loading && <Text style={styles.estimateText}>{getEstimatedWaitMessage()}</Text>}
          </View>

          {isMatching ? (
            <View style={styles.listeningContainer}>
              <View style={styles.pulseContainer}>
                <Text style={styles.listeningEmoji}>👂</Text>
              </View>
              <Text style={styles.listeningText}>Listening for venters...</Text>
              <Text style={styles.listeningSubtext}>You'll be connected automatically when someone needs to vent</Text>
            </View>
          ) : (
            <View style={styles.infoContainer}>
              <Text style={styles.infoTitle}>As a Listener, you will:</Text>
              <InfoItem emoji="🤝" text="Provide a safe space for someone to vent" />
              <InfoItem emoji="👂" text="Listen without judgment or giving advice" />
              <InfoItem emoji="💝" text="Offer support and empathy" />
              <InfoItem emoji="🔒" text="Maintain complete anonymity and confidentiality" />

              <View style={styles.reminderContainer}>
                <Text style={styles.reminderTitle}>🌟 Remember</Text>
                <Text style={styles.reminderText}>
                  Sometimes just being heard is exactly what someone needs. Your compassion makes a real difference.
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          {!isMatching ? (
            <Button title="Start Listening" onPress={handleStartListening} variant="secondary" />
          ) : (
            <Button title="Stop Listening" onPress={handleStopListening} variant="outline" />
          )}

          <Button
            title="Back to Dashboard"
            onPress={() => router.push("/dashboard-screen")}
            variant="outline"
            style={styles.backButton}
          />
        </View>
      </ScrollView>
    </GradientContainer>
  )
}

const InfoItem = React.memo(({ emoji, text }) => (
  <View style={styles.infoItem}>
    <Text style={styles.infoEmoji}>{emoji}</Text>
    <Text style={styles.infoText}>{text}</Text>
  </View>
))

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.xl,
  },
  anonymousText: {
    color: theme.colors.text.tertiary,
    ...theme.typography.body,
    textAlign: "center",
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  mainContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: theme.colors.text.primary,
    ...theme.typography.h1,
    fontSize: 36,
    textAlign: "center",
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    lineHeight: 44,
  },
  queueContainer: {
    backgroundColor: theme.colors.overlay,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    alignItems: "center",
    marginBottom: theme.spacing.xl,
    minWidth: 220,
    borderWidth: 1,
    borderColor: theme.colors.overlayStrong,
    ...theme.shadows.small,
  },
  queueTitle: {
    color: theme.colors.text.tertiary,
    ...theme.typography.body,
    marginBottom: theme.spacing.sm,
  },
  queueNumber: {
    color: theme.colors.secondary,
    fontSize: 48,
    fontWeight: "bold",
    marginBottom: 5,
  },
  queueLabel: {
    color: theme.colors.text.tertiary,
    ...theme.typography.caption,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  estimateText: {
    color: theme.colors.warning,
    ...theme.typography.caption,
    fontWeight: "600",
    textAlign: "center",
  },
  listeningContainer: {
    backgroundColor: "rgba(79, 70, 229, 0.15)",
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 2,
    borderColor: "#4f46e5",
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
  },
  pulseContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 80,
    height: 80,
    marginBottom: theme.spacing.lg,
  },
  listeningEmoji: {
    fontSize: 32,
  },
  listeningText: {
    color: "#4f46e5",
    ...theme.typography.h3,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  listeningSubtext: {
    color: "rgba(79, 70, 229, 0.8)",
    ...theme.typography.caption,
    textAlign: "center",
    lineHeight: 20,
  },
  infoContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    width: "100%",
    maxWidth: 320,
  },
  infoTitle: {
    color: theme.colors.warning,
    ...theme.typography.h3,
    marginBottom: theme.spacing.lg,
    textAlign: "center",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
  },
  infoEmoji: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
    marginTop: 2,
  },
  infoText: {
    color: theme.colors.text.secondary,
    ...theme.typography.caption,
    lineHeight: 22,
    flex: 1,
  },
  reminderContainer: {
    backgroundColor: "rgba(74, 222, 128, 0.1)",
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.secondary,
    marginTop: theme.spacing.lg,
  },
  reminderTitle: {
    color: theme.colors.secondary,
    ...theme.typography.body,
    fontWeight: "600",
    marginBottom: theme.spacing.sm,
  },
  reminderText: {
    color: theme.colors.text.secondary,
    ...theme.typography.caption,
    lineHeight: 20,
  },
  buttonContainer: {
    paddingBottom: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  backButton: {
    marginTop: 5,
  },
})