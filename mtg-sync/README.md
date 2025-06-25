# MTG Sync - Rust Implementation

A Rust implementation of the MTG card synchronization tool that downloads card data from the Scryfall API and stores it in a database. This is a rewrite of the TypeScript version with the same functionality.

## Features

- **Complete Scryfall API Integration**: Downloads cards, sets, and rulings from Scryfall's bulk data API
- **Database Abstraction**: Uses traits to support both SQLite and PostgreSQL databases
- **Incremental Sync**: Only downloads and processes data when Scryfall has updates
- **Batch Processing**: Efficiently processes cards in configurable batches
- **Multi-faced Card Support**: Properly handles double-faced and multi-faced Magic cards
- **Filtering Options**: Support for English-only cards and card limits for testing
- **Progress Tracking**: Comprehensive logging and progress reporting

## Installation

Make sure you have Rust installed, then:

```bash
cd mtg-sync
cargo build --release
```

## Usage

### Basic Usage

```bash
# Sync to SQLite database (default)
cargo run --bin sync-cards

# Sync to PostgreSQL
cargo run --bin sync-cards -- --db-type postgres --database-url "postgres://user:password@localhost/mtg"
```

### Command Line Options

```bash
Options:
  --database-url <DATABASE_URL>  Database URL (sqlite or postgres)
  --card-limit <CARD_LIMIT>      Limit number of cards to sync (for testing)
  --english-only                 Only sync English cards
  --batch-size <BATCH_SIZE>      Batch size for processing cards [default: 1000]
  --db-type <DB_TYPE>           Database type (sqlite or postgres) [default: sqlite]
  -h, --help                     Print help
```

### Environment Variables

You can also set configuration via environment variables:

```bash
export DATABASE_URL="sqlite:./data/mtg.db"
export CARD_LIMIT=1000
export ENGLISH_ONLY=true
cargo run --bin sync-cards
```

### Examples

```bash
# Sync only 1000 English cards to test
cargo run --bin sync-cards -- --card-limit 1000 --english-only

# Sync to PostgreSQL with custom batch size
cargo run --bin sync-cards -- --db-type postgres --database-url "postgres://localhost/mtg" --batch-size 500

# Sync to SQLite in a specific location
cargo run --bin sync-cards -- --database-url "sqlite:/path/to/mtg.db"
```

## Database Schema

The tool expects the following database schema (matches the original TypeScript/Prisma version):

### SQLite Tables

- `SyncStatus` - Tracks last sync timestamps
- `Card` - MTG card data with all Scryfall fields
- `Set` - MTG set information  
- `Ruling` - Card rulings and oracle text updates

### PostgreSQL Tables

Same schema but with quoted identifiers for case sensitivity:
- `"SyncStatus"`, `"Card"`, `"Set"`, `"Ruling"`

## Architecture

### Database Abstraction

The code uses Rust traits to abstract database operations:

```rust
#[async_trait]
pub trait DatabaseOperations: Send + Sync {
    async fn get_sync_status(&self) -> Result<Option<SyncStatus>>;
    async fn update_sync_status(&self, sync_type: SyncType, timestamp: DateTime<Utc>) -> Result<()>;
    async fn upsert_cards_batch(&self, cards: &[ScryfallCard]) -> Result<()>;
    async fn upsert_set(&self, set: &ScryfallSet) -> Result<()>;
    async fn upsert_rulings_batch(&self, rulings: &[ScryfallRuling]) -> Result<()>;
}
```

This makes it easy to switch between SQLite and PostgreSQL, or add support for other databases.

### Data Types

All Scryfall API types are modeled as Rust structs with serde serialization:

```rust
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ScryfallCard {
    pub id: String,
    pub name: String,
    pub mana_cost: Option<String>,
    // ... all other Scryfall fields
}
```

### Sync Process

1. **Check for Updates**: Compares local sync timestamps with Scryfall's bulk data timestamps
2. **Download**: Downloads only the data that has been updated
3. **Process**: Streams through large JSON files line-by-line to handle memory efficiently
4. **Batch Insert**: Processes records in configurable batches for optimal database performance
5. **Track Progress**: Updates sync status and provides detailed logging

## Differences from TypeScript Version

While maintaining the same functionality, this Rust version offers:

- **Better Performance**: Rust's zero-cost abstractions and efficient memory management
- **Type Safety**: Compile-time guarantees prevent many runtime errors
- **Memory Efficiency**: Streaming JSON parsing instead of loading entire files
- **Database Flexibility**: Clean trait-based abstraction for easy database switching
- **Better Error Handling**: Comprehensive error types with anyhow

## Development

### Running Tests

```bash
cargo test
```

### Adding a New Database

To add support for a new database:

1. Create a new struct that implements `DatabaseOperations`
2. Add the connection logic to `main.rs`
3. Update the CLI to accept the new database type

### Code Structure

- `src/types.rs` - All Scryfall API data structures
- `src/database.rs` - Database trait and implementations  
- `src/syncer.rs` - Main sync logic and API interactions
- `src/bin/sync-cards.rs` - CLI application and database setup
- `src/lib.rs` - Library exports

## Performance Notes

- The tool processes large files (500MB+ for all cards) efficiently by streaming
- Batch sizes can be tuned based on your database and memory constraints
- PostgreSQL generally handles larger batches better than SQLite
- The sync process is incremental and will skip unchanged data

## Troubleshooting

### Memory Issues
- Reduce batch size: `--batch-size 100`
- Enable English-only filtering: `--english-only`

### Database Connection Issues
- Ensure database exists and is accessible
- Check connection string format
- For SQLite, ensure directory exists and is writable

### Sync Issues
- Check internet connection to Scryfall API
- Verify data directory permissions for file downloads
- Review logs for specific error messages 