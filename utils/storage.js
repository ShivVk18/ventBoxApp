import AsyncStorage from "@react-native-async-storage/async-storage"
import * as SecureStore from "expo-secure-store"

class StorageService {
 
  async setSecureItem(key, value) {
    try {
      await SecureStore.setItemAsync(key, JSON.stringify(value))
    } catch (error) {
      console.error("Error setting secure item:", error)
      throw error
    }
  }

  async getSecureItem(key) {
    try {
      const value = await SecureStore.getItemAsync(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error("Error getting secure item:", error)
      return null
    }
  }

  async removeSecureItem(key) {
    try {
      await SecureStore.deleteItemAsync(key)
    } catch (error) {
      console.error("Error removing secure item:", error)
    }
  }

  // Regular storage for non-sensitive data
  async setItem(key, value) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error("Error setting item:", error)
      throw error
    }
  }

  async getItem(key) {
    try {
      const value = await AsyncStorage.getItem(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error("Error getting item:", error)
      return null
    }
  }

  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key)
    } catch (error) {
      console.error("Error removing item:", error)
    }
  }

  async clear() {
    try {
      await AsyncStorage.clear()
    } catch (error) {
      console.error("Error clearing storage:", error)
    }
  }
}

export default new StorageService()