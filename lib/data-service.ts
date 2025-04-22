"use client"

// Types
export interface SpeedBreaker {
  id: string
  location: string
  latitude: number
  longitude: number
  description: string
  reportedBy: string
  reportedAt: string
  status: "pending" | "approved" | "rejected"
  image?: string
  severity?: "low" | "medium" | "high"
}

export interface AlertSettings {
  userId: string
  notifyNewBreakers: boolean
  notifyNearby: boolean
  distanceThreshold: number
  emailNotifications: boolean
  pushNotifications: boolean
}

// Initialize localStorage with default data if empty
export function initializeData() {
  if (typeof window === "undefined") return

  // Initialize speed breakers if not exists
  if (!localStorage.getItem("speedBreakers")) {
    const defaultSpeedBreakers: SpeedBreaker[] = [
      {
        id: "sb-1",
        location: "Navsari Railway Station",
        latitude: 20.9467,
        longitude: 72.952,
        description: "Large speed breaker near the railway station entrance",
        reportedBy: "user-1",
        reportedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "approved",
        severity: "high",
      },
      {
        id: "sb-2",
        location: "Abrama Road, Navsari",
        latitude: 20.95,
        longitude: 72.955,
        description: "Small speed breaker with yellow markings",
        reportedBy: "user-2",
        reportedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: "approved",
        severity: "low",
      },
      {
        id: "sb-3",
        location: "Dudhia Talav, Navsari",
        latitude: 20.948,
        longitude: 72.953,
        description: "Medium sized pothole in the middle of the road",
        reportedBy: "user-1",
        reportedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: "approved",
        severity: "medium",
      },
      {
        id: "sb-4",
        location: "Navsari College Road",
        latitude: 20.951,
        longitude: 72.954,
        description: "New speed breaker installed last week",
        reportedBy: "user-3",
        reportedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: "approved",
        severity: "medium",
      },
      {
        id: "sb-5",
        location: "Lunsikui Road, Navsari",
        latitude: 20.949,
        longitude: 72.951,
        description: "Deep pothole causing traffic slowdown",
        reportedBy: "user-2",
        reportedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: "approved",
        severity: "high",
      },
    ]
    localStorage.setItem("speedBreakers", JSON.stringify(defaultSpeedBreakers))
  }

  // Initialize pending reports if not exists
  if (!localStorage.getItem("pendingReports")) {
    const defaultPendingReports: SpeedBreaker[] = [
      {
        id: "sb-6",
        location: "Jalalpore Road, Navsari",
        latitude: 20.952,
        longitude: 72.956,
        description: "New speed breaker installed last week",
        reportedBy: "user-3",
        reportedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: "pending",
        severity: "medium",
      },
      {
        id: "sb-7",
        location: "Navsari Agricultural University",
        latitude: 20.953,
        longitude: 72.957,
        description: "Deep pothole causing traffic slowdown",
        reportedBy: "user-2",
        reportedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: "pending",
        severity: "high",
      },
    ]
    localStorage.setItem("pendingReports", JSON.stringify(defaultPendingReports))
  }
}

// Speed Breaker Functions
export function getApprovedSpeedBreakers(): SpeedBreaker[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem("speedBreakers")
  return data ? JSON.parse(data) : []
}

export function getPendingReports(): SpeedBreaker[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem("pendingReports")
  return data ? JSON.parse(data) : []
}

export function reportSpeedBreaker(speedBreaker: Omit<SpeedBreaker, "id" | "status" | "reportedAt">): void {
  if (typeof window === "undefined") return

  const pendingReports = getPendingReports()
  const newReport: SpeedBreaker = {
    ...speedBreaker,
    id: `sb-${Date.now()}`,
    status: "pending",
    reportedAt: new Date().toISOString(),
  }

  pendingReports.push(newReport)
  localStorage.setItem("pendingReports", JSON.stringify(pendingReports))
}

export function approveReport(reportId: string): void {
  if (typeof window === "undefined") return

  const pendingReports = getPendingReports()
  const approvedReport = pendingReports.find((report) => report.id === reportId)

  if (approvedReport) {
    // Remove from pending
    const updatedPendingReports = pendingReports.filter((report) => report.id !== reportId)
    localStorage.setItem("pendingReports", JSON.stringify(updatedPendingReports))

    // Add to approved
    const speedBreakers = getApprovedSpeedBreakers()
    approvedReport.status = "approved"
    speedBreakers.push(approvedReport)
    localStorage.setItem("speedBreakers", JSON.stringify(speedBreakers))
  }
}

export function rejectReport(reportId: string): void {
  if (typeof window === "undefined") return

  const pendingReports = getPendingReports()
  const updatedPendingReports = pendingReports.filter((report) => report.id !== reportId)
  localStorage.setItem("pendingReports", JSON.stringify(updatedPendingReports))
}

export function updateSpeedBreaker(updatedBreaker: SpeedBreaker): void {
  if (typeof window === "undefined") return

  const speedBreakers = getApprovedSpeedBreakers()
  const updatedBreakers = speedBreakers.map((breaker) => (breaker.id === updatedBreaker.id ? updatedBreaker : breaker))

  localStorage.setItem("speedBreakers", JSON.stringify(updatedBreakers))
}

export function deleteSpeedBreaker(breakerId: string): void {
  if (typeof window === "undefined") return

  const speedBreakers = getApprovedSpeedBreakers()
  const updatedBreakers = speedBreakers.filter((breaker) => breaker.id !== breakerId)

  localStorage.setItem("speedBreakers", JSON.stringify(updatedBreakers))
}

// Alert Settings Functions
export function getAlertSettings(userId: string): AlertSettings {
  if (typeof window === "undefined") return defaultAlertSettings(userId)

  const allSettings = JSON.parse(localStorage.getItem("alertSettings") || "{}")
  return allSettings[userId] || defaultAlertSettings(userId)
}

export function updateAlertSettings(userId: string, settings: Partial<AlertSettings>): void {
  if (typeof window === "undefined") return

  const allSettings = JSON.parse(localStorage.getItem("alertSettings") || "{}")
  allSettings[userId] = { ...getAlertSettings(userId), ...settings }

  localStorage.setItem("alertSettings", JSON.stringify(allSettings))
}

function defaultAlertSettings(userId: string): AlertSettings {
  return {
    userId,
    notifyNewBreakers: true,
    notifyNearby: true,
    distanceThreshold: 1000, // meters
    emailNotifications: true,
    pushNotifications: false,
  }
}

// Analytics Functions
export function getAnalytics() {
  if (typeof window === "undefined") return { users: 0, approvedBreakers: 0, pendingReports: 0 }

  const users = JSON.parse(localStorage.getItem("users") || "[]")
  const speedBreakers = getApprovedSpeedBreakers()
  const pendingReports = getPendingReports()

  return {
    users: users.length,
    approvedBreakers: speedBreakers.length,
    pendingReports: pendingReports.length,
    recentReports:
      pendingReports.length +
      speedBreakers.filter((sb) => new Date(sb.reportedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
  }
}
