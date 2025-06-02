import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@/generated/prisma'

const prisma = new PrismaClient()

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string; cardId: string } }
) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { quantity } = body

        if (quantity === undefined || quantity < 0) {
            return NextResponse.json({ error: 'Valid quantity is required' }, { status: 400 })
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

        // Update the deck card quantity
        const deckCard = await prisma.deckCard.update({
            where: {
                id: params.cardId,
            },
            data: {
                quantity,
            },
            include: {
                card: true,
            },
        })

        return NextResponse.json(deckCard)
    } catch (error) {
        console.error('Error updating deck card:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string; cardId: string } }
) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

        // Delete the deck card
        await prisma.deckCard.delete({
            where: {
                id: params.cardId,
            },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting deck card:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 