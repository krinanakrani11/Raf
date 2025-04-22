"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { useAuth } from "@/components/auth-provider"
import { ProtectedRoute } from "@/components/protected-route"
import { getAlertSettings, updateAlertSettings, type AlertSettings } from "@/lib/data-service"
import { ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function AlertSettingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [settings, setSettings] = useState<AlertSettings | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setSettings(getAlertSettings(user.id))
    }
  }, [user])

  const handleToggleChange = (field: keyof AlertSettings) => {
    if (!settings) return

    setSettings({
      ...settings,
      [field]: !settings[field],
    })
  }

  const handleSliderChange = (value: number[]) => {
    if (!settings) return

    setSettings({
      ...settings,
      distanceThreshold: value[0],
    })
  }

  const handleSave = () => {
    if (!user || !settings) return

    setIsSaving(true)

    try {
      updateAlertSettings(user.id, settings)

      toast({
        title: "Settings Saved",
        description: "Your alert settings have been updated",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error saving your settings",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!settings) {
    return <div>Loading...</div>
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
              <h1 className="text-2xl font-bold text-gray-900">Alert Settings</h1>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Customize how and when you receive alerts about speed breakers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-new">Notify about new speed breakers</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications when new speed breakers are approved
                  </p>
                </div>
                <Switch
                  id="notify-new"
                  checked={settings.notifyNewBreakers}
                  onCheckedChange={() => handleToggleChange("notifyNewBreakers")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-nearby">Notify about nearby speed breakers</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications when you are near a speed breaker
                  </p>
                </div>
                <Switch
                  id="notify-nearby"
                  checked={settings.notifyNearby}
                  onCheckedChange={() => handleToggleChange("notifyNearby")}
                />
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="distance">Distance threshold (meters)</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive alerts when you are within this distance of a speed breaker
                  </p>
                </div>
                <Slider
                  id="distance"
                  defaultValue={[settings.distanceThreshold]}
                  max={2000}
                  min={100}
                  step={100}
                  onValueChange={handleSliderChange}
                  disabled={!settings.notifyNearby}
                />
                <div className="text-right text-sm">{settings.distanceThreshold} meters</div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={settings.emailNotifications}
                  onCheckedChange={() => handleToggleChange("emailNotifications")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications">Push notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive push notifications in your browser</p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={settings.pushNotifications}
                  onCheckedChange={() => handleToggleChange("pushNotifications")}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Settings"}
              </Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  )
}
