import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { AuthProvider } from "../context/AuthContext"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { Platform } from "react-native"

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" backgroundColor="#1a1a40" translucent={Platform.OS === "android"} />
        <Stack
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: "#1a1a40" },
            animation: Platform.OS === "ios" ? "slide_from_right" : "slide_from_bottom",
            gestureEnabled: true,
            contentStyle: { backgroundColor: "#1a1a40" },
          }}
        >
          <Stack.Screen name="index" options={{ title: "Welcome", gestureEnabled: false }} />
          <Stack.Screen name="dashboard-screen" options={{ title: "Dashboard", gestureEnabled: false }} />
          <Stack.Screen name="vent-submitted" options={{ title: "Share Thoughts", gestureEnabled: true }} />
          <Stack.Screen name="listener" options={{ title: "Listener Mode", gestureEnabled: true }} />
          <Stack.Screen
            name="voice-call"
            options={{ title: "Voice Session", gestureEnabled: false, presentation: "fullScreenModal" }}
          />
          <Stack.Screen name="session-ended" options={{ title: "Session Complete", gestureEnabled: false }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  )
}