'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CardSearch } from '@/components/card-search'
import { getDeckStats, ValidationIssue } from '@/lib/deck-validation'
import { Crown, Search, Plus, Minus, AlertTriangle, CheckCircle, XCircle, X } from 'lucide-react'

interface DeckCard {
    id: string
    quantity: number
    card: {
        id: string
        name: string
        typeLine: string
        manaCost?: string
        colors?: string
        imageUris?: string
        cmc: number
        rarity: string
        setName: string
    }
}

interface Deck {
    id: string
    name: string
    description: string | null
    format: string
    deckCards: DeckCard[]
    isPublic: boolean
    createdAt: string
    updatedAt: string
    commander?: {
        id: string
        name: string
        typeLine: string
        colorIdentity?: string
    } | null
}

interface SearchCard {
    id: string
    name: string
    typeLine: string
    setName: string
}

export default function DeckEditPage() {
    const params = useParams()
    const { user } = useUser()
    const [deck, setDeck] = useState<Deck | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (params.id) {
            fetchDeck()
        }
    }, [params.id])

    const fetchDeck = async () => {
        try {
            const response = await fetch(`/api/decks/${params.id}`)
            if (response.ok) {
                const data = await response.json()
                setDeck(data)
            }
        } catch (error) {
            console.error('Error fetching deck:', error)
        } finally {
            setLoading(false)
        }
    }

    const addCardToDeck = async (card: SearchCard) => {
        if (!deck) return

        try {
            const response = await fetch(`/api/decks/${deck.id}/cards`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ cardId: card.id, quantity: 1 }),
            })

            if (response.ok) {
                fetchDeck() // Refresh deck data
            }
        } catch (error) {
            console.error('Error adding card to deck:', error)
        }
    }

    const setCommander = async (card: SearchCard) => {
        if (!deck || deck.format !== 'Commander') return

        try {
            const response = await fetch(`/api/decks/${deck.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ commanderId: card.id }),
            })

            if (response.ok) {
                fetchDeck() // Refresh deck data
            }
        } catch (error) {
            console.error('Error setting commander:', error)
        }
    }

    const removeCommander = async () => {
        if (!deck || deck.format !== 'Commander') return

        try {
            const response = await fetch(`/api/decks/${deck.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ commanderId: null }),
            })

            if (response.ok) {
                fetchDeck() // Refresh deck data
            }
        } catch (error) {
            console.error('Error removing commander:', error)
        }
    }

    const updateCardQuantity = async (deckCardId: string, newQuantity: number) => {
        if (!deck || newQuantity < 0) return

        try {
            if (newQuantity === 0) {
                // Remove card
                await fetch(`/api/decks/${deck.id}/cards/${deckCardId}`, {
                    method: 'DELETE',
                })
            } else {
                // Update quantity
                await fetch(`/api/decks/${deck.id}/cards/${deckCardId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ quantity: newQuantity }),
                })
            }
            fetchDeck() // Refresh deck data
        } catch (error) {
            console.error('Error updating card quantity:', error)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (!deck) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">
                    <h1 className="text-2xl font-bold">Deck not found</h1>
                </div>
            </div>
        )
    }

    const stats = getDeckStats(deck)
    const formatBadge = deck.format === 'Commander' ? (
        <Badge variant="secondary" className="flex items-center gap-1">
            <Crown className="w-3 h-3" />
            Commander
        </Badge>
    ) : (
        <Badge variant="outline" className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            Standard
        </Badge>
    )

    return (
        <div className="container mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold">{deck.name}</h1>
                        {formatBadge}
                    </div>
                    {deck.description && (
                        <p className="text-muted-foreground">{deck.description}</p>
                    )}
                    {/* Commander Display */}
                    {deck.format === 'Commander' && deck.commander && (
                        <div className="mt-3 p-3 border rounded-lg bg-muted/30">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <Crown className="w-4 h-4 text-yellow-500" />
                                    <span className="text-sm font-medium text-muted-foreground">Commander</span>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={removeCommander}
                                >
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                            <div className="font-medium">{deck.commander.name}</div>
                            <div className="text-sm text-muted-foreground">{deck.commander.typeLine}</div>
                        </div>
                    )}
                    {deck.format === 'Commander' && !deck.commander && (
                        <div className="mt-3 p-3 border rounded-lg border-dashed">
                            <div className="flex items-center gap-2 mb-2">
                                <Crown className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-muted-foreground">Commander</span>
                            </div>
                            <CardSearch
                                placeholder="Search for your commander..."
                                onCardSelect={setCommander}
                                filterBy="commander"
                                showAddButton={false}
                                className="max-w-xs"
                            />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-sm text-muted-foreground">Cards</div>
                        <div className="text-2xl font-bold">{stats.totalCards}</div>
                        {deck.format === 'Commander' && (
                            <div className="text-xs text-muted-foreground">
                                {stats.totalCards - (deck.commander ? 1 : 0)} + {deck.commander ? 1 : 0} commander
                            </div>
                        )}
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-muted-foreground">Status</div>
                        <div className="flex items-center gap-1">
                            {stats.isValid ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                            )}
                            <span className="text-sm font-medium">
                                {stats.isValid ? 'Valid' : 'Invalid'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Validation Issues */}
            {stats.issues.length > 0 && (
                <div className="mb-6 space-y-2">
                    {stats.issues.map((issue, index) => (
                        <Alert key={index} variant={issue.type === 'error' ? 'destructive' : 'default'}>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                <span className="font-medium">{issue.cardName ? `${issue.cardName}: ` : ''}</span>
                                {issue.message}
                            </AlertDescription>
                        </Alert>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Card Search */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Search className="w-4 h-4" />
                                Add Cards
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardSearch
                                placeholder="Search for cards..."
                                onCardSelect={addCardToDeck}
                                filterBy="all"
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Deck List */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Deck List</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {deck.deckCards.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>No cards in deck yet. Use the search to add cards!</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {deck.deckCards.map((deckCard) => (
                                        <div
                                            key={deckCard.id}
                                            className="flex items-center justify-between p-2 border rounded hover:bg-muted/50"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium">{deckCard.card.name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {deckCard.card.typeLine} • {deckCard.card.setName}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => updateCardQuantity(deckCard.id, deckCard.quantity - 1)}
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </Button>
                                                <span className="w-8 text-center font-medium">{deckCard.quantity}</span>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => updateCardQuantity(deckCard.id, deckCard.quantity + 1)}
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
} 