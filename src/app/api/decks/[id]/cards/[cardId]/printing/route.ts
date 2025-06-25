import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; cardId: string }> }
) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: deckId, cardId } = await params
        const { newCardId } = await request.json()

        if (!newCardId) {
            return NextResponse.json({ error: 'newCardId is required' }, { status: 400 })
        }

        // Verify deck belongs to user
        const deck = await prisma.deck.findFirst({
            where: {
                id: deckId,
                userId,
            },
        })

        if (!deck) {
            return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
        }

        // Verify the deck card exists
        const deckCard = await prisma.deckCard.findFirst({
            where: {
                deckId,
                cardId,
            },
        })

        if (!deckCard) {
            return NextResponse.json({ error: 'Card not found in deck' }, { status: 404 })
        }

        // Verify the new card exists
        const newCard = await prisma.card.findUnique({
            where: { id: newCardId },
        })

        if (!newCard) {
            return NextResponse.json({ error: 'New card not found' }, { status: 404 })
        }

        // Check if there's already a deck card for the new printing
        const existingDeckCard = await prisma.deckCard.findFirst({
            where: {
                deckId,
                cardId: newCardId,
            },
        })

        if (existingDeckCard) {
            // If there's already a deck card for this printing, merge the quantities
            await prisma.$transaction([
                // Add current quantity to existing deck card
                prisma.deckCard.update({
                    where: { id: existingDeckCard.id },
                    data: { quantity: existingDeckCard.quantity + deckCard.quantity },
                }),
                // Delete the old deck card
                prisma.deckCard.delete({
                    where: { id: deckCard.id },
                }),
            ])
        } else {
            // Update the card to point to the new printing
            await prisma.deckCard.update({
                where: { id: deckCard.id },
                data: { cardId: newCardId },
            })
        }

        // Also update commander if this card was the commander
        if (deck.commanderId === cardId) {
            await prisma.deck.update({
                where: { id: deckId },
                data: { commanderId: newCardId },
            })
        }

        // Return the updated deck to help with debugging
        const updatedDeck = await prisma.deck.findFirst({
            where: { id: deckId },
            include: {
                commander: true,
                deckCards: {
                    include: {
                        card: true,
                    },
                },
            },
        })

        return NextResponse.json({ success: true, deck: updatedDeck })
    } catch (error) {
        console.error('Error updating card printing:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 