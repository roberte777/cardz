import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        // Find the card by ID
        const card = await prisma.card.findUnique({
            where: { id },
        });

        if (!card) {
            return NextResponse.json(
                { error: 'Card not found' },
                { status: 404 }
            );
        }

        // Get rulings if the card has an oracle ID
        let rulings = [];
        if (card.oracleId) {
            rulings = await prisma.ruling.findMany({
                where: { oracleId: card.oracleId },
                orderBy: { publishedAt: 'desc' },
            });
        }

        // Parse JSON fields
        const processedCard = {
            ...card,
            imageUris: card.imageUris ? JSON.parse(card.imageUris) : null,
            cardFaces: card.cardFaces ? JSON.parse(card.cardFaces) : null,
            colors: card.colors ? JSON.parse(card.colors) : [],
            colorIdentity: card.colorIdentity ? JSON.parse(card.colorIdentity) : [],
            colorIndicator: card.colorIndicator ? JSON.parse(card.colorIndicator) : [],
            legalities: card.legalities ? JSON.parse(card.legalities) : {},
            frameEffects: card.frameEffects ? JSON.parse(card.frameEffects) : [],
            prices: card.prices ? JSON.parse(card.prices) : {},
            keywords: card.keywords ? JSON.parse(card.keywords) : [],
            producedMana: card.producedMana ? JSON.parse(card.producedMana) : [],
            rulings,
        };

        return NextResponse.json(processedCard);

    } catch (error) {
        console.error('Error fetching card:', error);
        return NextResponse.json(
            { error: 'Failed to fetch card' },
            { status: 500 }
        );
    }
} 