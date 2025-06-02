import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@/generated/prisma'

const prisma = new PrismaClient()

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const deck = await prisma.deck.findFirst({
            where: {
                id,
                userId,
            },
            include: {
                commander: true,
                deckCards: {
                    include: {
                        card: true,
                    },
                },
            },
        })

        if (!deck) {
            return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
        }

        return NextResponse.json(deck)
    } catch (error) {
        console.error('Error fetching deck:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { commanderId } = body
        const { id } = await params

        // Verify deck exists and belongs to user
        const existingDeck = await prisma.deck.findFirst({
            where: {
                id,
                userId,
            },
        })

        if (!existingDeck) {
            return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
        }

        // If setting a commander, validate it
        if (commanderId) {
            const commander = await prisma.card.findUnique({
                where: { id: commanderId },
            })

            if (!commander) {
                return NextResponse.json({ error: 'Commander card not found' }, { status: 400 })
            }

            // Validate that the card is a legendary creature
            if (!commander.typeLine.includes('Legendary') || !commander.typeLine.includes('Creature')) {
                return NextResponse.json({ error: 'Commander must be a legendary creature' }, { status: 400 })
            }
        }

        // Update the deck
        const updatedDeck = await prisma.deck.update({
            where: { id },
            data: {
                commanderId: commanderId || null,
            },
            include: {
                commander: true,
                deckCards: {
                    include: {
                        card: true,
                    },
                },
            },
        })

        return NextResponse.json(updatedDeck)
    } catch (error) {
        console.error('Error updating deck:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 