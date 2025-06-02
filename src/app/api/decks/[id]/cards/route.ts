import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@/generated/prisma'

const prisma = new PrismaClient()

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { cardId, quantity = 1 } = body

        if (!cardId) {
            return NextResponse.json({ error: 'Card ID is required' }, { status: 400 })
        }

        // Verify deck ownership
        const deck = await prisma.deck.findFirst({
            where: {
                id: params.id,
                userId,
            },
        })

        if (!deck) {
            return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
        }

        // Check if card already exists in deck
        const existingDeckCard = await prisma.deckCard.findFirst({
            where: {
                deckId: params.id,
                cardId,
            },
        })

        if (existingDeckCard) {
            // Update quantity
            const updatedDeckCard = await prisma.deckCard.update({
                where: {
                    id: existingDeckCard.id,
                },
                data: {
                    quantity: existingDeckCard.quantity + quantity,
                },
                include: {
                    card: true,
                },
            })
            return NextResponse.json(updatedDeckCard)
        } else {
            // Create new deck card entry
            const deckCard = await prisma.deckCard.create({
                data: {
                    deckId: params.id,
                    cardId,
                    quantity,
                },
                include: {
                    card: true,
                },
            })
            return NextResponse.json(deckCard)
        }
    } catch (error) {
        console.error('Error adding card to deck:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 