import prisma from '../src/lib/prisma';
import { readFile, writeFile, existsSync, mkdirSync, createReadStream } from 'fs';
import { promisify } from 'util';
import { createInterface } from 'readline';
import path from 'path';

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);

// Scryfall API types
interface ScryfallCard {
    id: string;
    oracle_id?: string;
    mtgo_id?: number;
    tcgplayer_id?: number;
    cardmarket_id?: number;
    name: string;
    printed_name?: string;
    lang: string;
    layout: string;
    mana_cost?: string;
    cmc: number;
    type_line: string;
    oracle_text?: string;
    printed_text?: string;
    flavor_text?: string;
    power?: string;
    toughness?: string;
    loyalty?: string;
    set: string;
    set_name: string;
    set_id: string;
    collector_number: string;
    rarity: string;
    image_uris?: {
        small?: string;
        normal?: string;
        large?: string;
        png?: string;
        art_crop?: string;
        border_crop?: string;
    };
    card_faces?: Array<{
        name: string;
        mana_cost?: string;
        type_line: string;
        oracle_text?: string;
        colors?: string[];
        power?: string;
        toughness?: string;
        loyalty?: string;
        flavor_text?: string;
        artist?: string;
        image_uris?: {
            small?: string;
            normal?: string;
            large?: string;
            png?: string;
            art_crop?: string;
            border_crop?: string;
        };
    }>;
    colors?: string[];
    color_identity?: string[];
    color_indicator?: string[];
    legalities: Record<string, string>;
    reserved: boolean;
    foil: boolean;
    nonfoil: boolean;
    oversized: boolean;
    promo: boolean;
    reprint: boolean;
    variation: boolean;
    frame: string;
    frame_effects?: string[];
    border_color: string;
    prices: {
        usd?: string;
        usd_foil?: string;
        usd_etched?: string;
        eur?: string;
        eur_foil?: string;
        tix?: string;
    };
    arena_id?: number;
    scryfall_uri: string;
    uri: string;
    keywords?: string[];
    produced_mana?: string[];
    watermark?: string;
    artist?: string;
    artist_id?: string;
    illustration_id?: string;
    hand_modifier?: string;
    life_modifier?: string;
    released_at?: string;
}

interface ScryfallSet {
    id: string;
    code: string;
    mtgo_code?: string;
    tcgplayer_id?: number;
    name: string;
    uri: string;
    scryfall_uri: string;
    search_uri: string;
    released_at?: string;
    set_type: string;
    card_count: number;
    digital: boolean;
    foil_only: boolean;
    nonfoil_only: boolean;
    icon_svg_uri?: string;
}

interface ScryfallRuling {
    oracle_id: string;
    source: string;
    published_at: string;
    comment: string;
}

interface BulkDataItem {
    type: string;
    download_uri: string;
    updated_at: string;
}

interface BulkDataResponse {
    data: BulkDataItem[];
}

class ScryfallSeeder {
    private readonly BASE_URL = 'https://api.scryfall.com';
    private readonly DATA_DIR = './data';

    private ensureDataDirectory(): void {
        if (!existsSync(this.DATA_DIR)) {
            mkdirSync(this.DATA_DIR, { recursive: true });
        }
    }

