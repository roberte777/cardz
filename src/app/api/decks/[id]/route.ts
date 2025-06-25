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

        // Use transaction to ensure atomicity when setting/removing commander
        const updatedDeck = await prisma.$transaction(async (tx) => {
            // If setting a new commander, handle old commander and deck card management
            if (commanderId) {
                // If there's already a commander, handle it first
                if (existingDeck.commanderId) {
                    // Check if the old commander already exists as a deck card (regardless of printing)
                    const oldCommanderCard = await tx.card.findUnique({
                        where: { id: existingDeck.commanderId },
                        select: { name: true }
                    })

                    if (oldCommanderCard) {
                        const existingDeckCardForOldCommander = await tx.deckCard.findFirst({
                            where: {
                                deckId: id,
                                card: {
                                    name: oldCommanderCard.name
                                }
                            },
                        })

                        // Only create deck card for old commander if none exists for this card name
                        if (!existingDeckCardForOldCommander) {
                            await tx.deckCard.create({
                                data: {
                                    deckId: id,
                                    cardId: existingDeck.commanderId,
                                    quantity: 1,
                                },
                            })
                        }
                    }
                }

                // Remove any deck card entries for the new commander (regardless of printing)
                const newCommanderCard = await tx.card.findUnique({
                    where: { id: commanderId },
                    select: { name: true }
                })

                if (newCommanderCard) {
                    await tx.deckCard.deleteMany({
                        where: {
                            deckId: id,
                            card: {
                                name: newCommanderCard.name
                            }
                        },
                    })
                }
            }

            // Update the deck with new commander
            return await tx.deck.update({
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
        })

        return NextResponse.json(updatedDeck)
    } catch (error) {
        console.error('Error updating deck:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

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

        // Delete the deck (cascade will handle deckCards)
        await prisma.deck.delete({
            where: { id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting deck:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 