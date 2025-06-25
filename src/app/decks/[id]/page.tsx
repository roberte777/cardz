'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CardSearch } from '@/components/card-search'
import { getDeckStats, ValidationIssue } from '@/lib/deck-validation'
import { ContextMenuProvider, useContextMenu, ContextMenuItem } from '@/components/ui/context-menu'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { PrintingSelectorModal } from '@/components/printing-selector-modal'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Crown, Search, Plus, Minus, AlertTriangle, CheckCircle, XCircle, X,
    ChevronDown, ChevronUp, Filter, SortAsc, Eye, Grid, List, Trash, FileImage
} from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

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
        imageUris?: string
        manaCost?: string
        setName?: string
    } | null
}

interface SearchCard {
    id: string
    name: string
    typeLine: string
    setName: string
}

interface CardType {
    name: string
    cards: DeckCard[]
    count: number
    isExpanded: boolean
}

function DeckEditPageContent() {
    const params = useParams()
    const router = useRouter()
    const { user } = useUser()
    const [deck, setDeck] = useState<Deck | null>(null)
    const [loading, setLoading] = useState(true)
    const [hoveredCard, setHoveredCard] = useState<DeckCard | null>(null)
    const [view, setView] = useState<'text' | 'grid'>('text')
    const [groupBy, setGroupBy] = useState<'type' | 'cmc' | 'color'>('type')
    const [sortBy, setSortBy] = useState<'name' | 'cmc' | 'type'>('name')
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [commanderSearchOpen, setCommanderSearchOpen] = useState(false)
    const [printingSelectorOpen, setPrintingSelectorOpen] = useState(false)
    const [selectedCardForPrinting, setSelectedCardForPrinting] = useState<DeckCard | null>(null)
    const { openMenu } = useContextMenu()
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        'Commander': true,
        'Planeswalkers': true,
        'Creatures': true,
        'Instants': true,
        'Sorceries': true,
        'Artifacts': true,
        'Enchantments': true,
        'Lands': true
    })

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
                console.log('Fetched deck data:', {
                    deckName: data.name,
                    commanderId: data.commanderId,
                    commanderName: data.commander?.name,
                    deckCardCount: data.deckCards.length,
                    deckCards: data.deckCards.map((dc: any) => ({
                        id: dc.id,
                        cardId: dc.card.id,
                        cardName: dc.card.name,
                        quantity: dc.quantity
                    }))
                })
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
                fetchDeck()
            } else {
                const errorData = await response.json()
                // Show error message to user (you might want to use a toast or alert component)
                console.error('Error adding card to deck:', errorData.error)
                alert(errorData.error || 'Failed to add card to deck')
            }
        } catch (error) {
            console.error('Error adding card to deck:', error)
            alert('Failed to add card to deck')
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
                fetchDeck()
            } else {
                const errorData = await response.json()
                console.error('Error setting commander:', errorData.error)
                alert(errorData.error || 'Failed to set commander')
            }
        } catch (error) {
            console.error('Error setting commander:', error)
            alert('Failed to set commander')
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
                fetchDeck()
            }
        } catch (error) {
            console.error('Error removing commander:', error)
        }
    }

    const setCommanderFromDeckCard = async (deckCard: DeckCard) => {
        if (!deck || deck.format !== 'Commander') return

        try {
            const response = await fetch(`/api/decks/${deck.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    commanderId: deckCard.card.id
                }),
            })

            if (response.ok) {
                fetchDeck()
            } else {
                const errorData = await response.json()
                console.error('Error setting commander:', errorData.error)
                alert(errorData.error || 'Failed to set commander')
            }
        } catch (error) {
            console.error('Error setting commander:', error)
            alert('Failed to set commander')
        }
    }

    const removeAllCopies = async (deckCardId: string) => {
        if (!deck) return

        try {
            await fetch(`/api/decks/${deck.id}/cards/${deckCardId}`, {
                method: 'DELETE',
            })
            fetchDeck()
        } catch (error) {
            console.error('Error removing card:', error)
        }
    }

    const addOneCopy = async (deckCard: DeckCard) => {
        await updateCardQuantity(deckCard.id, deckCard.quantity + 1)
    }

    const removeOneCopy = async (deckCard: DeckCard) => {
        if (deckCard.quantity > 1) {
            await updateCardQuantity(deckCard.id, deckCard.quantity - 1)
        }
    }

    const getContextMenuItems = (deckCard: DeckCard): ContextMenuItem[] => {
        const isLegendaryCreature = deckCard.card.typeLine.includes('Legendary') &&
            deckCard.card.typeLine.includes('Creature')

        const items: ContextMenuItem[] = [
            {
                label: 'Add one more',
                onClick: () => addOneCopy(deckCard),
                icon: <Plus className="w-4 h-4" />
            }
        ]

        if (deckCard.quantity > 1) {
            items.push({
                label: 'Remove one',
                onClick: () => removeOneCopy(deckCard),
                icon: <Minus className="w-4 h-4" />
            })
        }

        items.push({
            label: 'Remove all',
            onClick: () => removeAllCopies(deckCard.id),
            icon: <Trash className="w-4 h-4" />,
            className: 'text-destructive hover:text-destructive'
        })

        items.push({
            label: 'Switch printing',
            onClick: () => openPrintingSelector(deckCard),
            icon: <FileImage className="w-4 h-4" />
        })

        if (deck?.format === 'Commander' && isLegendaryCreature) {
            items.push({
                label: 'Set as commander',
                onClick: () => setCommanderFromDeckCard(deckCard),
                icon: <Crown className="w-4 h-4" />,
                className: 'text-yellow-600 hover:text-yellow-600'
            })
        }

        return items
    }

    const handleCardRightClick = (event: React.MouseEvent, deckCard: DeckCard) => {
        event.preventDefault()
        const menuItems = getContextMenuItems(deckCard)
        openMenu(event, menuItems)
    }

    const getCommanderContextMenuItems = (): ContextMenuItem[] => {
        return [
            {
                label: 'Change commander',
                onClick: () => setCommanderSearchOpen(true),
                icon: <Crown className="w-4 h-4" />,
                className: 'text-yellow-600 hover:text-yellow-600'
            },
            {
                label: 'Switch printing',
                onClick: () => openCommanderPrintingSelector(),
                icon: <FileImage className="w-4 h-4" />
            }
        ]
    }

    const handleCommanderRightClick = (event: React.MouseEvent) => {
        event.preventDefault()
        const menuItems = getCommanderContextMenuItems()
        openMenu(event, menuItems)
    }

    const handlePrintingSelect = async (printingId: string, foil: boolean) => {
        if (!deck || !selectedCardForPrinting) return

        console.log('Updating printing:', {
            deckId: deck.id,
            oldCardId: selectedCardForPrinting.card.id,
            newCardId: printingId,
            foil,
            cardName: selectedCardForPrinting.card.name,
            isCommander: selectedCardForPrinting.id === 'commander'
        })

        try {
            let response;

            if (selectedCardForPrinting.id === 'commander') {
                // Handle commander printing change
                response = await fetch(`/api/decks/${deck.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ commanderId: printingId }),
                })
            } else {
                // Handle regular deck card printing change
                response = await fetch(`/api/decks/${deck.id}/cards/${selectedCardForPrinting.card.id}/printing`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ newCardId: printingId }),
                })
            }

            if (response.ok) {
                const result = await response.json()
                console.log('Printing update result:', result)
                fetchDeck() // Refresh the deck to show the new printing
            } else {
                const errorData = await response.json()
                console.error('Error updating printing:', errorData.error)
                alert(errorData.error || 'Failed to update printing')
            }
        } catch (error) {
            console.error('Error updating printing:', error)
            alert('Failed to update printing')
        } finally {
            setSelectedCardForPrinting(null)
        }
    }

    const openPrintingSelector = (deckCard: DeckCard) => {
        setSelectedCardForPrinting(deckCard)
        setPrintingSelectorOpen(true)
    }

    const openCommanderPrintingSelector = () => {
        if (!deck?.commander) return

        // Create a mock DeckCard object for the commander
        const commanderAsDeckCard: DeckCard = {
            id: 'commander', // Special ID for commander
            quantity: 1,
            card: {
                id: deck.commander.id,
                name: deck.commander.name,
                typeLine: deck.commander.typeLine,
                manaCost: deck.commander.manaCost,
                colors: deck.commander.colorIdentity,
                imageUris: deck.commander.imageUris,
                cmc: 0, // We don't have this info for commander, but it's not critical
                rarity: 'mythic', // Default rarity for commanders
                setName: deck.commander.setName || 'Unknown'
            }
        }

        setSelectedCardForPrinting(commanderAsDeckCard)
        setPrintingSelectorOpen(true)
    }

    const deleteDeck = async () => {
        if (!deck) return

        setIsDeleting(true)
        try {
            const response = await fetch(`/api/decks/${deck.id}`, {
                method: 'DELETE',
            })

            if (response.ok) {
                // Navigate back to decks list
                router.push('/decks')
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
            setDeleteDialogOpen(false)
        }
    }

    const updateCardQuantity = async (deckCardId: string, newQuantity: number) => {
        if (!deck || newQuantity < 0) return

        try {
            if (newQuantity === 0) {
                await fetch(`/api/decks/${deck.id}/cards/${deckCardId}`, {
                    method: 'DELETE',
                })
            } else {
                await fetch(`/api/decks/${deck.id}/cards/${deckCardId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ quantity: newQuantity }),
                })
            }
            fetchDeck()
        } catch (error) {
            console.error('Error updating card quantity:', error)
        }
    }

    const toggleSection = (sectionName: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionName]: !prev[sectionName]
        }))
    }

    const organizeCardsByType = (): CardType[] => {
        if (!deck) return []

        const typeMap: Record<string, DeckCard[]> = {
            'Planeswalkers': [],
            'Creatures': [],
            'Instants': [],
            'Sorceries': [],
            'Artifacts': [],
            'Enchantments': [],
            'Lands': [],
            'Other': []
        }

        // Filter out commander from regular deck cards
        const nonCommanderCards = deck.deckCards.filter(deckCard => {
            // If there's a commander, exclude it from the regular card list
            return !deck.commander || deckCard.card.id !== deck.commander.id
        })

        nonCommanderCards.forEach(deckCard => {
            const typeLine = deckCard.card.typeLine.toLowerCase()
            if (typeLine.includes('planeswalker')) {
                typeMap['Planeswalkers'].push(deckCard)
            } else if (typeLine.includes('creature')) {
                typeMap['Creatures'].push(deckCard)
            } else if (typeLine.includes('instant')) {
                typeMap['Instants'].push(deckCard)
            } else if (typeLine.includes('sorcery')) {
                typeMap['Sorceries'].push(deckCard)
            } else if (typeLine.includes('artifact')) {
                typeMap['Artifacts'].push(deckCard)
            } else if (typeLine.includes('enchantment')) {
                typeMap['Enchantments'].push(deckCard)
            } else if (typeLine.includes('land')) {
                typeMap['Lands'].push(deckCard)
            } else {
                typeMap['Other'].push(deckCard)
            }
        })

        // Sort cards within each type
        Object.keys(typeMap).forEach(type => {
            typeMap[type].sort((a, b) => {
                if (sortBy === 'name') return a.card.name.localeCompare(b.card.name)
                if (sortBy === 'cmc') return a.card.cmc - b.card.cmc
                return a.card.typeLine.localeCompare(b.card.typeLine)
            })
        })

        return Object.entries(typeMap)
            .filter(([_, cards]) => cards.length > 0)
            .map(([name, cards]) => ({
                name,
                cards,
                count: cards.reduce((sum, card) => sum + card.quantity, 0),
                isExpanded: expandedSections[name] ?? true
            }))
    }

    const calculatePrice = (card: DeckCard): string => {
        // Deterministic price calculation based on card ID to avoid constant changes
        const hash = card.card.id.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0)
            return a & a
        }, 0)
        const basePrice = Math.abs(hash % 4000) / 100 + 0.1 // Range: $0.10 - $40.09
        return `$${(basePrice * card.quantity).toFixed(2)}`
    }

    const calculateCommanderPrice = (): string => {
        if (!deck?.commander) return '$0.00'
        // Deterministic price for commander
        const hash = deck.commander.id.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0)
            return a & a
        }, 0)
        const price = Math.abs(hash % 10000) / 100 + 0.1 // Range: $0.10 - $100.09
        return `$${price.toFixed(2)}`
    }

    const getCardTypeCounts = () => {
        const defaultCounts = {
            planeswalkers: 0,
            battles: 0,
            creatures: 0,
            sorceries: 0,
            instants: 0,
            artifacts: 0,
            enchantments: 0,
            lands: 0,
        }

        if (!deck) return defaultCounts

        // Filter out commander from regular deck cards (if it exists there)
        const nonCommanderCards = deck.deckCards.filter(deckCard => {
            return !deck.commander || deckCard.card.id !== deck.commander.id
        })

        const counts = { ...defaultCounts }

        nonCommanderCards.forEach(deckCard => {
            const typeLine = deckCard.card.typeLine.toLowerCase()
            const quantity = deckCard.quantity

            if (typeLine.includes('planeswalker')) {
                counts.planeswalkers += quantity
            } else if (typeLine.includes('battle')) {
                counts.battles += quantity
            } else if (typeLine.includes('creature')) {
                counts.creatures += quantity
            } else if (typeLine.includes('sorcery')) {
                counts.sorceries += quantity
            } else if (typeLine.includes('instant')) {
                counts.instants += quantity
            } else if (typeLine.includes('artifact')) {
                counts.artifacts += quantity
            } else if (typeLine.includes('enchantment')) {
                counts.enchantments += quantity
            } else if (typeLine.includes('land')) {
                counts.lands += quantity
            }
        })

        return counts
    }

    const getCardImageUrl = (imageUris?: string) => {
        if (!imageUris) return null

        try {
            const parsed = JSON.parse(imageUris)
            // Prefer normal size, fall back to small, then large
            return parsed.normal || parsed.small || parsed.large || null
        } catch {
            // If it's not JSON, assume it's a direct URL
            return imageUris
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
    const cardTypes = organizeCardsByType()
    const typeCounts = getCardTypeCounts()

    // Calculate total price excluding commander (since it's shown separately)
    const nonCommanderCards = deck.deckCards.filter(deckCard => {
        return !deck.commander || deckCard.card.id !== deck.commander.id
    })
    const mainDeckPrice = nonCommanderCards.reduce((sum, card) => {
        const price = parseFloat(calculatePrice(card).replace('$', ''))
        return sum + price
    }, 0)
    const commanderPrice = deck.commander ? parseFloat(calculateCommanderPrice().replace('$', '')) : 0
    const totalPrice = mainDeckPrice + commanderPrice

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl font-bold">{deck.name}</h1>
                            <Badge variant="secondary" className="flex items-center gap-1">
                                <Crown className="w-3 h-3" />
                                {deck.format}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-4">
                            <CardSearch
                                placeholder="Find and add cards to main deck..."
                                onCardSelect={addCardToDeck}
                                filterBy="all"
                                className="w-80"
                            />
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeleteDialogOpen(true)}
                                className="flex items-center gap-1"
                            >
                                <Trash className="h-4 w-4" />
                                Delete Deck
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6 pb-24">
                <div className="grid grid-cols-12 gap-6">
                    {/* Card Preview */}
                    <div className="col-span-3">
                        <div className="sticky top-24">
                            <Card className="aspect-[5/7] flex items-center justify-center bg-muted/30 overflow-hidden p-2">
                                {hoveredCard ? (
                                    <div className="w-full h-full">
                                        {getCardImageUrl(hoveredCard.card.imageUris) ? (
                                            <div className="relative w-full h-full">
                                                <img
                                                    src={getCardImageUrl(hoveredCard.card.imageUris)!}
                                                    alt={hoveredCard.card.name}
                                                    className="w-full h-full object-contain rounded"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none'
                                                        const fallback = e.currentTarget.nextElementSibling as HTMLElement
                                                        if (fallback) fallback.style.display = 'block'
                                                    }}
                                                />
                                                <div className="hidden p-4 text-center">
                                                    <div className="text-lg font-bold mb-2">{hoveredCard.card.name}</div>
                                                    <div className="text-sm text-muted-foreground mb-2">{hoveredCard.card.typeLine}</div>
                                                    <div className="text-sm">{hoveredCard.card.manaCost}</div>
                                                    <Badge variant="outline" className="mt-2">
                                                        {hoveredCard.card.setName}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-4 text-center flex flex-col justify-center h-full">
                                                <div className="text-lg font-bold mb-2">{hoveredCard.card.name}</div>
                                                <div className="text-sm text-muted-foreground mb-2">{hoveredCard.card.typeLine}</div>
                                                <div className="text-sm mb-2">{hoveredCard.card.manaCost}</div>
                                                <Badge variant="outline" className="mt-2 mx-auto">
                                                    {hoveredCard.card.setName}
                                                </Badge>
                                                <div className="text-xs text-muted-foreground mt-4">
                                                    Image not available
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : deck.commander ? (
                                    <div className="w-full h-full">
                                        {getCardImageUrl(deck.commander.imageUris) ? (
                                            <div className="relative w-full h-full">
                                                <img
                                                    src={getCardImageUrl(deck.commander.imageUris)!}
                                                    alt={deck.commander.name}
                                                    className="w-full h-full object-contain rounded"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none'
                                                        const fallback = e.currentTarget.nextElementSibling as HTMLElement
                                                        if (fallback) fallback.style.display = 'block'
                                                    }}
                                                />
                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                                                    <Badge variant="secondary" className="mb-1">
                                                        <Crown className="w-3 h-3 mr-1" />
                                                        Commander
                                                    </Badge>
                                                    <div className="text-white font-bold text-sm">{deck.commander.name}</div>
                                                </div>
                                                <div className="hidden p-4 text-center flex flex-col justify-center h-full">
                                                    <div className="text-lg font-bold mb-2">{deck.commander.name}</div>
                                                    <div className="text-sm text-muted-foreground mb-2">{deck.commander.typeLine}</div>
                                                    <div className="text-sm mb-2">{deck.commander.manaCost}</div>
                                                    <Badge variant="secondary" className="mt-2 mx-auto">
                                                        <Crown className="w-3 h-3 mr-1" />
                                                        Commander
                                                    </Badge>
                                                    {deck.commander.setName && (
                                                        <Badge variant="outline" className="mt-1 mx-auto">
                                                            {deck.commander.setName}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-4 text-center flex flex-col justify-center h-full">
                                                <div className="text-lg font-bold mb-2">{deck.commander.name}</div>
                                                <div className="text-sm text-muted-foreground mb-2">{deck.commander.typeLine}</div>
                                                <div className="text-sm mb-2">{deck.commander.manaCost}</div>
                                                <Badge variant="secondary" className="mt-2 mx-auto">
                                                    <Crown className="w-3 h-3 mr-1" />
                                                    Commander
                                                </Badge>
                                                {deck.commander.setName && (
                                                    <Badge variant="outline" className="mt-1 mx-auto">
                                                        {deck.commander.setName}
                                                    </Badge>
                                                )}
                                                <div className="text-xs text-muted-foreground mt-4">
                                                    Image not available
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center text-muted-foreground">
                                        <div className="text-lg mb-2">Hover over a card</div>
                                        <div className="text-sm">to see preview</div>
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="col-span-9">
                        {/* View Controls */}
                        <div className="flex items-center justify-between mb-6 bg-muted/30 p-4 rounded-lg">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Eye className="w-4 h-4" />
                                    <span className="text-sm font-medium">View</span>
                                    <Select value={view} onValueChange={(value: 'text' | 'grid') => setView(value)}>
                                        <SelectTrigger className="w-24">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="text">Text</SelectItem>
                                            <SelectItem value="grid">Grid</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4" />
                                    <span className="text-sm font-medium">Group</span>
                                    <Select value={groupBy} onValueChange={(value: 'type' | 'cmc' | 'color') => setGroupBy(value)}>
                                        <SelectTrigger className="w-24">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="type">Type</SelectItem>
                                            <SelectItem value="cmc">CMC</SelectItem>
                                            <SelectItem value="color">Color</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <SortAsc className="w-4 h-4" />
                                    <span className="text-sm font-medium">Sort</span>
                                    <Select value={sortBy} onValueChange={(value: 'name' | 'cmc' | 'type') => setSortBy(value)}>
                                        <SelectTrigger className="w-24">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="name">Name</SelectItem>
                                            <SelectItem value="cmc">CMC</SelectItem>
                                            <SelectItem value="type">Type</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Commander Section */}
                        {deck.format === 'Commander' && (
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Crown className="w-5 h-5 text-yellow-500" />
                                        <h3 className="text-lg font-semibold">Commander (1) - {calculateCommanderPrice()}</h3>
                                        <span className="text-sm text-muted-foreground">Change</span>
                                    </div>
                                </div>
                                {deck.commander ? (
                                    <div
                                        className="bg-muted/30 p-3 rounded-lg cursor-pointer hover:bg-muted/50"
                                        onContextMenu={handleCommanderRightClick}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-medium">1</span>
                                                <span className="font-medium">{deck.commander.name}</span>
                                                <Badge variant="outline">
                                                    {deck.commander.typeLine.includes('Soldier') ? 'SOLDIER' :
                                                        deck.commander.typeLine.split(' ').pop()?.toUpperCase() || 'CREATURE'}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">{calculateCommanderPrice()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                                        <CardSearch
                                            placeholder="Search for your commander..."
                                            onCardSelect={setCommander}
                                            filterBy="commander"
                                            showAddButton={false}
                                            className="max-w-xs mx-auto"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Card Type Sections */}
                        <div className="space-y-4">
                            {cardTypes.map((cardType) => (
                                <div key={cardType.name} className="border rounded-lg">
                                    <div
                                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30"
                                        onClick={() => toggleSection(cardType.name)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-semibold">
                                                {cardType.name} ({cardType.count}) - ${cardType.cards.reduce((sum, card) => {
                                                    const price = parseFloat(calculatePrice(card).replace('$', ''))
                                                    return sum + price
                                                }, 0).toFixed(2)}
                                            </h3>
                                        </div>
                                        {cardType.isExpanded ? (
                                            <ChevronUp className="w-4 h-4" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4" />
                                        )}
                                    </div>

                                    {cardType.isExpanded && (
                                        <div className="px-4 pb-4 space-y-2">
                                            {cardType.cards.map((deckCard) => (
                                                <div
                                                    key={deckCard.id}
                                                    className="flex items-center justify-between p-2 hover:bg-muted/50 rounded cursor-pointer"
                                                    onMouseEnter={() => setHoveredCard(deckCard)}
                                                    onMouseLeave={() => setHoveredCard(null)}
                                                    onContextMenu={(e) => handleCardRightClick(e, deckCard)}
                                                >
                                                    <div className="flex items-center gap-3 flex-1">
                                                        <span className="text-sm font-medium w-6">{deckCard.quantity}</span>
                                                        <span className="font-medium">{deckCard.card.name}</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {deckCard.card.rarity.charAt(0).toUpperCase()}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm">{calculatePrice(deckCard)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Stats Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-primary text-primary-foreground p-4 shadow-lg">
                <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2">
                            <span className="font-medium">{stats.totalCards} main deck</span>
                            <span>/</span>
                            <span>0 sideboard</span>
                        </div>
                        <div className="flex items-center gap-1">
                            {stats.isValid ? (
                                <CheckCircle className="w-4 h-4" />
                            ) : (
                                <XCircle className="w-4 h-4" />
                            )}
                            <span>{deck.format === 'Commander' ? 'Commander' : 'Standard'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>${totalPrice.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Card Type Counts - Floated Right */}
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                            <span title="Planeswalkers">⚡</span>
                            <span>{typeCounts.planeswalkers}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span title="Battles">⚔️</span>
                            <span>{typeCounts.battles}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span title="Creatures">🐉</span>
                            <span>{typeCounts.creatures}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span title="Sorceries">🔮</span>
                            <span>{typeCounts.sorceries}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span title="Instants">⚡</span>
                            <span>{typeCounts.instants}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span title="Artifacts">⚙️</span>
                            <span>{typeCounts.artifacts}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span title="Enchantments">✨</span>
                            <span>{typeCounts.enchantments}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span title="Lands">🏔️</span>
                            <span>{typeCounts.lands}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title="Delete Deck"
                description={`Are you sure you want to delete "${deck?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="destructive"
                isLoading={isDeleting}
                onConfirm={deleteDeck}
            />

            {/* Commander Search Dialog */}
            <Dialog open={commanderSearchOpen} onOpenChange={setCommanderSearchOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Change Commander</DialogTitle>
                        <DialogDescription>
                            Search for a new commander for your deck. Only legendary creatures are allowed.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <CardSearch
                            placeholder="Search for your new commander..."
                            onCardSelect={(card) => {
                                setCommander(card)
                                setCommanderSearchOpen(false)
                            }}
                            filterBy="commander"
                            showAddButton={false}
                            className="w-full"
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Printing Selector Modal */}
            {selectedCardForPrinting && (
                <PrintingSelectorModal
                    open={printingSelectorOpen}
                    onOpenChange={setPrintingSelectorOpen}
                    cardId={selectedCardForPrinting.card.id}
                    cardName={selectedCardForPrinting.card.name}
                    onSelectPrinting={handlePrintingSelect}
                />
            )}
        </div>
    )
}

export default function DeckEditPage() {
    return (
        <ContextMenuProvider>
            <DeckEditPageContent />
        </ContextMenuProvider>
    )
} 