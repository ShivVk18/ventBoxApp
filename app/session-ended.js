import React, { useEffect } from "react"
import { View, Text, StyleSheet } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import GradientContainer from "../components/ui/GradientContainer"
import StatusBar from "../components/ui/StatusBar"
import Button from "../components/ui/Button"
import Avatar from "../components/ui/Avatar"
import { theme } from "../config/theme"
import { formatDuration } from "../utils/helper"

export default function SessionEndedScreen() {
  const params = useLocalSearchParams()
  const { sessionTime, plan, autoEnded } = params

  const duration = Number.parseInt(sessionTime) || 0
  const wasAutoEnded = autoEnded === "true"

  useEffect(() => {
    console.log("Session completed:", { duration, plan, autoEnded: wasAutoEnded })
  }, [])

  const handleBackToDashboard = () => {
    router.push("/dashboard-screen")
  }

  const handleVentAgain = () => {
    router.push("/vent-submitted")
  }

  const handleBeListener = () => {
    router.push("/listener")
  }

  return (
    <GradientContainer>
      <StatusBar />
      <View style={styles.container}>
        <View style={styles.content}>
          <Avatar emoji="✅" size={100} />

          <Text style={styles.title}>Session Complete</Text>

          <Text style={styles.subtitle}>
            {wasAutoEnded ? "Your session has ended automatically" : "Thank you for using VentBox"}
          </Text>

          <View style={styles.sessionInfo}>
            <InfoCard label="Session Duration" value={formatDuration(duration)} />
            <InfoCard label="Plan Used" value={plan || "20-Min Vent"} />
          </View>

          <View style={styles.messageContainer}>
            <Text style={styles.messageTitle}>{wasAutoEnded ? "Time's Up!" : "Hope You Feel Better"}</Text>
            <Text style={styles.messageText}>
              {wasAutoEnded
                ? "Your session time has ended. We hope this conversation was helpful."
                : "Remember, it's okay to not be okay. You're not alone in this journey."}
            </Text>
          </View>

          <View style={styles.reminderContainer}>
            <Text style={styles.reminderTitle}>🔒 Your Privacy</Text>
            <Text style={styles.reminderText}>
              This conversation was completely anonymous and has not been recorded or stored.
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button title="Back to Dashboard" onPress={handleBackToDashboard} style={styles.primaryButton} />

          <View style={styles.secondaryActions}>
            <Button title="Vent Again" onPress={handleVentAgain} variant="outline" style={styles.secondaryButton} />
            <Button title="Be a Listener" onPress={handleBeListener} variant="outline" style={styles.secondaryButton} />
          </View>
        </View>
      </View>
    </GradientContainer>
  )
}

const InfoCard = React.memo(({ label, value }) => (
  <View style={styles.infoCard}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
))

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text.primary,
    textAlign: "center",
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
  },
  sessionInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: theme.spacing.xl,
  },
  infoCard: {
    backgroundColor: theme.colors.overlay,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: "center",
    flex: 1,
    marginHorizontal: theme.spacing.sm,
    ...theme.shadows.small,
  },
  infoLabel: {
    ...theme.typography.caption,
    color: theme.colors.text.tertiary,
    marginBottom: theme.spacing.sm,
  },
  infoValue: {
    ...theme.typography.h3,
    color: theme.colors.secondary,
  },
  messageContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    width: "100%",
  },
  messageTitle: {
    ...theme.typography.body,
    fontWeight: "bold",
    color: theme.colors.text.primary,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  messageText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    textAlign: "center",
    lineHeight: 22,
  },
  reminderContainer: {
    backgroundColor: "rgba(74, 222, 128, 0.1)",
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(74, 222, 128, 0.3)",
    width: "100%",
  },
  reminderTitle: {
    ...theme.typography.body,
    fontWeight: "bold",
    color: theme.colors.secondary,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  reminderText: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    textAlign: "center",
    lineHeight: 20,
  },
  actions: {
    paddingBottom: theme.spacing.xl,
  },
  primaryButton: {
    marginBottom: theme.spacing.lg,
  },
  secondaryActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  secondaryButton: {
    flex: 1,
    marginHorizontal: 5,
  },
})