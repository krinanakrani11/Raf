"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./auth-provider"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole: "admin" | "user"
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      if (requiredRole === "admin") {
        router.push("/admin/login")
      } else {
        router.push("/user/login")
      }
    } else if (!isLoading && user && user.role !== requiredRole) {
      if (user.role === "admin") {
        router.push("/admin/dashboard")
      } else {
        router.push("/user/dashboard")
      }
    }
  }, [user, isLoading, router, requiredRole])

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user || user.role !== requiredRole) {
    return null
  }

  return <>{children}</>
}
