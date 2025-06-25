import * as React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { Sparkles, Calendar, User, Hash } from "lucide-react"

interface CardPrinting {
    id: string
    name: string
    setCode: string
    setName: string
    collectorNumber: string
    rarity: string
    imageUris?: string
    foil: boolean
    nonfoil: boolean
    releasedAt?: string
    artist?: string
    borderColor?: string
    frame?: string
    promo: boolean
    reprint: boolean
}

interface PrintingSelectorModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    cardId: string
    cardName: string
    onSelectPrinting: (printingId: string, foil: boolean) => void
}

export function PrintingSelectorModal({
    open,
    onOpenChange,
    cardId,
    cardName,
    onSelectPrinting,
}: PrintingSelectorModalProps) {
    const [printings, setPrintings] = useState<CardPrinting[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedPrinting, setSelectedPrinting] = useState<CardPrinting | null>(null)

    useEffect(() => {
        if (open && cardId) {
            fetchPrintings()
        }
    }, [open, cardId])

    const fetchPrintings = async () => {
        setLoading(true)
        try {
            const response = await fetch(`/api/cards/${cardId}/printings`)
            if (response.ok) {
                const data = await response.json()
                setPrintings(data)
                setSelectedPrinting(data[0] || null)
            } else {
                console.error('Failed to fetch printings')
            }
        } catch (error) {
            console.error('Error fetching printings:', error)
        } finally {
            setLoading(false)
        }
    }

    const getCardImageUrl = (imageUris?: string) => {
        if (!imageUris) return null
        try {
            const uris = JSON.parse(imageUris)
            return uris.normal || uris.large || uris.small || null
        } catch {
            return null
        }
    }

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Unknown'
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
        })
    }

    const getRarityColor = (rarity: string) => {
        switch (rarity.toLowerCase()) {
            case 'common': return 'bg-gray-100 text-gray-800'
            case 'uncommon': return 'bg-gray-200 text-gray-800'
            case 'rare': return 'bg-yellow-100 text-yellow-800'
            case 'mythic': return 'bg-orange-100 text-orange-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const handleSelectPrinting = (printing: CardPrinting, foil: boolean) => {
        onSelectPrinting(printing.id, foil)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Switch Printing for {cardName}</DialogTitle>
                    <DialogDescription>
                        Choose a printing and foiling option for this card.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto">
                        <div className="space-y-3">
                            {printings.map((printing) => (
                                <div
                                    key={printing.id}
                                    className="flex gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                                >
                                    {/* Card Image */}
                                    <div className="w-16 h-20 flex-shrink-0 bg-muted/30 rounded overflow-hidden">
                                        {getCardImageUrl(printing.imageUris) ? (
                                            <img
                                                src={getCardImageUrl(printing.imageUris)!}
                                                alt={printing.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                                                No Image
                                            </div>
                                        )}
                                    </div>

                                    {/* Printing Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-base truncate">{printing.setName}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-xs ${getRarityColor(printing.rarity)}`}
                                                    >
                                                        {printing.rarity.charAt(0).toUpperCase() + printing.rarity.slice(1)}
                                                    </Badge>
                                                    {printing.promo && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            Promo
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 ml-2">
                                                {printing.foil && (
                                                    <div title="Foil available">
                                                        <Sparkles className="w-4 h-4 text-yellow-500" />
                                                    </div>
                                                )}
                                                {printing.nonfoil && (
                                                    <div className="w-4 h-4 rounded border border-muted-foreground/50" title="Regular available" />
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                                            <div className="flex items-center gap-1">
                                                <Hash className="w-3 h-3" />
                                                <span>#{printing.collectorNumber}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                <span>{formatDate(printing.releasedAt)}</span>
                                            </div>
                                            {printing.artist && (
                                                <div className="flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    <span className="truncate">{printing.artist}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Selection Buttons */}
                                        <div className="flex gap-2">
                                            {printing.nonfoil && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => handleSelectPrinting(printing, false)}
                                                >
                                                    Select
                                                </Button>
                                            )}
                                            {printing.foil && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => handleSelectPrinting(printing, true)}
                                                >
                                                    Select Foil
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
} 