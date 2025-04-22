"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth-provider"
import { ProtectedRoute } from "@/components/protected-route"
import { getApprovedSpeedBreakers, type SpeedBreaker } from "@/lib/data-service"
import { ArrowLeft, Info } from "lucide-react"
import LeafletMap from "@/components/leaflet-map"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SpeedBreakerMap() {
  const { user } = useAuth()
  const [speedBreakers, setSpeedBreakers] = useState<SpeedBreaker[]>([])
  const [showTip, setShowTip] = useState(true)

  useEffect(() => {
    loadSpeedBreakers()
  }, [])

  const loadSpeedBreakers = () => {
    const approved = getApprovedSpeedBreakers()
    setSpeedBreakers(approved)
  }

  return (
    <ProtectedRoute requiredRole="user">
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Link href="/user/dashboard">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Speed Breaker Map</h1>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {showTip && (
            <Alert className="mb-4 bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-blue-700">
                New feature: Use the search box in the top-right corner of the map to search for any address or
                location.
                <Button variant="link" className="p-0 h-auto text-blue-600" onClick={() => setShowTip(false)}>
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Speed Breaker Map</CardTitle>
              <CardDescription>
                View all speed breakers on the map, search for addresses, and navigate with alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeafletMap speedBreakers={speedBreakers} height="500px" showNavigation={true} />
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  )
}
