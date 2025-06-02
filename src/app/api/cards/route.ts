import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Define the card type for better type safety
type CardSearchResult = {
    id: string;
    oracleId: string | null;
    name: string;
    manaCost: string | null;
    cmc: number;
    typeLine: string;
    oracleText: string | null;
    power: string | null;
    toughness: string | null;
    loyalty: string | null;
    setCode: string;
    setName: string;
    collectorNumber: string;
    rarity: string;
    imageUris: string | null;
    cardFaces: string | null;
    colors: string | null;
    colorIdentity: string | null;
    legalities: string | null;
    prices: string | null;
    scryfallUri: string | null;
    artist: string | null;
    releasedAt: Date | null;
};

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
        const groupByOracle = searchParams.get('groupByOracle') !== 'false'; // Default to true

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

        let cards: CardSearchResult[];
        let totalCount: number;

        if (groupByOracle && query) {
            // When grouping by oracle ID, use a more complex query
            // First, get distinct oracle IDs that match our criteria
            const distinctOracleIds = await prisma.card.findMany({
                where: {
                    ...where,
                    oracleId: { not: null },
                },
                select: {
                    oracleId: true,
                },
                distinct: ['oracleId'],
                take: limit * 3, // Get more to account for filtering
            });

            // Then get one representative card for each oracle ID
            const oracleIds = distinctOracleIds.map(card => card.oracleId).filter(Boolean) as string[];

            if (oracleIds.length > 0) {
                // For each oracle ID, get the most recent/preferred printing
                const cardPromises = oracleIds.slice(skip, skip + limit).map(async (oracleId) => {
                    return prisma.card.findFirst({
                        where: {
                            oracleId: oracleId,
                            lang: lang,
                        },
                        orderBy: [
                            { releasedAt: 'desc' }, // Prefer newer sets
                            { rarity: 'asc' }, // Prefer lower rarity for consistency
                        ],
                        select: {
                            id: true,
                            oracleId: true,
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
                    });
                });

                const cardResults = await Promise.all(cardPromises);
                cards = cardResults.filter(Boolean) as CardSearchResult[];
                totalCount = distinctOracleIds.length;
            } else {
                cards = [];
                totalCount = 0;
            }
        } else {
            // Standard query without grouping
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

            const [cardResults, count] = await Promise.all([
                prisma.card.findMany({
                    where,
                    orderBy,
                    skip,
                    take: limit,
                    select: {
                        id: true,
                        oracleId: true,
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

            cards = cardResults;
            totalCount = count;
        }

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