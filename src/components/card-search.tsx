'use client'

import { useState, useEffect } from 'react'
import { useDebounce } from 'use-debounce'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Card {
    id: string
    name: string
    typeLine: string
    setName: string
    manaCost?: string
    colors?: string
}

interface CardSearchProps {
    placeholder?: string
    onCardSelect: (card: Card) => void
    filterBy?: 'commander' | 'all'
    className?: string
    showAddButton?: boolean
}

export function CardSearch({
    placeholder = "Search for cards...",
    onCardSelect,
    filterBy = 'all',
    className,
    showAddButton = true
}: CardSearchProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearchQuery] = useDebounce(searchQuery, 300)
    const [searchResults, setSearchResults] = useState<Card[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [showResults, setShowResults] = useState(false)

    useEffect(() => {
        if (debouncedSearchQuery && debouncedSearchQuery.length >= 3) {
            searchCards(debouncedSearchQuery)
        } else {
            setSearchResults([])
            setShowResults(false)
        }
    }, [debouncedSearchQuery, filterBy])

    const searchCards = async (query: string) => {
        setIsSearching(true)
        try {
            let searchUrl = `/api/cards?q=${encodeURIComponent(query)}&limit=10`

            // Add filter for commanders if needed
            if (filterBy === 'commander') {
                searchUrl += '&type=Legendary Creature'
            }

            const response = await fetch(searchUrl)
            if (response.ok) {
                const data = await response.json()
                setSearchResults(data.cards || [])
                setShowResults(true)
            }
        } catch (error) {
            console.error('Error searching cards:', error)
            setSearchResults([])
        } finally {
            setIsSearching(false)
        }
    }

    const handleCardSelect = (card: Card) => {
        onCardSelect(card)
        setSearchQuery('')
        setSearchResults([])
        setShowResults(false)
    }

    const handleInputChange = (value: string) => {
        setSearchQuery(value)
        if (value.length < 3) {
            setSearchResults([])
            setShowResults(false)
        }
    }

    const handleInputBlur = () => {
        // Delay hiding results to allow clicks on results
        setTimeout(() => setShowResults(false), 150)
    }

    return (
        <div className={cn("relative", className)}>
            <div className="relative">
                <Input
                    placeholder={placeholder}
                    value={searchQuery}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowResults(true)}
                    onBlur={handleInputBlur}
                    className="pr-10"
                />
                {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
            </div>

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((card) => (
                        <div
                            key={card.id}
                            className="flex items-center justify-between p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                            onClick={() => handleCardSelect(card)}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{card.name}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                    {card.typeLine} • {card.setName}
                                </div>
                            </div>
                            {showAddButton && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 flex-shrink-0 ml-2"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleCardSelect(card)
                                    }}
                                >
                                    <Plus className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* No results message */}
            {showResults && searchQuery.length >= 3 && searchResults.length === 0 && !isSearching && (
                <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg p-3 text-center text-sm text-muted-foreground">
                    No cards found for "{searchQuery}"
                </div>
            )}
        </div>
    )
} 