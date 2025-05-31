# Cardz - MTG Deck Building Website

A comprehensive Magic: The Gathering deck building website similar to Moxfield, built with Next.js, Prisma, and SQLite. This project sources its card data from the same place as Moxfield: the Scryfall API.

## Features

- **Complete MTG Card Database**: Comprehensive card data including all properties like mana cost, type, power/toughness, legalities, prices, and more
- **Advanced Search**: Search cards by name, text, type, colors, CMC, rarity, format legality, and more
- **Set Management**: Complete MTG set information with search and filtering
- **Card Rulings**: Official rulings for cards when available
- **API-First Design**: RESTful API endpoints for all data access
- **Fast Database**: SQLite with optimized indexes for quick searches
- **Type Safety**: Full TypeScript support with Prisma-generated types

## Tech Stack

- **Frontend**: Next.js 15 with TypeScript
- **Database**: SQLite with Prisma ORM
- **Styling**: Tailwind CSS
- **Data Source**: Scryfall API
- **Package Manager**: Bun

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Git

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd cardz
```

2. Install dependencies:
```bash
bun install
# or
npm install
```

3. Set up the database:
```bash
# Generate Prisma client
bun run db:generate

# Run database migrations
bun run db:migrate
```

4. Seed the database with MTG card data:

**Important: The seeding process now uses Scryfall's bulk data API for maximum efficiency**

```bash
# Seed with a sample of 10,000 cards (recommended for testing)
bun run db:seed-sample

# Seed with ALL cards (~700,000+ cards, requires ~2-3GB disk space)
bun run db:seed

# Seed only English cards (reduces database size significantly)
bun run db:seed-en

# Force re-download bulk data files (useful for updates)
bun run db:seed-force
```

5. Start the development server:
```bash
bun run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Database Schema

### Card Model
The Card model includes comprehensive MTG card data:
- Basic info (name, mana cost, CMC, type line, oracle text)
- Game data (power, toughness, loyalty, colors, color identity)
- Set information (set code, collector number, rarity)
- Visual data (image URIs, card faces for double-faced cards)
- Legality information for all formats
- Pricing data from multiple sources
- Artist and illustration information
- Keywords and abilities

### Set Model
Contains information about MTG sets:
- Set code, name, and type
- Release date and card count
- Digital/physical availability
- Set icon and URIs

### Ruling Model
Official card rulings linked to cards by Oracle ID.

## API Endpoints

### Cards

#### `GET /api/cards`
Search and filter cards with pagination.

**Query Parameters:**
- `q` - General text search across name, oracle text, type line, and flavor text
- `name` - Specific name search
- `set` - Filter by set code
- `colors` - Filter by exact color combination (JSON array)
- `colorIdentity` - Filter by color identity (JSON array)
- `type` - Filter by type line (partial match)
- `rarity` - Filter by rarity (common, uncommon, rare, mythic)
- `cmc` - Filter by converted mana cost
- `cmcOp` - CMC operator (eq, gte, lte, gt, lt)
- `format` - Filter by format legality (standard, modern, legacy, etc.)
- `lang` - Language filter (default: en)
- `page` - Page number (default: 1)
- `limit` - Results per page (max: 100, default: 20)
- `sortBy` - Sort field (name, cmc, set, rarity, released)
- `sortOrder` - Sort direction (asc, desc)

**Example:**
```
GET /api/cards?q=lightning&type=instant&rarity=common&page=1&limit=20
```

#### `GET /api/cards/[id]`
Get a specific card by Scryfall ID, including rulings.

### Sets

#### `GET /api/sets`
List and search MTG sets.

**Query Parameters:**
- `q` - Search by set name or code
- `type` - Filter by set type (expansion, core, masters, etc.)
- `digital` - Filter by digital availability (true/false)
- `page`, `limit` - Pagination
- `sortBy` - Sort field (name, code, cardCount, releasedAt)
- `sortOrder` - Sort direction

## Database Commands

