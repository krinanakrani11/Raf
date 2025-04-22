"use client"

import NavigationMap from "./components/navigation-map"

export default function NavigationDemo() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Navigation Map</h1>
          <p className="text-gray-600">
            Search for locations, get directions, and navigate between points in Gujarat, India.
          </p>
        </div>

        <NavigationMap />
      </div>
    </div>
  )
}
