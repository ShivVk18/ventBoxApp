import React from "react"
import { View, Text, StyleSheet } from "react-native"
import { theme } from "../../config/theme"

const Avatar = ({ emoji = "💭", size = 80, backgroundColor }) => {
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: backgroundColor || theme.colors.overlay,
  }

  const emojiStyle = {
    fontSize: size * 0.6,
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.emoji, emojiStyle]}>{emoji}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: theme.colors.overlayStrong,
    ...theme.shadows.medium,
  },
  emoji: {
    textAlign: "center",
  },
})

export default React.memo(Avatar)