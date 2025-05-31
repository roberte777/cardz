import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Search parameters
        const query = searchParams.get('q') || '';
        const name = searchParams.get('name');
        const setCode = searchParams.get('set');
        const colors = searchParams.get('colors');
        const colorIdentity = searchParams.get('colorIdentity');
        const type = searchParams.get('type');
        const rarity = searchParams.get('rarity');
        const cmc = searchParams.get('cmc');
        const cmcOperator = searchParams.get('cmcOp') || 'eq'; // eq, gte, lte, gt, lt
        const format = searchParams.get('format');
        const lang = searchParams.get('lang') || 'en';

        // Pagination
        const page = parseInt(searchParams.get('page') || '1');
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
        const skip = (page - 1) * limit;

        // Sorting
        const sortBy = searchParams.get('sortBy') || 'name';
        const sortOrder = searchParams.get('sortOrder') || 'asc';

        // Build where clause
        const where: any = {
            lang: lang,
        };

        // Text search across multiple fields
        if (query) {
            where.OR = [
                { name: { contains: query } },
                { oracleText: { contains: query } },
                { typeLine: { contains: query } },
                { flavorText: { contains: query } },
            ];
        }

        // Specific name search
        if (name) {
            where.name = { contains: name };
        }

        // Set filter
        if (setCode) {
            where.setCode = setCode;
        }

        // Type filter
        if (type) {
            where.typeLine = { contains: type };
        }

        // Rarity filter
        if (rarity) {
            where.rarity = rarity;
        }

        // CMC filter
        if (cmc) {
            const cmcValue = parseFloat(cmc);
            switch (cmcOperator) {
                case 'gte':
                    where.cmc = { gte: cmcValue };
                    break;
                case 'lte':
                    where.cmc = { lte: cmcValue };
                    break;
                case 'gt':
                    where.cmc = { gt: cmcValue };
                    break;
                case 'lt':
                    where.cmc = { lt: cmcValue };
                    break;
                default:
                    where.cmc = cmcValue;
            }
        }

        // Colors filter (exact match)
        if (colors) {
            where.colors = colors;
        }

        // Color identity filter
        if (colorIdentity) {
            where.colorIdentity = colorIdentity;
        }

        // Format legality filter
        if (format) {
            where.legalities = {
                contains: `"${format}":"legal"`
            };
        }

        // Build orderBy clause
        const orderBy: any = {};
        if (sortBy === 'name') {
            orderBy.name = sortOrder;
        } else if (sortBy === 'cmc') {
            orderBy.cmc = sortOrder;
        } else if (sortBy === 'set') {
            orderBy.setCode = sortOrder;
        } else if (sortBy === 'rarity') {
            orderBy.rarity = sortOrder;
        } else if (sortBy === 'released') {
            orderBy.releasedAt = sortOrder;
        } else {
            orderBy.createdAt = 'desc';
        }

        // Execute query with count for pagination
        const [cards, totalCount] = await Promise.all([
            prisma.card.findMany({
                where,
                orderBy,
                skip,
                take: limit,
                select: {
                    id: true,
                    name: true,
                    manaCost: true,
                    cmc: true,
                    typeLine: true,
                    oracleText: true,
                    power: true,
                    toughness: true,
                    loyalty: true,
                    setCode: true,
                    setName: true,
                    collectorNumber: true,
                    rarity: true,
                    imageUris: true,
                    cardFaces: true,
                    colors: true,
                    colorIdentity: true,
                    legalities: true,
                    prices: true,
                    scryfallUri: true,
                    artist: true,
                    releasedAt: true,
                },
            }),
            prisma.card.count({ where }),
        ]);

        // Parse JSON fields for response
        const processedCards = cards.map(card => ({
            ...card,
            imageUris: card.imageUris ? JSON.parse(card.imageUris) : null,
            cardFaces: card.cardFaces ? JSON.parse(card.cardFaces) : null,
            colors: card.colors ? JSON.parse(card.colors) : [],
            colorIdentity: card.colorIdentity ? JSON.parse(card.colorIdentity) : [],
            legalities: card.legalities ? JSON.parse(card.legalities) : {},
            prices: card.prices ? JSON.parse(card.prices) : {},
        }));

        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return NextResponse.json({
            cards: processedCards,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages,
                hasNextPage,
                hasPrevPage,
            },
        });

    } catch (error) {
        console.error('Error fetching cards:', error);
        return NextResponse.json(
            { error: 'Failed to fetch cards' },
            { status: 500 }
        );
    }
} 