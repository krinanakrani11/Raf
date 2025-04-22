"use client"

import { useState } from "react"
import SearchAutocomplete from "./components/search-autocomplete"

export default function SearchDemo() {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)

  const handleSelect = (location: string) => {
    setSelectedLocation(location)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-8">
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-md overflow-hidden p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Location Search</h1>
          <p className="text-gray-600 mb-6">Search for locations in Gujarat. Try typing "Valsad" to see suggestions.</p>

          <SearchAutocomplete placeholder="Search for a location in Gujarat..." onSelect={handleSelect} />

          {selectedLocation && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-gray-600">You selected:</p>
              <p className="font-medium text-blue-800">{selectedLocation}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">How to use this component</h2>
          <div className="prose text-gray-600">
            <p>
              This search component provides autocomplete functionality for location searches. As you type, it will show
              suggestions matching your input.
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Start typing to see suggestions</li>
              <li>Click on a suggestion to select it</li>
              <li>Press the X button to clear your input</li>
              <li>The component handles outside clicks to dismiss suggestions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
