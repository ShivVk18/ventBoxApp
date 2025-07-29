import React from "react"
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native"
import { theme } from "../../config/theme"

const Button = ({ title, onPress, variant = "primary", disabled = false, loading = false, style, textStyle }) => {
  const getButtonStyle = () => {
    const baseStyle = [styles.button]

    switch (variant) {
      case "secondary":
        baseStyle.push(styles.secondary)
        break
      case "outline":
        baseStyle.push(styles.outline)
        break
      case "ghost":
        baseStyle.push(styles.ghost)
        break
      default:
        baseStyle.push(styles.primary)
    }

    if (disabled || loading) {
      baseStyle.push(styles.disabled)
    }

    return baseStyle
  }

  const getTextStyle = () => {
    const baseStyle = [styles.text]

    switch (variant) {
      case "secondary":
        baseStyle.push(styles.secondaryText)
        break
      case "outline":
        baseStyle.push(styles.outlineText)
        break
      case "ghost":
        baseStyle.push(styles.ghostText)
        break
      default:
        baseStyle.push(styles.primaryText)
    }

    if (disabled || loading) {
      baseStyle.push(styles.disabledText)
    }

    return baseStyle
  }

  return (
    <TouchableOpacity
      style={[...getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" || variant === "ghost" ? theme.colors.primary : "#fff"} />
      ) : (
        <Text style={[...getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    ...theme.shadows.small,
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.overlay,
    borderWidth: 1,
    borderColor: theme.colors.overlayStrong,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...theme.typography.body,
    fontWeight: "600",
    textAlign: "center",
  },
  primaryText: {
    color: "#000",
  },
  secondaryText: {
    color: theme.colors.text.primary,
  },
  outlineText: {
    color: theme.colors.primary,
  },
  ghostText: {
    color: theme.colors.text.secondary,
  },
  disabledText: {
    opacity: 0.7,
  },
})

export default React.memo(Button)
