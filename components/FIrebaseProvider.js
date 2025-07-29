import { useEffect, useState } from "react"
import { View, Text, StyleSheet } from "react-native"
import { auth } from "../config/firebase.config"
import { onAuthStateChanged } from "firebase/auth"

const FirebaseProvider = ({ children }) => {
  const [initializing, setInitializing] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, (user) => {
      setUser(user)
      if (initializing) setInitializing(false)
    })

    return subscriber 
  }, [initializing])

  if (initializing) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    )
  }

  return children
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
  },
  text: {
    color: "white",
    fontSize: 18,
  },
})

export default FirebaseProvider
