module.exports = (api) => {
  api.cache(true)
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Removed "expo-router/babel" as it's deprecated in SDK 50
      // babel-preset-expo now handles expo-router automatically
    ],
  }
}
