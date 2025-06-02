import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@/generated/prisma'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, description, format, commanderId } = body

        if (!name || !format) {
            return NextResponse.json({ error: 'Name and format are required' }, { status: 400 })
        }

        if (!['Standard', 'Commander'].includes(format)) {
            return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
        }

        // For Commander format, validate commander if provided
        if (format === 'Commander' && commanderId) {
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

        const deck = await prisma.deck.create({
            data: {
                name,
                description: description || null,
                format,
                userId,
                isPublic: false,
                commanderId: format === 'Commander' ? commanderId : null,
            },
            include: {
                commander: true,
            },
        })

        return NextResponse.json(deck)
    } catch (error) {
        console.error('Error creating deck:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const decks = await prisma.deck.findMany({
            where: {
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
            orderBy: {
                updatedAt: 'desc',
            },
        })

        // Calculate deck stats
        const decksWithStats = decks.map(deck => ({
            ...deck,
            cardCount: deck.deckCards.reduce((sum, dc) => sum + dc.quantity, 0),
            uniqueCards: deck.deckCards.length,
        }))

        return NextResponse.json(decksWithStats)
    } catch (error) {
        console.error('Error fetching decks:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 