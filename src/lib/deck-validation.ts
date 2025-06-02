export interface ValidationIssue {
    type: 'error' | 'warning'
    message: string
    cardName?: string
}

export interface DeckStats {
    totalCards: number
    uniqueCards: number
    isValid: boolean
    issues: ValidationIssue[]
}

interface DeckCard {
    id: string
    quantity: number
    card: {
        id: string
        name: string
        typeLine: string
        colors?: string
        colorIdentity?: string
        cmc: number
        rarity: string
    }
}

interface Commander {
    id: string
    name: string
    typeLine: string
    colorIdentity?: string
}

interface Deck {
    id: string
    name: string
    format: string
    deckCards: DeckCard[]
    commander?: Commander | null
}

export function getDeckStats(deck: Deck): DeckStats {
    const issues: ValidationIssue[] = []
    const totalCards = deck.deckCards.reduce((sum, deckCard) => sum + deckCard.quantity, 0)
    const uniqueCards = deck.deckCards.length

    // Format-specific validation
    if (deck.format === 'Standard') {
        validateStandardDeck(deck, issues)
    } else if (deck.format === 'Commander') {
        validateCommanderDeck(deck, issues)
    }

    const isValid = issues.filter(issue => issue.type === 'error').length === 0

    return {
        totalCards,
        uniqueCards,
        isValid,
        issues,
    }
}

function validateStandardDeck(deck: Deck, issues: ValidationIssue[]) {
    const totalCards = deck.deckCards.reduce((sum, deckCard) => sum + deckCard.quantity, 0)

    // Standard deck must have at least 60 cards
    if (totalCards < 60) {
        issues.push({
            type: 'error',
            message: `Standard decks must have at least 60 cards. You have ${totalCards} cards.`,
        })
    }

    // Check for too many copies of non-basic lands
    for (const deckCard of deck.deckCards) {
        const card = deckCard.card
        const isBasicLand = card.typeLine.includes('Basic') && card.typeLine.includes('Land')

        if (!isBasicLand && deckCard.quantity > 4) {
            issues.push({
                type: 'error',
                message: `You can only have up to 4 copies of non-basic cards. You have ${deckCard.quantity} copies.`,
                cardName: card.name,
            })
        }
    }
}

function validateCommanderDeck(deck: Deck, issues: ValidationIssue[]) {
    const totalCards = deck.deckCards.reduce((sum, deckCard) => sum + deckCard.quantity, 0)

    // Commander validation
    if (!deck.commander) {
        issues.push({
            type: 'error',
            message: 'Commander decks must have a commander.',
        })
    } else {
        // Validate commander is legendary creature
        if (!deck.commander.typeLine.includes('Legendary') || !deck.commander.typeLine.includes('Creature')) {
            issues.push({
                type: 'error',
                message: 'Commander must be a legendary creature.',
                cardName: deck.commander.name,
            })
        }
    }

    // Commander deck must have exactly 100 cards (including commander)
    const totalCardsIncludingCommander = totalCards + (deck.commander ? 1 : 0)
    if (totalCardsIncludingCommander !== 100) {
        const difference = 100 - totalCardsIncludingCommander
        const message = difference > 0
            ? `Commander decks must have exactly 100 cards. You need ${difference} more cards.`
            : `Commander decks must have exactly 100 cards. You have ${Math.abs(difference)} too many cards.`

        issues.push({
            type: 'warning',
            message,
        })
    }

    // Singleton format - no more than 1 copy of any card (except basic lands)
    for (const deckCard of deck.deckCards) {
        const card = deckCard.card
        const isBasicLand = card.typeLine.includes('Basic') && card.typeLine.includes('Land')

        if (!isBasicLand && deckCard.quantity > 1) {
            issues.push({
                type: 'error',
                message: `Commander is a singleton format. You can only have 1 copy of non-basic cards. You have ${deckCard.quantity} copies.`,
                cardName: card.name,
            })
        }
    }

    // Color identity validation
    if (deck.commander && deck.commander.colorIdentity) {
        const commanderColors = parseColorIdentity(deck.commander.colorIdentity)

        for (const deckCard of deck.deckCards) {
            const card = deckCard.card
            if (card.colorIdentity) {
                const cardColors = parseColorIdentity(card.colorIdentity)

                // Check if any color in the card's color identity is not in the commander's color identity
                const invalidColors = cardColors.filter(color => !commanderColors.includes(color))

                if (invalidColors.length > 0) {
                    issues.push({
                        type: 'error',
                        message: `Card's color identity (${cardColors.join('')}) is not within your commander's color identity (${commanderColors.join('')}).`,
                        cardName: card.name,
                    })
                }
            }
        }
    }
}

function parseColorIdentity(colorIdentityString: string): string[] {
    try {
        const colors = JSON.parse(colorIdentityString)
        return Array.isArray(colors) ? colors : []
    } catch {
        return []
    }
} 