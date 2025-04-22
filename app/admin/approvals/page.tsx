"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth-provider"
import { ProtectedRoute } from "@/components/protected-route"
import { getPendingReports, approveReport, rejectReport, type SpeedBreaker } from "@/lib/data-service"
import { ArrowLeft, Check, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function AdminApprovals() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [pendingReports, setPendingReports] = useState<SpeedBreaker[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadPendingReports()
  }, [])

  const loadPendingReports = () => {
    setPendingReports(getPendingReports())
  }

  const handleApprove = (id: string) => {
    setIsLoading(true)

    try {
      approveReport(id)
      loadPendingReports()

      toast({
        title: "Report Approved",
        description: "The speed breaker report has been approved",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error approving the report",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReject = (id: string) => {
    setIsLoading(true)

    try {
      rejectReport(id)
      loadPendingReports()

      toast({
        title: "Report Rejected",
        description: "The speed breaker report has been rejected",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error rejecting the report",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

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
              <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Review Pending Reports</CardTitle>
              <CardDescription>Approve or reject speed breaker reports submitted by users</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No pending reports to review</div>
              ) : (
                <div className="space-y-4">
                  {pendingReports.map((report) => (
                    <Card key={report.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{report.location}</h3>
                            <p className="text-sm text-muted-foreground">
                              Reported on {new Date(report.reportedAt).toLocaleDateString()}
                            </p>
                            <p className="mt-2">{report.description}</p>
                            <div className="mt-2 text-sm">
                              <span className="text-muted-foreground">Coordinates: </span>
                              {report.latitude}, {report.longitude}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleApprove(report.id)}
                              disabled={isLoading}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleReject(report.id)}
                              disabled={isLoading}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  )
}