    private async downloadFile(url: string, filename: string): Promise<void> {
        console.log(`Downloading ${filename}...`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download ${filename}: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        await writeFileAsync(path.join(this.DATA_DIR, filename), Buffer.from(buffer));
        console.log(`✓ Downloaded ${filename}`);
    }

    async downloadBulkData(): Promise<void> {
        const forceDownload = process.env.FORCE_DOWNLOAD === 'true';
        this.ensureDataDirectory();

        // Check if files already exist
        const cardsFile = path.join(this.DATA_DIR, 'all_cards.json');
        const rulingsFile = path.join(this.DATA_DIR, 'rulings.json');

        if (!forceDownload && existsSync(cardsFile) && existsSync(rulingsFile)) {
            console.log('Bulk data files already exist. Use FORCE_DOWNLOAD=true to re-download.');
            return;
        }

        console.log('Fetching bulk data info from Scryfall...');
        const response = await fetch(`${this.BASE_URL}/bulk-data`);
        if (!response.ok) {
            throw new Error(`Failed to fetch bulk data info: ${response.statusText}`);
        }

        const bulkData: BulkDataResponse = await response.json();

        for (const item of bulkData.data) {
            if (item.type === 'all_cards') {
                await this.downloadFile(item.download_uri, 'all_cards.json');
            } else if (item.type === 'rulings') {
                await this.downloadFile(item.download_uri, 'rulings.json');
            }
        }
    }

    private async processCardsBatch(cards: ScryfallCard[]): Promise<void> {
        const operations = cards.map(card => {
            // Validate required fields
            if (!card.name) {
                throw new Error(`Card ${card.id} missing required field: name`);
            }
            if (!card.set) {
                throw new Error(`Card ${card.id} (${card.name}) missing required field: set`);
            }
            if (!card.set_name) {
                throw new Error(`Card ${card.id} (${card.name}) missing required field: set_name`);
            }
            if (!card.collector_number) {
                throw new Error(`Card ${card.id} (${card.name}) missing required field: collector_number`);
            }
            if (!card.rarity) {
                throw new Error(`Card ${card.id} (${card.name}) missing required field: rarity`);
            }
            if (!card.scryfall_uri) {
                throw new Error(`Card ${card.id} (${card.name}) missing required field: scryfall_uri`);
            }
            if (!card.uri) {
                throw new Error(`Card ${card.id} (${card.name}) missing required field: uri`);
            }

            // Handle multi-faced cards - extract data from card_faces if available
            let typeLine = card.type_line;
            let manaCost = card.mana_cost;
            let oracleText = card.oracle_text;
            let power = card.power;
            let toughness = card.toughness;
            let loyalty = card.loyalty;
            let colors = card.colors;
            let artist = card.artist;
            let flavorText = card.flavor_text;

            // For multi-faced cards, prefer data from the first face, with fallbacks
            if (card.card_faces && card.card_faces.length > 0) {
                const firstFace = card.card_faces[0];

                // Use card face data if main card data is missing
                if (!typeLine && firstFace.type_line) {
                    typeLine = firstFace.type_line;
                }
                if (!manaCost && firstFace.mana_cost) {
                    manaCost = firstFace.mana_cost;
                }
                if (!oracleText && firstFace.oracle_text) {
                    oracleText = firstFace.oracle_text;
                }
                if (!power && firstFace.power) {
                    power = firstFace.power;
                }
                if (!toughness && firstFace.toughness) {
                    toughness = firstFace.toughness;
                }
                if (!loyalty && firstFace.loyalty) {
                    loyalty = firstFace.loyalty;
                }
                if (!colors && firstFace.colors) {
                    colors = firstFace.colors;
                }
                if (!artist && firstFace.artist) {
                    artist = firstFace.artist;
                }
                if (!flavorText && firstFace.flavor_text) {
                    flavorText = firstFace.flavor_text;
                }
            }

            // Final validation for critical fields after processing card faces
            if (!typeLine) {
                throw new Error(`Card ${card.id} (${card.name}) missing required field: type_line (even after checking card_faces)`);
            }

            return prisma.card.upsert({
                where: { id: card.id },
                create: {
                    id: card.id,
                    oracleId: card.oracle_id,
                    mtgoId: card.mtgo_id,
                    tcgplayerId: card.tcgplayer_id,
                    cardmarketId: card.cardmarket_id,
                    name: card.name,
                    printedName: card.printed_name,
                    lang: card.lang,
                    layout: card.layout,
                    manaCost: manaCost,
                    cmc: card.cmc,
                    typeLine: typeLine,
                    oracleText: oracleText,
                    printedText: card.printed_text,
                    flavorText: flavorText,
                    power: power,
                    toughness: toughness,
                    loyalty: loyalty,
                    setCode: card.set,
                    setName: card.set_name,
                    setId: card.set_id,
                    collectorNumber: card.collector_number,
                    rarity: card.rarity,
                    imageUris: card.image_uris ? JSON.stringify(card.image_uris) : null,
                    cardFaces: card.card_faces ? JSON.stringify(card.card_faces) : null,
                    colors: colors ? JSON.stringify(colors) : null,
                    colorIdentity: card.color_identity ? JSON.stringify(card.color_identity) : null,
                    colorIndicator: card.color_indicator ? JSON.stringify(card.color_indicator) : null,
                    legalities: JSON.stringify(card.legalities),
                    reserved: card.reserved,
                    foil: card.foil,
                    nonfoil: card.nonfoil,
                    oversized: card.oversized,
                    promo: card.promo,
                    reprint: card.reprint,
                    variation: card.variation,
                    frame: card.frame,
                    frameEffects: card.frame_effects ? JSON.stringify(card.frame_effects) : null,
                    borderColor: card.border_color,
                    prices: JSON.stringify(card.prices),
                    arenaId: card.arena_id,
                    scryfallUri: card.scryfall_uri,
                    uri: card.uri,
                    keywords: card.keywords ? JSON.stringify(card.keywords) : null,
                    producedMana: card.produced_mana ? JSON.stringify(card.produced_mana) : null,
                    watermark: card.watermark,
                    artist: artist,
                    artistId: card.artist_id,
                    illustrationId: card.illustration_id,
                    handModifier: card.hand_modifier,
                    lifeModifier: card.life_modifier,
                    releasedAt: card.released_at ? new Date(card.released_at) : null,
                },
                update: {}
            });
        });

        await prisma.$transaction(operations);
    }

    async seedCards(): Promise<void> {
        console.log('\n=== Seeding Cards ===');
        const cardsFile = path.join(this.DATA_DIR, 'all_cards.json');
        const cardLimit = process.env.CARD_LIMIT ? parseInt(process.env.CARD_LIMIT) : undefined;
        const englishOnly = process.env.ENGLISH_ONLY === 'true';

        console.log(`Reading cards from ${cardsFile}`);
        console.log(`English only: ${englishOnly}`);
        console.log(`Limit: ${cardLimit || 'unlimited'}`);

        const fileStream = createReadStream(cardsFile, { encoding: 'utf8' });
        const rl = createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let processed = 0;
        let batch: ScryfallCard[] = [];
        const batchSize = 1000;
        let cardCount = 0;
        let bracketCount = 0;
        let currentObject = '';
        let inArray = false;

        for await (const line of rl) {
            const trimmedLine = line.trim();

            // Skip empty lines
            if (!trimmedLine) continue;

            // Start of array
            if (trimmedLine === '[') {
                inArray = true;
                continue;
            }

            // End of array
            if (trimmedLine === ']') {
                break;
            }

            if (inArray) {
                // Count brackets to handle multi-line JSON objects
                for (const char of trimmedLine) {
                    if (char === '{') bracketCount++;
                    if (char === '}') bracketCount--;
                }

                currentObject += trimmedLine;

                // Complete object when brackets are balanced
                if (bracketCount === 0 && currentObject.trim().length > 0) {
                    // Remove trailing comma if present
                    let cleanObject = currentObject.trim();
                    if (cleanObject.endsWith(',')) {
                        cleanObject = cleanObject.slice(0, -1);
                    }

                    try {
                        const card: ScryfallCard = JSON.parse(cleanObject);

                        // Apply filters
                        if (englishOnly && card.lang !== 'en') {
                            currentObject = '';
                            continue;
                        }

                        batch.push(card);
                        cardCount++;

                        // Process batch when it's full
                        if (batch.length >= batchSize) {
                            await this.processCardsBatch(batch);
                            processed += batch.length;
                            console.log(`Processed ${processed} cards...`);
                            batch = [];
                        }

                        // Check limit
                        if (cardLimit && cardCount >= cardLimit) {
                            break;
                        }
                    } catch (error) {
                        console.error(`Error parsing card JSON: ${error}`);
                        console.error(`Object: ${cleanObject.substring(0, 200)}...`);
                    }

                    currentObject = '';
                }
            }
        }

        // Process remaining cards in batch
        if (batch.length > 0) {
            await this.processCardsBatch(batch);
            processed += batch.length;
        }

        console.log(`✓ Seeded ${processed} cards total`);
    }

    async seedSets(): Promise<void> {
        console.log('\n=== Seeding Sets ===');
        let nextPage = `${this.BASE_URL}/sets`;
        let totalSets = 0;

        while (nextPage) {
            const response = await fetch(nextPage);
            if (!response.ok) {
                throw new Error(`Failed to fetch sets: ${response.statusText}`);
            }

            const data = await response.json();

            for (const set of data.data) {
                await prisma.set.upsert({
                    where: { id: set.id },
                    create: {
                        id: set.id,
                        code: set.code,
                        mtgoCode: set.mtgo_code,
                        tcgplayerId: set.tcgplayer_id,
                        name: set.name,
                        uri: set.uri,
                        scryfallUri: set.scryfall_uri,
                        searchUri: set.search_uri,
                        releasedAt: set.released_at ? new Date(set.released_at) : null,
                        setType: set.set_type,
                        cardCount: set.card_count || 0,
                        digital: set.digital || false,
                        foilOnly: set.foil_only || false,
                        nonfoilOnly: set.nonfoil_only || false,
                        iconSvgUri: set.icon_svg_uri,
                    },
                    update: {}
                });
                totalSets++;
            }

            console.log(`✓ Seeded set: ${data.data[data.data.length - 1].name} (${data.data[data.data.length - 1].code})`);
            nextPage = data.has_more ? data.next_page : null;
        }

        console.log(`✓ Seeded ${totalSets} sets total`);
    }

    async seedRulings(): Promise<void> {
        console.log('\n=== Seeding Rulings ===');
        const rulingsFile = path.join(this.DATA_DIR, 'rulings.json');

        const fileContent = await readFileAsync(rulingsFile, 'utf8');
        const rulings: ScryfallRuling[] = JSON.parse(fileContent);

        console.log(`Found ${rulings.length} rulings in ${rulingsFile}`);

        const batchSize = 1000;
        for (let i = 0; i < rulings.length; i += batchSize) {
            const batch = rulings.slice(i, i + batchSize);

            const operations = batch.map((ruling: ScryfallRuling) => {
                const uniqueId = `${ruling.oracle_id}-${ruling.published_at}-${ruling.comment.slice(0, 50)}`;
                return prisma.ruling.upsert({
                    where: { id: uniqueId },
                    create: {
                        id: uniqueId,
                        oracleId: ruling.oracle_id,
                        source: ruling.source,
                        publishedAt: new Date(ruling.published_at),
                        comment: ruling.comment,
                    },
                    update: {}
                });
            });

            await prisma.$transaction(operations);
            console.log(`Processed ${Math.min(i + batchSize, rulings.length)}/${rulings.length} rulings...`);
        }

        console.log(`✓ Seeded ${rulings.length} rulings`);
    }

    async seedDatabase(): Promise<void> {
        try {
            console.log('🚀 Starting MTG database seeding...');

            // Download bulk data files first
            await this.downloadBulkData();

            // Seed sets
            await this.seedSets();

            // Seed rulings
            await this.seedRulings();

            // Seed cards
            await this.seedCards();

            console.log('\n✅ Database seeding completed successfully!');
        } catch (error) {
            console.error('❌ Error during seeding:', error);
            throw error;
        } finally {
            await prisma.$disconnect();
        }
    }
}

// Main execution
const seeder = new ScryfallSeeder();
seeder.seedDatabase().catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
}); 