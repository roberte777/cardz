'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DeckCreationModal } from '@/components/deck-creation-modal'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { Plus, Crown, Calendar, FileText, Trash, MoreVertical } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Deck {
    id: string
    name: string
    description: string | null
    format: string
    isPublic: boolean
    cardCount: number
    createdAt: string
    updatedAt: string
}

export default function DecksPage() {
    const { user, isLoaded } = useUser()
    const [decks, setDecks] = useState<Deck[]>([])
    const [loading, setLoading] = useState(true)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deckToDelete, setDeckToDelete] = useState<Deck | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        if (isLoaded && user) {
            fetchDecks()
        }
    }, [isLoaded, user])

    const fetchDecks = async () => {
        try {
            const response = await fetch('/api/decks')
            if (response.ok) {
                const data = await response.json()
                setDecks(data)
            }
        } catch (error) {
            console.error('Error fetching decks:', error)
        } finally {
            setLoading(false)
        }
    }

    const deleteDeck = async () => {
        if (!deckToDelete) return

        setIsDeleting(true)
        try {
            const response = await fetch(`/api/decks/${deckToDelete.id}`, {
                method: 'DELETE',
            })

            if (response.ok) {
                // Remove the deck from the list
                setDecks(decks.filter(deck => deck.id !== deckToDelete.id))
                setDeleteDialogOpen(false)
                setDeckToDelete(null)
            } else {
                const errorData = await response.json()
                console.error('Error deleting deck:', errorData.error)
                alert(errorData.error || 'Failed to delete deck')
            }
        } catch (error) {
            console.error('Error deleting deck:', error)
            alert('Failed to delete deck')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleDeleteClick = (event: React.MouseEvent, deck: Deck) => {
        event.preventDefault()
        event.stopPropagation()
        setDeckToDelete(deck)
        setDeleteDialogOpen(true)
    }

    if (!isLoaded || loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    const formatBadge = (format: string) => {
        switch (format) {
            case 'Commander':
                return (
                    <Badge variant="secondary" className="flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                        Commander
                    </Badge>
                )
            case 'Standard':
                return (
                    <Badge variant="outline" className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        Standard
                    </Badge>
                )
            default:
                return <Badge variant="outline">{format}</Badge>
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Your Decks</h1>
                    <p className="text-muted-foreground mt-2">
                        Welcome back, {user?.firstName || user?.username || 'Planeswalker'}!
                        Manage your Magic deck collection here.
                    </p>
                </div>
                <DeckCreationModal />
            </div>

            {decks.length === 0 ? (
                // Empty State
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
                        <svg
                            className="w-12 h-12 text-muted-foreground"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                            />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-semibold mb-2">No decks yet</h2>
                    <p className="text-muted-foreground mb-6 max-w-md">
                        Ready to start building? Create your first deck and begin organizing your Magic collection.
                    </p>
                    <DeckCreationModal
                        trigger={
                            <Button size="lg" className="flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                Create Your First Deck
                            </Button>
                        }
                    />
                </div>
            ) : (
                // Deck Grid
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {decks.map((deck) => (
                        <div key={deck.id} className="group relative">
                            <Link href={`/decks/${deck.id}`}>
                                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-lg truncate">{deck.name}</CardTitle>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {formatBadge(deck.format)}
                                                    {deck.isPublic && (
                                                        <Badge variant="default" className="text-xs">
                                                            Public
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity ml-2"
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                        }}
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={(e) => handleDeleteClick(e, deck)}
                                                    >
                                                        <Trash className="h-4 w-4 mr-2" />
                                                        Delete deck
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        {deck.description && (
                                            <CardDescription className="line-clamp-2">
                                                {deck.description}
                                            </CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                                            <div className="flex items-center gap-4">
                                                <span>{deck.cardCount} cards</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(deck.updatedAt)}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title="Delete Deck"
                description={`Are you sure you want to delete "${deckToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="destructive"
                isLoading={isDeleting}
                onConfirm={deleteDeck}
            />
        </div>
    )
} 