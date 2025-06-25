use anyhow::Result;
use clap::Parser;
use mtg_sync::{DatabaseOperations, PostgresDatabase, ScryfallSyncer, SqliteDatabase, SyncConfig};
use sqlx::{Pool, Postgres, Sqlite};
use std::env;
use std::sync::Arc;
use tracing::{error, info};
use tracing_subscriber;

#[derive(Parser)]
#[command(name = "sync-cards")]
#[command(about = "Sync MTG cards from Scryfall API to database")]
struct Args {
    /// Database URL (sqlite or postgres)
    #[arg(long)]
    database_url: Option<String>,

    /// Limit number of cards to sync (for testing)
    #[arg(long)]
    card_limit: Option<usize>,

    /// Only sync English cards
    #[arg(long)]
    english_only: bool,

    /// Batch size for processing cards
    #[arg(long, default_value = "1000")]
    batch_size: usize,

    /// Database type (sqlite or postgres)
    #[arg(long, default_value = "sqlite")]
    db_type: String,

    /// Force sync even if data appears up to date
    #[arg(long)]
    force: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    let args = Args::parse();

    info!("Starting MTG card sync...");
    info!("Database type: {}", args.db_type);
    info!("English only: {}", args.english_only);
    info!("Card limit: {:?}", args.card_limit);
    info!("Batch size: {}", args.batch_size);
    info!("Force sync: {}", args.force);

    // Create sync config
    let config = SyncConfig {
        card_limit: args.card_limit,
        english_only: args.english_only,
        batch_size: args.batch_size,
        force: args.force,
    };

    // Determine database URL
    let database_url = args
        .database_url
        .unwrap_or_else(|| match args.db_type.as_str() {
            "postgres" => env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://user:password@localhost/mtg".to_string()),
            _ => env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite:./data/mtg.db".to_string()),
        });

    info!("Connecting to database: {}", database_url);

    // Create data directory for downloading Scryfall bulk files (needed for both SQLite and PostgreSQL)
    std::fs::create_dir_all("./data")?;

    // Create database connection based on type
    let db: Arc<dyn DatabaseOperations> = match args.db_type.as_str() {
        "postgres" => {
            let pool = Pool::<Postgres>::connect(&database_url).await?;
            Arc::new(PostgresDatabase::new(pool))
        }
        "sqlite" => {
            let pool = Pool::<Sqlite>::connect(&database_url).await?;
            Arc::new(SqliteDatabase::new(pool))
        }
        _ => {
            error!("Unsupported database type: {}", args.db_type);
            return Err(anyhow::anyhow!(
                "Unsupported database type: {}",
                args.db_type
            ));
        }
    };

    // Create and run syncer
    let syncer = ScryfallSyncer::new(db, config);

    match syncer.sync_database().await {
        Ok(()) => {
            info!("✅ Sync completed successfully!");
            Ok(())
        }
        Err(e) => {
            error!("❌ Sync failed: {}", e);
            Err(e)
        }
    }
}
