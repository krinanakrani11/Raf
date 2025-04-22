"use client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth-provider"
import { ProtectedRoute } from "@/components/protected-route"
import { MapIcon, AlertCircle, User, Bell } from "lucide-react"

export default function UserDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const menuItems = [
    {
      title: "View Speed Breaker Map",
      description: "See all reported speed breakers on a map",
      icon: <MapIcon className="h-8 w-8" />,
      path: "/user/map",
    },
    {
      title: "Report New Speed Breaker",
      description: "Submit a new speed breaker report",
      icon: <AlertCircle className="h-8 w-8" />,
      path: "/user/report",
    },
    {
      title: "My Alert Settings",
      description: "Customize your notification preferences",
      icon: <Bell className="h-8 w-8" />,
      path: "/user/alerts",
    },
    {
      title: "My Profile",
      description: "View and edit your profile information",
      icon: <User className="h-8 w-8" />,
      path: "/user/profile",
    },
  ]

  return (
    <ProtectedRoute requiredRole="user">
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">User Dashboard</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {menuItems.map((item) => (
              <Link href={item.path} key={item.title}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="flex flex-row items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">{item.icon}</div>
                    <div>
                      <CardTitle>{item.title}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
