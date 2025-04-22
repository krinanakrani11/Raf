import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Speed Breaker Management System</CardTitle>
          <CardDescription>Report and manage speed breakers in your area</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Link href="/admin/login" className="w-full">
            <Button className="w-full" variant="default">
              Admin Login
            </Button>
          </Link>
          <Link href="/user/login" className="w-full">
            <Button className="w-full" variant="outline">
              User Login
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
