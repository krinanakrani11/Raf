"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Search, X, Loader2 } from "lucide-react"

interface SearchAutocompleteProps {
  placeholder?: string
  onSelect?: (item: string) => void
  className?: string
}

export default function SearchAutocomplete({
  placeholder = "Search locations...",
  onSelect,
  className = "",
}: SearchAutocompleteProps) {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Mock data for Gujarat locations
  const locations = [
    "Valsad Gujarat",
    "Valsad Railway Station",
    "Valsad Bus Depot",
    "Valsad City",
    "Valsad District",
    "Vapi Gujarat",
    "Vapi Industrial Area",
    "Vapi Railway Station",
    "Surat Gujarat",
    "Surat Railway Station",
    "Surat Airport",
    "Navsari Gujarat",
    "Navsari Railway Station",
    "Navsari College",
    "Ahmedabad Gujarat",
    "Ahmedabad Airport",
    "Ahmedabad Railway Station",
    "Vadodara Gujarat",
    "Vadodara Railway Station",
    "Gandhinagar Gujarat",
    "Rajkot Gujarat",
    "Bhavnagar Gujarat",
    "Jamnagar Gujarat",
    "Junagadh Gujarat",
    "Anand Gujarat",
    "Bharuch Gujarat",
    "Gandhidham Gujarat",
    "Porbandar Gujarat",
    "Morbi Gujarat",
    "Surendranagar Gujarat",
  ]

  // Filter suggestions based on query
  useEffect(() => {
    if (query.trim() === "") {
      setSuggestions([])
      return
    }

    setIsLoading(true)

    // Simulate API call delay
    const timer = setTimeout(() => {
      const filteredSuggestions = locations.filter((location) => location.toLowerCase().includes(query.toLowerCase()))
      setSuggestions(filteredSuggestions)
      setIsLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setShowSuggestions(true)
  }

  const handleClearInput = () => {
    setQuery("")
    setSuggestions([])
    inputRef.current?.focus()
  }

  const handleSelectSuggestion = (suggestion: string) => {
    setQuery(suggestion)
    setShowSuggestions(false)
    if (onSelect) {
      onSelect(suggestion)
    }
  }

  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          className="w-full py-3 pl-10 pr-10 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(query.length > 0)}
        />
        {query && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3"
            onClick={handleClearInput}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
            ) : (
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion, index) => {
            // Highlight the matching part of the suggestion
            const matchIndex = suggestion.toLowerCase().indexOf(query.toLowerCase())
            const beforeMatch = suggestion.substring(0, matchIndex)
            const match = suggestion.substring(matchIndex, matchIndex + query.length)
            const afterMatch = suggestion.substring(matchIndex + query.length)

            return (
              <div
                key={index}
                className="px-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                <div className="flex items-center">
                  <Search className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                  <span>
                    {beforeMatch}
                    <span className="font-medium text-blue-600">{match}</span>
                    {afterMatch}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showSuggestions && query && suggestions.length === 0 && !isLoading && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500">
          No results found for "{query}"
        </div>
      )}
    </div>
  )
}