```bash
# Generate Prisma client after schema changes
bun run db:generate

# Create and apply new migration
bun run db:migrate

# Reset database (careful - this deletes all data!)
bun run db:reset

# Seed database with sample data (10,000 cards)
bun run db:seed-sample

# Seed database with all cards (~700,000+ cards)
bun run db:seed

# Seed only English cards (reduces size significantly)
bun run db:seed-en

# Force re-download bulk data files
bun run db:seed-force

# Open Prisma Studio for database exploration
bun run db:studio
```

## Bulk Data Seeding

The seeding process now uses Scryfall's **bulk data API** for maximum efficiency:

1. **Downloads complete datasets**: Instead of paginating through search results, downloads complete JSON files
2. **Caches locally**: Downloaded files are stored in the `data/` directory and reused unless forced
3. **Processes in batches**: Cards are processed in batches of 1000 for optimal performance
4. **Memory efficient**: Uses streaming/generator patterns to avoid loading entire datasets into memory
5. **Multi-faced card support**: Properly handles double-faced cards, modal cards, and transforming cards by extracting data from `card_faces` when needed
6. **Robust JSON parsing**: Handles multi-line JSON objects and malformed data gracefully

### Key Features for Multi-Faced Cards

The seeding script now properly handles cards with multiple faces (like double-faced cards, transforming cards, etc.) by:

- **Smart field extraction**: Automatically extracts `type_line`, `mana_cost`, `oracle_text`, and other fields from `card_faces` when the main card object doesn't contain them
- **Fallback logic**: Uses data from the first card face if the main card data is missing, ensuring no cards are skipped
- **Validation**: Performs proper validation after processing card faces to ensure data integrity

This improvement resolves issues with cards like Delver of Secrets, Huntmaster of the Fells, and other popular multi-faced cards.

### Environment Variables for Seeding

Create a `.env` file or set environment variables:

```env
DATABASE_URL="file:./dev.db"

# Seeding options
CARD_LIMIT=10000          # Limit number of cards to process (0 = all cards)
ENGLISH_ONLY=true         # Only process English cards
FORCE_DOWNLOAD=true       # Force re-download of bulk data files
```

### Seeding Performance

- **Sample seed (10k cards)**: ~2-3 minutes
- **English only (~400k cards)**: ~15-20 minutes  
- **All cards (~700k+ cards)**: ~25-35 minutes
- **Bulk data download**: ~5-10 minutes (one-time, cached afterward)

## Data Source

This project uses the [Scryfall API](https://scryfall.com/docs/api) as its data source, specifically:

- **Bulk Data API**: For downloading complete card and ruling datasets
- **Sets API**: For fetching set information
- **High-resolution images**: Direct from Scryfall's CDN
- **Real-time pricing**: From multiple marketplace sources
- **Official rulings**: From Wizards of the Coast

The bulk data approach ensures you get the complete, up-to-date MTG database efficiently.

## Environment Variables

Create a `.env` file with:

```env
DATABASE_URL="file:./dev.db"

# Optional seeding configuration
CARD_LIMIT=10000          # Limit cards during seeding (0 = unlimited)
ENGLISH_ONLY=true         # Only English cards
FORCE_DOWNLOAD=true       # Force re-download bulk data
```

## Development

### Project Structure

```
src/
├── app/
│   └── api/
│       ├── cards/
│       │   ├── route.ts        # Card search API
│       │   └── [id]/route.ts   # Single card API
│       └── sets/
│           └── route.ts        # Sets API
├── lib/
│   └── prisma.ts              # Prisma client configuration
└── generated/
    └── prisma/                # Generated Prisma client

scripts/
└── seed-cards.ts              # Bulk data seeding script

data/                          # Cached bulk data files
├── all_cards.json            # Complete card database (~500MB)
└── rulings.json              # All card rulings

prisma/
├── schema.prisma              # Database schema
└── migrations/                # Database migrations
```

### Database Optimization

The database schema includes optimized indexes for common queries:
- Card name searches
- Set code lookups
- Oracle ID grouping
- Type line filtering
- Color and CMC searches
- Rarity filtering

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Acknowledgments

- [Scryfall](https://scryfall.com/) for providing the comprehensive MTG API
- [Moxfield](https://www.moxfield.com/) for inspiration
- The MTG community for continuous support and feedback