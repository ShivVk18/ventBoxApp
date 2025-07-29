import { createContext, useContext, useState, useCallback } from "react"
import { router } from "expo-router"
import { ROUTES } from "../app/navigation/routes"

const NavigationContext = createContext({})

export const useNavigation = () => {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider")
  }
  return context
}

export const NavigationProvider = ({ children }) => {
  const [currentFlow, setCurrentFlow] = useState(null)
  const [navigationHistory, setNavigationHistory] = useState([])

  const navigateWithFlow = useCallback((route, params = {}, flow = null) => {
    
    setNavigationHistory((prev) => [...prev, route])

   
    if (flow) {
      setCurrentFlow(flow)
    }

   
    router.push({
      pathname: route,
      params,
    })
  }, [])

  const navigateReplace = useCallback((route, params = {}) => {
    router.replace({
      pathname: route,
      params,
    })
  }, [])

  const goBack = useCallback(() => {
    if (navigationHistory.length > 1) {
      const newHistory = [...navigationHistory]
      newHistory.pop() 
      const previousRoute = newHistory[newHistory.length - 1]

      setNavigationHistory(newHistory)
      router.back()
    } else {
      // Fallback to dashboard if no history
      navigateReplace(ROUTES.DASHBOARD)
    }
  }, [navigationHistory, navigateReplace])

  const resetToRoute = useCallback(
    (route, params = {}) => {
      setNavigationHistory([route])
      setCurrentFlow(null)
      navigateReplace(route, params)
    },
    [navigateReplace],
  )

  // Flow-specific navigation helpers
  const startVentingFlow = useCallback(
    (params = {}) => {
      navigateWithFlow(ROUTES.VENT_SUBMIT, params, "VENTING")
    },
    [navigateWithFlow],
  )

  const startListeningFlow = useCallback(
    (params = {}) => {
      navigateWithFlow(ROUTES.LISTENER, params, "LISTENING")
    },
    [navigateWithFlow],
  )

  const startVoiceSession = useCallback(
    (params = {}) => {
      navigateWithFlow(ROUTES.VOICE_CALL, params, "VOICE_SESSION")
    },
    [navigateWithFlow],
  )

  const endSession = useCallback(
    (params = {}) => {
      navigateWithFlow(ROUTES.SESSION_ENDED, params, "VOICE_SESSION")
    },
    [navigateWithFlow],
  )

  const returnToDashboard = useCallback(() => {
    resetToRoute(ROUTES.DASHBOARD)
  }, [resetToRoute])

  const value = {
    currentFlow,
    navigationHistory,
    navigateWithFlow,
    navigateReplace,
    goBack,
    resetToRoute,
    startVentingFlow,
    startListeningFlow,
    startVoiceSession,
    endSession,
    returnToDashboard,
  }

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}
