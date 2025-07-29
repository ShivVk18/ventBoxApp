"use client"

import React, { useEffect, useState } from "react"
import { View, Text, StyleSheet, Alert } from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import GradientContainer from "../components/ui/GradientContainer"
import StatusBar from "../components/ui/StatusBar"
import Button from "../components/ui/Button"
import Avatar from "../components/ui/Avatar"
import { useAuth } from "../context/AuthContext"
import { theme } from "../config/theme"

export default function WelcomeScreen() {
  const [signingIn, setSigningIn] = useState(false)
  const { user, userInfo, loading, signInAnonymous, error } = useAuth()
  const insets = useSafeAreaInsets()

  useEffect(() => {
    if (!loading && user && userInfo) {
      router.replace("/dashboard-screen")
    }
  }, [loading, user, userInfo])

  const handleGetStarted = async () => {
    if (signingIn) return

    try {
      setSigningIn(true)

      if (user && userInfo) {
        router.replace("/dashboard-screen")
        return
      }

      const signedInUser = await signInAnonymous()
      if (signedInUser) {
        setTimeout(() => router.replace("/dashboard-screen"), 500)
      }
    } catch (error) {
      Alert.alert("Sign In Error", `Failed to sign in: ${error.message}`, [
        { text: "Retry", onPress: handleGetStarted },
        { text: "Cancel", style: "cancel" },
      ])
    } finally {
      setSigningIn(false)
    }
  }

  if (loading) {
    return (
      <GradientContainer>
        <StatusBar />
        <View style={styles.loadingContainer}>
          <Avatar emoji="💭" size={120} />
          <Text style={styles.loadingText}>Loading VentBox...</Text>
        </View>
      </GradientContainer>
    )
  }

  if (error && !user) {
    return (
      <GradientContainer>
        <StatusBar />
        <View style={styles.errorContainer}>
          <Avatar emoji="⚠️" size={80} />
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Retry" onPress={handleGetStarted} style={styles.retryButton} />
        </View>
      </GradientContainer>
    )
  }

  return (
    <GradientContainer>
      <StatusBar />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Avatar emoji="💭" size={120} />
            <Text style={styles.title}>VentBox</Text>
            <Text style={styles.subtitle}>Anonymous venting made safe</Text>
          </View>

          <View style={styles.features}>
            <FeatureItem emoji="🔒" text="Completely Anonymous" />
            <FeatureItem emoji="👂" text="Trained Listeners" />
            <FeatureItem emoji="🎯" text="Instant Matching" />
          </View>

          <Text style={styles.description}>
            Sometimes you just need someone to listen. VentBox connects you with caring listeners in a safe, anonymous
            environment.
          </Text>
        </View>

        <View style={styles.footer}>
          <Button
            title={signingIn ? "Signing In..." : "Get Started"}
            onPress={handleGetStarted}
            disabled={signingIn}
            loading={signingIn}
            style={styles.getStartedButton}
          />
          <Text style={styles.disclaimer}>By continuing, you agree to our Terms of Service and Privacy Policy</Text>
        </View>
      </View>
    </GradientContainer>
  )
}

const FeatureItem = React.memo(({ emoji, text }) => (
  <View style={styles.feature}>
    <Text style={styles.featureEmoji}>{emoji}</Text>
    <Text style={styles.featureText}>{text}</Text>
  </View>
))

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: theme.colors.text.primary,
    ...theme.typography.body,
    marginTop: theme.spacing.lg,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  errorTitle: {
    color: theme.colors.text.primary,
    ...theme.typography.h2,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.error,
    ...theme.typography.body,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  },
  retryButton: {
    minWidth: 120,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: theme.spacing.xxl,
  },
  title: {
    ...theme.typography.h1,
    fontSize: 48,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    textAlign: "center",
  },
  features: {
    marginBottom: theme.spacing.xl,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  featureEmoji: {
    fontSize: 24,
    marginRight: theme.spacing.md,
  },
  featureText: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
    fontWeight: "500",
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.text.tertiary,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: theme.spacing.sm,
  },
  footer: {
    paddingBottom: theme.spacing.xl,
  },
  getStartedButton: {
    marginBottom: theme.spacing.lg,
  },
  disclaimer: {
    ...theme.typography.small,
    color: theme.colors.text.muted,
    textAlign: "center",
    lineHeight: 16,
  },
})
