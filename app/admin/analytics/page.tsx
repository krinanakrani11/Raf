"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth-provider"
import { ProtectedRoute } from "@/components/protected-route"
import { getAnalytics } from "@/lib/data-service"
import { ArrowLeft, Users, MapPin, ClipboardList, TrendingUp } from "lucide-react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, BarChart, Bar } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

export default function AdminAnalytics() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState({
    users: 0,
    approvedBreakers: 0,
    pendingReports: 0,
    recentReports: 0,
  })

  // Mock data for charts
  const monthlyData = [
    { name: "Jan", reports: 4, approvals: 3 },
    { name: "Feb", reports: 6, approvals: 5 },
    { name: "Mar", reports: 8, approvals: 7 },
    { name: "Apr", reports: 10, approvals: 8 },
    { name: "May", reports: 7, approvals: 6 },
    { name: "Jun", reports: 9, approvals: 8 },
  ]

  const locationData = [
    { name: "Downtown", count: 12 },
    { name: "Uptown", count: 8 },
    { name: "Midtown", count: 6 },
    { name: "Suburbs", count: 4 },
    { name: "Highway", count: 10 },
  ]

  useEffect(() => {
    setAnalytics(getAnalytics())
  }, [])

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Link href="/admin/dashboard">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-muted-foreground mr-2" />
                  <div className="text-2xl font-bold">{analytics.users}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Approved Speed Breakers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-muted-foreground mr-2" />
                  <div className="text-2xl font-bold">{analytics.approvedBreakers}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <ClipboardList className="h-5 w-5 text-muted-foreground mr-2" />
                  <div className="text-2xl font-bold">{analytics.pendingReports}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Reports This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 text-muted-foreground mr-2" />
                  <div className="text-2xl font-bold">{analytics.recentReports}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Reports & Approvals</CardTitle>
                <CardDescription>Number of reports submitted and approved per month</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    reports: {
                      label: "Reports",
                      color: "hsl(var(--chart-1))",
                    },
                    approvals: {
                      label: "Approvals",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Line type="monotone" dataKey="reports" stroke="var(--color-reports)" />
                      <Line type="monotone" dataKey="approvals" stroke="var(--color-approvals)" />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Speed Breakers by Location</CardTitle>
                <CardDescription>Distribution of speed breakers across different areas</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    count: {
                      label: "Count",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={locationData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--color-count)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
              <CardDescription>Summary of system performance and usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-100 rounded-md">
                    <h3 className="font-medium mb-2">User Engagement</h3>
                    <p className="text-sm text-muted-foreground">
                      The system has {analytics.users} registered users who have reported a total of{" "}
                      {analytics.approvedBreakers + analytics.pendingReports} speed breakers.
                    </p>
                  </div>

                  <div className="p-4 bg-gray-100 rounded-md">
                    <h3 className="font-medium mb-2">Approval Rate</h3>
                    <p className="text-sm text-muted-foreground">
                      {analytics.approvedBreakers > 0
                        ? `${Math.round((analytics.approvedBreakers / (analytics.approvedBreakers + analytics.pendingReports)) * 100)}% of all reports have been approved.`
                        : "No reports have been approved yet."}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-gray-100 rounded-md">
                  <h3 className="font-medium mb-2">System Health</h3>
                  <p className="text-sm text-muted-foreground">
                    All system components are functioning normally. Data is being stored locally in the browser.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  )
}
