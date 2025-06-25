import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // First get the card to find its oracle ID
        const card = await prisma.card.findUnique({
            where: { id },
            select: { oracleId: true, name: true }
        })

        if (!card || !card.oracleId) {
            return NextResponse.json({ error: 'Card not found or has no oracle ID' }, { status: 404 })
        }

        // Get all printings with the same oracle ID (English only)
        const printings = await prisma.card.findMany({
            where: {
                oracleId: card.oracleId,
                lang: 'en', // Filter for English cards only
            },
            select: {
                id: true,
                name: true,
                setCode: true,
                setName: true,
                collectorNumber: true,
                rarity: true,
                imageUris: true,
                foil: true,
                nonfoil: true,
                releasedAt: true,
                artist: true,
                borderColor: true,
                frame: true,
                promo: true,
                reprint: true,
            },
            orderBy: [
                { releasedAt: 'desc' },
                { setName: 'asc' },
                { collectorNumber: 'asc' }
            ]
        })

        return NextResponse.json(printings)
    } catch (error) {
        console.error('Error fetching card printings:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 