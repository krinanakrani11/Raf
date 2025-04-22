"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"

type UserRole = "admin" | "user" | null
type User = {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  role: UserRole
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string, role: UserRole) => Promise<boolean>
  register: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  updateUserProfile: (userData: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string, role: UserRole): Promise<boolean> => {
    setIsLoading(true)

    try {
      if (role === "admin") {
        // Admin login with hardcoded credentials
        if (email === "admin@example.com" && password === "admin123") {
          const adminUser = {
            id: "admin-1",
            name: "Admin",
            email: "admin@example.com",
            role: "admin" as UserRole,
          }
          setUser(adminUser)
          localStorage.setItem("currentUser", JSON.stringify(adminUser))
          return true
        }
        return false
      } else {
        // User login
        const users = JSON.parse(localStorage.getItem("users") || "[]")
        const foundUser = users.find((u: any) => u.email === email && u.password === password)

        if (foundUser) {
          const loggedInUser = {
            id: foundUser.id,
            name: foundUser.name,
            email: foundUser.email,
            phone: foundUser.phone,
            address: foundUser.address,
            role: "user" as UserRole,
          }
          setUser(loggedInUser)
          localStorage.setItem("currentUser", JSON.stringify(loggedInUser))
          return true
        }
        return false
      }
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true)

    try {
      const users = JSON.parse(localStorage.getItem("users") || "[]")

      // Check if user already exists
      if (users.some((u: any) => u.email === email)) {
        return false
      }

      // Create new user
      const newUser = {
        id: `user-${Date.now()}`,
        name,
        email,
        password,
        role: "user" as UserRole,
      }

      // Save to localStorage
      users.push(newUser)
      localStorage.setItem("users", JSON.stringify(users))
      return true
    } finally {
      setIsLoading(false)
    }
  }

  const updateUserProfile = (userData: Partial<User>) => {
    if (!user) return

    const updatedUser = { ...user, ...userData }
    setUser(updatedUser)
    localStorage.setItem("currentUser", JSON.stringify(updatedUser))

    // Also update in the users array
    const users = JSON.parse(localStorage.getItem("users") || "[]")
    const updatedUsers = users.map((u: any) => (u.id === user.id ? { ...u, ...userData } : u))
    localStorage.setItem("users", JSON.stringify(updatedUsers))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("currentUser")
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
