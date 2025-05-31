import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Search parameters
        const query = searchParams.get('q') || '';
        const setType = searchParams.get('type');
        const digital = searchParams.get('digital');

        // Pagination
        const page = parseInt(searchParams.get('page') || '1');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
        const skip = (page - 1) * limit;

        // Sorting
        const sortBy = searchParams.get('sortBy') || 'releasedAt';
        const sortOrder = searchParams.get('sortOrder') || 'desc';

        // Build where clause
        const where: any = {};

        // Text search
        if (query) {
            where.OR = [
                { name: { contains: query, mode: 'insensitive' } },
                { code: { contains: query, mode: 'insensitive' } },
            ];
        }

        // Set type filter
        if (setType) {
            where.setType = setType;
        }

        // Digital filter
        if (digital !== null && digital !== undefined) {
            where.digital = digital === 'true';
        }

        // Build orderBy clause
        const orderBy: any = {};
        if (sortBy === 'name') {
            orderBy.name = sortOrder;
        } else if (sortBy === 'code') {
            orderBy.code = sortOrder;
        } else if (sortBy === 'cardCount') {
            orderBy.cardCount = sortOrder;
        } else {
            orderBy.releasedAt = sortOrder;
        }

        // Execute query
        const [sets, totalCount] = await Promise.all([
            prisma.set.findMany({
                where,
                orderBy,
                skip,
                take: limit,
            }),
            prisma.set.count({ where }),
        ]);

        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return NextResponse.json({
            sets,
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
        console.error('Error fetching sets:', error);
        return NextResponse.json(
            { error: 'Failed to fetch sets' },
            { status: 500 }
        );
    }
} 