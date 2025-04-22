"use client"

import { useEffect } from "react"
import { initializeData } from "@/lib/data-service"

export function DataInitializer() {
  useEffect(() => {
    initializeData()
  }, [])

  return null
}
