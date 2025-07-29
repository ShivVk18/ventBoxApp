"use client"

import { useState, useRef } from "react"
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import GradientContainer from "../components/ui/GradientContainer"
import StatusBar from "../components/ui/StatusBar"
import Button from "../components/ui/Button"
import { useAuth } from "../context/AuthContext"
import useMatching from "../hooks/useMatching"
import { validateVentText } from "../utils/helper"
import { theme } from "../config/theme"
import { VALIDATION } from "../utils/constants"

export default function VentSubmittedScreen() {
  const [ventText, setVentText] = useState("")
  const { userInfo } = useAuth()
  const { isMatching, startMatching } = useMatching()
  const insets = useSafeAreaInsets()
  const textInputRef = useRef(null)

  const handleSubmitVent = async () => {
    const validation = validateVentText(ventText)
    if (!validation.isValid) {
      Alert.alert("Invalid Input", validation.error)
      return
    }
    
    if (!userInfo?.uid) {
      Alert.alert("Error", "Please sign in to continue")
      return
    }

    Keyboard.dismiss()
    const success = await startMatching("venter", ventText.trim())

    if (!success) {
      Alert.alert("Error", "Failed to start matching. Please try again.")
    }
  }

  const dismissKeyboard = () => {
    Keyboard.dismiss()
  }

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
      <View style={{ flex: 1 }}>
        <GradientContainer>
          <StatusBar />
          <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
          >
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.anonymousText}>
                {userInfo?.isAnonymous ? "You are anonymous" : `Welcome, ${userInfo?.displayName || "User"}`}
              </Text>

              <View style={styles.mainContent}>
                <Text style={styles.title}>What's on{"\n"}your mind?</Text>

                <View style={styles.inputContainer}>
                  <TextInput
                    ref={textInputRef}
                    style={styles.textInput}
                    placeholder="I feel like..."
                    placeholderTextColor={theme.colors.text.muted}
                    value={ventText}
                    onChangeText={setVentText}
                    multiline
                    maxLength={VALIDATION.VENT_TEXT.MAX_LENGTH}
                    textAlignVertical="top"
                    returnKeyType="default"
                    blurOnSubmit={false}
                    scrollEnabled={true}
                  />
                  <Text style={styles.characterCount}>
                    {ventText.length}/{VALIDATION.VENT_TEXT.MAX_LENGTH}
                  </Text>
                </View>

                <Text style={styles.helperText}>Share your thoughts anonymously</Text>

                {isMatching && (
                  <View style={styles.matchingContainer}>
                    <Text style={styles.matchingText}>🔍 Finding a listener...</Text>
                    <Text style={styles.matchingSubtext}>This may take a few moments</Text>
                  </View>
                )}
              </View>

              <View style={styles.buttonContainer}>
                <Button
                  title={isMatching ? "Finding Listener..." : "Submit Vent"}
                  onPress={handleSubmitVent}
                  disabled={!ventText.trim() || isMatching}
                  loading={isMatching}
                />

                {!isMatching && (
                  <Button
                    title="Back to Dashboard"
                    onPress={() => router.push("/dashboard-screen")}
                    variant="outline"
                    style={styles.backButton}
                  />
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </GradientContainer>
      </View>
    </TouchableWithoutFeedback>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
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
    minHeight: 400,
  },
  title: {
    color: theme.colors.text.primary,
    ...theme.typography.h1,
    fontSize: 36,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
    lineHeight: 44,
  },
  inputContainer: {
    width: "100%",
    marginBottom: theme.spacing.xl,
    position: "relative",
  },
  textInput: {
    borderWidth: 2,
    borderColor: theme.colors.overlayStrong,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    color: theme.colors.text.primary,
    ...theme.typography.body,
    minHeight: 120,
    maxHeight: 200,
    textAlignVertical: "top",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  characterCount: {
    color: theme.colors.text.muted,
    ...theme.typography.small,
    textAlign: "right",
    marginTop: 5,
  },
  helperText: {
    color: theme.colors.text.tertiary,
    ...theme.typography.body,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  matchingContainer: {
    backgroundColor: "rgba(79, 70, 229, 0.2)",
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: "#4f46e5",
    alignItems: "center",
    marginTop: theme.spacing.lg,
  },
  matchingText: {
    color: "#4f46e5",
    ...theme.typography.body,
    fontWeight: "600",
    marginBottom: 5,
  },
  matchingSubtext: {
    color: "rgba(79, 70, 229, 0.8)",
    ...theme.typography.caption,
  },
  buttonContainer: {
    paddingBottom: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
  },
  backButton: {
    marginTop: theme.spacing.md,
  },
})