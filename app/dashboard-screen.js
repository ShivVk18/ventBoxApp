import React, { useState, useCallback } from "react"
import { View, Text, StyleSheet, ScrollView, Alert, RefreshControl } from "react-native"
import { router } from "expo-router"
import GradientContainer from "../components/ui/GradientContainer"
import StatusBar from "../components/ui/StatusBar"
import Button from "../components/ui/Button"
import Avatar from "../components/ui/Avatar"

import PaymentModal from "../components/PaymentModal"
import { useAuth } from "../context/AuthContext"
import useQueue from "../hooks/useQueue"
import useMatching from "../hooks/useMatching"
import { theme } from "../config/theme"
import { __DEV__ } from "react-native"

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false)
 
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const { userInfo, signOutUser } = useAuth()
  const { queueStats, loading, refreshStats } = useQueue()
  const { startMatching, isMatching, stopMatching } = useMatching()

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refreshStats()
    setRefreshing(false)
  }, [refreshStats])

  const handleVentNow = useCallback(() => {
    if (!userInfo?.uid) {
      Alert.alert("Authentication Required", "Please sign in to vent.")
      return
    }
    setShowPaymentModal(true)
  }, [userInfo])

  const handlePaymentSuccess = useCallback(
    async (selectedPlan) => {
      setShowPaymentModal(false)

      if (!userInfo?.uid) {
        Alert.alert("Error", "User not logged in. Please try again.")
        return
      }

      try {
        Alert.alert("Starting Vent Session", "Finding a listener for you...")

        router.push({
          pathname: "/vent-submitted",
          params: { selectedPlan: selectedPlan.name },
        })
      } catch (error) {
        console.error("Error during venter matching:", error)
        Alert.alert("Error", "Failed to start vent session. Please try again.")
        stopMatching()
      }
    },
    [userInfo, stopMatching],
  )

  const handleBeListener = useCallback(async () => {
    if (!userInfo?.uid) {
      Alert.alert("Authentication Required", "Please sign in to be a listener.")
      return
    }

    router.push("/listener")
  }, [userInfo])

  const handleSignOut = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        onPress: async () => {
          try {
            await signOutUser()
            router.replace("/")
          } catch (error) {
            Alert.alert("Error", "Failed to sign out")
            console.error("Sign out error:", error)
          }
        },
      },
    ])
  }, [signOutUser])

  const disableButtons = isMatching || loading

  return (
    <GradientContainer>
      <StatusBar />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <View style={styles.header}>
          <Avatar emoji="💭" size={60} />
          <View style={styles.userInfo}>
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <Text style={styles.userText}>
              {userInfo?.isAnonymous ? "Anonymous User" : userInfo?.displayName || "Loading User..."}
            </Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Live Stats</Text>
          <View style={styles.statsGrid}>
            <StatCard
              number={loading ? "..." : queueStats.ventersWaiting}
              label="Venters Waiting"
              color={theme.colors.primary}
            />
            <StatCard
              number={loading ? "..." : queueStats.listenersWaiting}
              label="Listeners Online"
              color={theme.colors.secondary}
            />
            <StatCard
              number={loading ? "..." : queueStats.activeSessions}
              label="Active Sessions"
              color={theme.colors.info}
            />
          </View>
        </View>

        <View style={styles.mainActions}>
          <ActionCard
            emoji="🗣️"
            title="Need to Vent?"
            description="Share your thoughts with a caring listener in a safe, anonymous environment."
            buttonTitle={isMatching ? "Finding Match..." : "Vent Now"}
            onPress={handleVentNow}
            variant="primary"
            disabled={disableButtons}
          />

          <ActionCard
            emoji="👂"
            title="Be a Listener"
            description="Help someone by providing a safe space for them to express their feelings."
            buttonTitle={isMatching ? "Finding Match..." : "Start Listening"}
            onPress={handleBeListener}
            variant="secondary"
            disabled={disableButtons}
          />
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How VentBox Works</Text>
          <InfoStep number="1" title="Choose Your Role" description="Decide if you want to vent or listen" />
          <InfoStep number="2" title="Get Matched" description="We'll connect you with someone anonymously" />
          <InfoStep number="3" title="Start Talking" description="Have a safe, private conversation" />
        </View>

        <View style={styles.footer}>
          <Button title="Sign Out" onPress={handleSignOut} variant="outline" style={styles.signOutButton} />
        </View>
      </ScrollView>

      <PaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </GradientContainer>
  )
}

const StatCard = React.memo(({ number, label, color }) => (
  <View style={styles.statCard}>
    <Text style={[styles.statNumber, { color }]}>{number}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
))

const ActionCard = React.memo(({ emoji, title, description, buttonTitle, onPress, variant, disabled }) => (
  <View style={styles.actionCard}>
    <Text style={styles.actionEmoji}>{emoji}</Text>
    <Text style={styles.actionTitle}>{title}</Text>
    <Text style={styles.actionDescription}>{description}</Text>
    <Button title={buttonTitle} onPress={onPress} variant={variant} style={styles.actionButton} disabled={disabled} />
  </View>
))

const InfoStep = React.memo(({ number, title, description }) => (
  <View style={styles.infoStep}>
    <Text style={styles.stepNumber}>{number}</Text>
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepDescription}>{description}</Text>
    </View>
  </View>
))

const styles = StyleSheet.create({
  debugContainer: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 999,
  },
  debugButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  userInfo: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  welcomeText: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
  },
  userText: {
    ...theme.typography.body,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },
  statsContainer: {
    marginBottom: theme.spacing.xl,
  },
  statsTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    backgroundColor: theme.colors.overlay,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
    ...theme.shadows.small,
  },
  statNumber: {
    ...theme.typography.h2,
    fontWeight: "bold",
  },
  statLabel: {
    ...theme.typography.small,
    color: theme.colors.text.tertiary,
    textAlign: "center",
    marginTop: 5,
  },
  mainActions: {
    marginBottom: theme.spacing.xl,
  },
  actionCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    alignItems: "center",
    ...theme.shadows.small,
  },
  actionEmoji: {
    fontSize: 40,
    marginBottom: theme.spacing.md,
  },
  actionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  actionDescription: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  actionButton: {
    minWidth: 150,
  },
  infoSection: {
    marginBottom: theme.spacing.xl,
  },
  infoTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  infoStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: theme.spacing.lg,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.primary,
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 30,
    marginRight: theme.spacing.md,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    ...theme.typography.body,
    fontWeight: "600",
    color: theme.colors.text.primary,
    marginBottom: 5,
  },
  stepDescription: {
    ...theme.typography.caption,
    color: theme.colors.text.tertiary,
    lineHeight: 20,
  },
  footer: {
    paddingBottom: theme.spacing.xl,
    alignItems: "center",
  },
  signOutButton: {
    minWidth: 120,
  },
})