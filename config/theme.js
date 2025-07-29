export const theme = {
  colors: {
    primary: "#FFC940",
    primaryDark: "#E6B533",
    primaryTransparent: "rgba(255, 201, 64, 0.15)", // ✅ Added
    secondary: "#4ade80",
    background: {
      primary: "#1a1a40",
      secondary: "#0f0f2e",
      tertiary: "#2a2a5a",
    },
    text: {
      primary: "#ffffff",
      secondary: "rgba(255, 255, 255, 0.8)",
      tertiary: "rgba(255, 255, 255, 0.6)",
      muted: "rgba(255, 255, 255, 0.4)",
      dark: "#000000", // ✅ Added
    },
    error: "#ef4444",
    warning: "#f59e0b",
    success: "#10b981",
    info: "#3b82f6",
    overlay: "rgba(255, 255, 255, 0.1)",
    overlayStrong: "rgba(255, 255, 255, 0.2)",
    border: "#3e3e5c", // optional: added for modal footer separator
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: "bold" },
    h2: { fontSize: 24, fontWeight: "bold" },
    h3: { fontSize: 20, fontWeight: "600" },
    h4: { fontSize: 18, fontWeight: "600" },
    body: { fontSize: 16, fontWeight: "400" },
    caption: { fontSize: 14, fontWeight: "400" },
    small: { fontSize: 12, fontWeight: "400" },
  },
  shadows: {
    small: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    medium: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
    },
  },
}