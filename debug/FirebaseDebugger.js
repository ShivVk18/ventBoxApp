"use client"

import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native"

import FirebaseSetup from "../scripts/setupFirebase"
import firestoreService from "../services/firestoreService"
import Button from "../components/ui/Button"

const FirebaseDebugger = ({ visible = false }) => {
  const [status, setStatus] = useState("idle")
  const [logs, setLogs] = useState([])

  if (!visible) return null

  const addLog = (message, type = "info") => {
    setLogs((prev) => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }])
  }

  const handleSetupFirebase = async () => {
    try {
      setStatus("setting_up")
      setLogs([])
      addLog("Starting Firebase setup...", "info")

      await FirebaseSetup.setupDatabase()
      addLog("✅ Firebase setup completed!", "success")
      setStatus("success")

      Alert.alert("Success", "Firebase has been set up successfully!")
    } catch (error) {
      addLog(`❌ Setup failed: ${error.message}`, "error")
      setStatus("error")
      Alert.alert("Error", `Setup failed: ${error.message}`)
    }
  }

  const handleTestStats = async () => {
    try {
      addLog("Testing stats...", "info")
      const stats = await firestoreService.getQueueStats()
      addLog(`Stats: ${JSON.stringify(stats)}`, "success")
    } catch (error) {
      addLog(`Stats test failed: ${error.message}`, "error")
    }
  }

  const handleTestQueue = async () => {
    try {
      addLog("Testing queue operations...", "info")

      // Test add to queue
      const queueData = await firestoreService.addToQueue("test_user", "venter", "Test vent")
      addLog(`Added to queue: ${queueData.queueDocId}`, "success")

      // Test remove from queue
      await firestoreService.removeFromQueue(queueData.queueDocId)
      addLog("Removed from queue successfully", "success")
    } catch (error) {
      addLog(`Queue test failed: ${error.message}`, "error")
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Firebase Debugger</Text>

      <View style={styles.actions}>
        <Button
          title="Setup Firebase"
          onPress={handleSetupFirebase}
          loading={status === "setting_up"}
          style={styles.button}
        />
        <Button title="Test Stats" onPress={handleTestStats} variant="outline" style={styles.button} />
        <Button title="Test Queue" onPress={handleTestQueue} variant="outline" style={styles.button} />
      </View>

      <ScrollView style={styles.logsContainer}>
        {logs.map((log, index) => (
          <Text
            key={index}
            style={[
              styles.logText,
              log.type === "error" && styles.errorLog,
              log.type === "success" && styles.successLog,
            ]}
          >
            [{log.timestamp}] {log.message}
          </Text>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    left: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    borderRadius: 10,
    padding: 15,
    maxHeight: 500,
    zIndex: 1000,
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    marginBottom: 15,
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
    marginVertical: 5,
  },
  logsContainer: {
    maxHeight: 200,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 5,
    padding: 10,
  },
  logText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "monospace",
    marginBottom: 2,
  },
  errorLog: {
    color: "#ff6b6b",
  },
  successLog: {
    color: "#4ade80",
  },
})

export default FirebaseDebugger