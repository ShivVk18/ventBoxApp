"use client"

import { View, Text, StyleSheet, ScrollView } from "react-native"
import { useAuth } from "../../context/AuthContext"
import Button from "../ui/Button"
import { __DEV__ } from "react-native"

const AuthDebugger = ({ visible = false }) => {
  const { user, userInfo, loading, error, initialized, signInAnonymous, signOutUser } = useAuth()

  if (!visible || !__DEV__) {
    return null
  }

  const handleTestSignIn = async () => {
    try {
      await signInAnonymous()
    } catch (error) {
      console.error("Test sign in failed:", error)
    }
  }

  const handleTestSignOut = async () => {
    try {
      await signOutUser()
    } catch (error) {
      console.error("Test sign out failed:", error)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Auth Debugger</Text>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Auth State</Text>
          <Text style={styles.debugText}>Loading: {loading ? "Yes" : "No"}</Text>
          <Text style={styles.debugText}>Initialized: {initialized ? "Yes" : "No"}</Text>
          <Text style={styles.debugText}>Has User: {user ? "Yes" : "No"}</Text>
          <Text style={styles.debugText}>Has UserInfo: {userInfo ? "Yes" : "No"}</Text>
          <Text style={styles.debugText}>Error: {error || "None"}</Text>
        </View>

        {user && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>User Details</Text>
            <Text style={styles.debugText}>UID: {user.uid}</Text>
            <Text style={styles.debugText}>Anonymous: {user.isAnonymous ? "Yes" : "No"}</Text>
            <Text style={styles.debugText}>Email: {user.email || "None"}</Text>
          </View>
        )}

        {userInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>User Info</Text>
            <Text style={styles.debugText}>Display Name: {userInfo.displayName}</Text>
            <Text style={styles.debugText}>Session ID: {userInfo.sessionId}</Text>
            <Text style={styles.debugText}>Created: {userInfo.createdAt}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <Button title="Test Sign In" onPress={handleTestSignIn} variant="outline" style={styles.button} />
          <Button title="Test Sign Out" onPress={handleTestSignOut} variant="outline" style={styles.button} />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    borderRadius: 10,
    padding: 15,
    maxHeight: 400,
    zIndex: 1000,
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  content: {
    maxHeight: 300,
  },
  section: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 5,
  },
  sectionTitle: {
    color: "#4ade80",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
  },
  debugText: {
    color: "#fff",
    fontSize: 12,
    marginBottom: 2,
    fontFamily: "monospace",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
})

export default AuthDebugger
  