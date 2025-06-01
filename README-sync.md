# MTG Card Database Sync

This script syncs your MTG card database with the latest data from Scryfall's bulk data API.

## Features

- **Intelligent Sync**: Only downloads and processes data when Scryfall has updates
- **Single Row Tracking**: Uses a simple sync status table to track last sync times
- **Three Data Types**: 
  - Cards (bulk data with `updated_at` timestamp)
  - Rulings (bulk data with `updated_at` timestamp)  
  - Sets (synced daily via API)
- **Memory Efficient**: Streams large files instead of loading into memory
- **Batch Processing**: Processes data in batches for better performance

## Usage

Run the sync script:

```bash
npx tsx scripts/sync-cards.ts
```

## Environment Variables

- `CARD_LIMIT`: Limit the number of cards to process (useful for testing)
- `ENGLISH_ONLY=true`: Only process English cards

## How It Works

1. **Check Sync Status**: Looks for a single row in the `sync_status` table
2. **Compare Timestamps**: For cards and rulings, compares Scryfall's `updated_at` with last sync time
3. **Daily Set Sync**: Sets are synced if more than 24 hours have passed
4. **Download Only If Needed**: Only downloads bulk data files if updates are available
5. **Track Sync Times**: Updates the sync status table after successful completion

## First Run

On the first run (when no sync status exists):
- Downloads all bulk data files
- Processes all cards, rulings, and sets
- Creates the initial sync status record

## Subsequent Runs

On subsequent runs:
- Checks if Scryfall has newer data
- Only processes data types that need updates
- Skips everything if already up to date

## Example Output

### First Run
```
🔄 Starting MTG database sync...
Checking if all_cards needs update...
all_cards:
  Last sync: Never
  Scryfall updated: 2025-05-31T09:31:42.876Z
  Needs update: true
[Downloads and processes all data]
✅ Database sync completed successfully!
```

### Subsequent Run (Up to Date)
```
🔄 Starting MTG database sync...
Checking if all_cards needs update...
all_cards:
  Last sync: 2025-06-01T01:58:38.602Z
  Scryfall updated: 2025-05-31T09:31:42.876Z
  Needs update: false
⏭️  Sets are up to date, skipping...
⏭️  Rulings are up to date, skipping...
⏭️  Cards are up to date, skipping...
✅ Database is already up to date!
```

## Database Schema

The sync status is tracked in a single-row table:

```sql
CREATE TABLE sync_status (
    id INTEGER PRIMARY KEY DEFAULT 1,
    lastCardsSync DATETIME,
    lastRulingsSync DATETIME,
    lastSetsSync DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
``` 