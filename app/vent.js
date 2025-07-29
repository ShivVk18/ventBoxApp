"use client"

import { useEffect } from "react"
import { router } from "expo-router"


export default function VentScreen() {
  useEffect(() => {
    router.replace("/vent-submitted")
  }, [])

  return null
}
