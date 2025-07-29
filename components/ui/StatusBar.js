import React from "react"
import { StatusBar as ExpoStatusBar } from "expo-status-bar"
import { Platform } from "react-native"
import { theme } from "../../config/theme"

const StatusBar = ({ style = "light" }) => {
  return (
    <ExpoStatusBar
      style={style}
      backgroundColor={Platform.OS === "android" ? theme.colors.background.primary : "transparent"}
      translucent={Platform.OS === "android"}
    />
  )
}

export default React.memo(StatusBar)
