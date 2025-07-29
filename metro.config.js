const { getDefaultConfig } = require("expo/metro-config")

const config = getDefaultConfig(__dirname)

config.resolver.sourceExts.push("jsx", "js", "ts", "tsx")


config.resolver.assetExts.push("db", "mp3", "ttf", "obj", "png", "jpg")

// Configure transformer for better compatibility
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
})

// Ensure proper platform extensions
config.resolver.platforms = ["native", "android", "ios", "web"]

module.exports = config
