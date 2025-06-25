use anyhow::{anyhow, Result};
use chrono::{DateTime, Utc};
use futures::{stream, StreamExt};
use reqwest::Client;
use serde_json::{Deserializer, Value};
use std::fs::{create_dir_all, File};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::fs as async_fs;
use tracing::{error, info, warn};

use crate::database::{DatabaseOperations, SyncType};
use crate::types::{
    BulkDataResponse, ScryfallCard, ScryfallRuling, ScryfallSet, SetsResponse, SyncCheckResult,
    SyncConfig,
};

pub struct ScryfallSyncer {
    client: Client,
    base_url: String,
    data_dir: PathBuf,
    db: Arc<dyn DatabaseOperations>,
    config: SyncConfig,
}

impl ScryfallSyncer {
    pub fn new(db: Arc<dyn DatabaseOperations>, config: SyncConfig) -> Self {
        Self {
            client: Client::builder()
                .user_agent("mtg-sync-rust/1.0 (github.com/user/repo)")
                .build()
                .expect("Failed to create HTTP client"),
            base_url: "https://api.scryfall.com".to_string(),
            data_dir: PathBuf::from("./data"),
            db,
            config,
        }
    }

    fn ensure_data_directory(&self) -> Result<()> {
        if !self.data_dir.exists() {
            create_dir_all(&self.data_dir)?;
        }
        Ok(())
    }

    async fn check_if_update_needed(&self, data_type: &str) -> Result<SyncCheckResult> {
        info!("Checking if {} needs update...", data_type);

        // Get current sync status
        let sync_status = self.db.get_sync_status().await?;
        let last_sync_at = sync_status.as_ref().and_then(|status| match data_type {
            "all_cards" => status.last_cards_sync,
            "rulings" => status.last_rulings_sync,
            _ => None,
        });

        // Get bulk data info from Scryfall
        let url = format!("{}/bulk-data", self.base_url);
        let response = self.client.get(&url).send().await?;
        if !response.status().is_success() {
            return Err(anyhow!(
                "Failed to fetch bulk data info: {}",
                response.status()
            ));
        }

        let bulk_data: BulkDataResponse = response.json().await?;
        let item = bulk_data
            .data
            .iter()
            .find(|item| item.data_type == data_type)
            .ok_or_else(|| anyhow!("Bulk data type {} not found", data_type))?;

        let scryfall_updated_at = item.updated_at;

        // If we haven't synced before, or if Scryfall has newer data, or if force flag is set
        let needs_update =
            self.config.force || last_sync_at.map_or(true, |last| scryfall_updated_at > last);

        info!("{}:", data_type);
        info!("  Last sync: {:?}", last_sync_at);
        info!("  Scryfall updated: {}", scryfall_updated_at);
        info!("  Needs update: {}", needs_update);

        Ok(SyncCheckResult {
            needs_update,
            scryfall_updated_at,
            last_sync_at,
        })
    }

    async fn check_if_sets_need_update(&self) -> Result<SyncCheckResult> {
        info!("Checking if sets need update...");

        let sync_status = self.db.get_sync_status().await?;
        let last_sync_at = sync_status
            .as_ref()
            .and_then(|status| status.last_sets_sync);

        // For sets, we'll check if we need to update by comparing with the last sync time
        // Since sets API doesn't provide a single "updated_at", we'll sync if it's been more than a day
        // or if we've never synced
        let now = Utc::now();
        let one_day_ago = now - chrono::Duration::days(1);

        let needs_update =
            self.config.force || last_sync_at.map_or(true, |last| last < one_day_ago);

        info!("sets:");
        info!("  Last sync: {:?}", last_sync_at);
        info!("  Needs update: {}", needs_update);

        Ok(SyncCheckResult {
            needs_update,
            scryfall_updated_at: now,
            last_sync_at,
        })
    }

    async fn download_file(&self, url: &str, filename: &str) -> Result<()> {
        info!("Downloading {}...", filename);

        let response = self.client.get(url).send().await?;
        if !response.status().is_success() {
            return Err(anyhow!(
                "Failed to download {}: {}",
                filename,
                response.status()
            ));
        }

        let file_path = self.data_dir.join(filename);
        let mut file = tokio::fs::File::create(&file_path).await?;

        let mut stream = response.bytes_stream();
        while let Some(chunk) = stream.next().await {
            let chunk = chunk?;
            tokio::io::AsyncWriteExt::write_all(&mut file, &chunk).await?;
        }

        info!("✓ Downloaded {}", filename);
        Ok(())
    }

    pub async fn download_bulk_data_if_needed(&self) -> Result<(bool, bool)> {
        self.ensure_data_directory()?;

        let cards_check = self.check_if_update_needed("all_cards").await?;
        let rulings_check = self.check_if_update_needed("rulings").await?;

        if cards_check.needs_update || rulings_check.needs_update {
            info!("Fetching bulk data info from Scryfall...");
            let url = format!("{}/bulk-data", self.base_url);
            let response = self.client.get(&url).send().await?;
            if !response.status().is_success() {
                return Err(anyhow!(
                    "Failed to fetch bulk data info: {}",
                    response.status()
                ));
            }

            let bulk_data: BulkDataResponse = response.json().await?;

            for item in &bulk_data.data {
                if item.data_type == "all_cards" && cards_check.needs_update {
                    self.download_file(&item.download_uri, "all_cards.json")
                        .await?;
                } else if item.data_type == "rulings" && rulings_check.needs_update {
                    self.download_file(&item.download_uri, "rulings.json")
                        .await?;
                }
            }
        }

        Ok((cards_check.needs_update, rulings_check.needs_update))
    }

    async fn process_cards_batch(&self, cards: &[ScryfallCard]) -> Result<()> {
        // Validate required fields for all cards first
        for card in cards {
            if card.name.is_empty() {
                return Err(anyhow!("Card {} missing required field: name", card.id));
            }
            if card.set.is_empty() {
                return Err(anyhow!(
                    "Card {} ({}) missing required field: set",
                    card.id,
                    card.name
                ));
            }
            if card.set_name.is_empty() {
                return Err(anyhow!(
                    "Card {} ({}) missing required field: set_name",
                    card.id,
                    card.name
                ));
            }
            if card.collector_number.is_empty() {
                return Err(anyhow!(
                    "Card {} ({}) missing required field: collector_number",
                    card.id,
                    card.name
                ));
            }
            if card.rarity.is_empty() {
                return Err(anyhow!(
                    "Card {} ({}) missing required field: rarity",
                    card.id,
                    card.name
                ));
            }
            if card.scryfall_uri.is_empty() {
                return Err(anyhow!(
                    "Card {} ({}) missing required field: scryfall_uri",
                    card.id,
                    card.name
                ));
            }
            if card.uri.is_empty() {
                return Err(anyhow!(
                    "Card {} ({}) missing required field: uri",
                    card.id,
                    card.name
                ));
            }

            // Check type_line - either on main card or first card face
            let has_type_line = card.type_line.as_ref().map_or(false, |tl| !tl.is_empty())
                || card.card_faces.as_ref().map_or(false, |faces| {
                    !faces.is_empty()
                        && faces[0]
                            .type_line
                            .as_ref()
                            .map_or(false, |tl| !tl.is_empty())
                });

            if !has_type_line {
                return Err(anyhow!("Card {} ({}) missing required field: type_line (even after checking card_faces)", card.id, card.name));
            }
        }

        self.db.upsert_cards_batch(cards).await
    }

    pub async fn sync_cards(&self) -> Result<()> {
        info!("\n=== Syncing Cards ===");
        let cards_file = self.data_dir.join("all_cards.json");

        info!("Reading cards from {:?}", cards_file);
        info!("English only: {}", self.config.english_only);
        info!("Limit: {:?}", self.config.card_limit);

        let file = File::open(&cards_file)?;
        let mut reader = BufReader::new(file);
        let mut line = String::new();

        let mut processed = 0;
        let mut batch: Vec<ScryfallCard> = Vec::new();
        let mut card_count = 0;

        // Read line by line to handle large files
        while reader.read_line(&mut line)? > 0 {
            let trimmed_line = line.trim();

            // Skip empty lines and array markers
            if trimmed_line.is_empty() || trimmed_line == "[" || trimmed_line == "]" {
                line.clear();
                continue;
            }

            // Remove trailing comma and parse JSON
            let json_str = if trimmed_line.ends_with(',') {
                &trimmed_line[..trimmed_line.len() - 1]
            } else {
                trimmed_line
            };

            match serde_json::from_str::<ScryfallCard>(json_str) {
                Ok(card) => {
                    // Apply filters
                    if self.config.english_only && card.lang != "en" {
                        line.clear();
                        continue;
                    }

                    batch.push(card);
                    card_count += 1;

                    // Process batch when it's full
                    if batch.len() >= self.config.batch_size {
                        self.process_cards_batch(&batch).await?;
                        processed += batch.len();
                        info!("Processed {} cards...", processed);
                        batch.clear();
                    }

                    // Check limit
                    if let Some(limit) = self.config.card_limit {
                        if card_count >= limit {
                            break;
                        }
                    }
                }
                Err(e) => {
                    error!("Error parsing card JSON: {}", e);
                    error!(
                        "Object: {}...",
                        &json_str[..std::cmp::min(200, json_str.len())]
                    );
                }
            }

            line.clear();
        }

        // Process remaining cards in batch
        if !batch.is_empty() {
            self.process_cards_batch(&batch).await?;
            processed += batch.len();
        }

        info!("✓ Synced {} cards total", processed);

        // Update sync status
        self.db
            .update_sync_status(SyncType::Cards, Utc::now())
            .await?;
        Ok(())
    }

    pub async fn sync_sets(&self) -> Result<()> {
        info!("\n=== Syncing Sets ===");
        let mut next_page = Some(format!("{}/sets", self.base_url));
        let mut total_sets = 0;

        while let Some(url) = next_page {
            let response = self.client.get(&url).send().await?;
            if !response.status().is_success() {
                return Err(anyhow!("Failed to fetch sets: {}", response.status()));
            }

            let data: SetsResponse = response.json().await?;

            for set in &data.data {
                self.db.upsert_set(set).await?;
                total_sets += 1;
            }

            if let Some(last_set) = data.data.last() {
                info!("✓ Synced set: {} ({})", last_set.name, last_set.code);
            }

            next_page = if data.has_more { data.next_page } else { None };
        }

        info!("✓ Synced {} sets total", total_sets);

        // Update sync status
        self.db
            .update_sync_status(SyncType::Sets, Utc::now())
            .await?;
        Ok(())
    }

    pub async fn sync_rulings(&self) -> Result<()> {
        info!("\n=== Syncing Rulings ===");
        let rulings_file = self.data_dir.join("rulings.json");

        let file_content = async_fs::read_to_string(&rulings_file).await?;
        let rulings: Vec<ScryfallRuling> = serde_json::from_str(&file_content)?;

        info!("Found {} rulings in {:?}", rulings.len(), rulings_file);

        let batch_size = self.config.batch_size;
        for chunk in rulings.chunks(batch_size) {
            self.db.upsert_rulings_batch(chunk).await?;
            info!("Processed rulings batch...");
        }

        info!("✓ Synced {} rulings", rulings.len());

        // Update sync status
        self.db
            .update_sync_status(SyncType::Rulings, Utc::now())
            .await?;
        Ok(())
    }

    pub async fn sync_database(&self) -> Result<()> {
        info!("🔄 Starting MTG database sync...");

        // Check what needs to be updated and download files if needed
        let (cards_need_update, rulings_need_update) = self.download_bulk_data_if_needed().await?;
        let sets_check = self.check_if_sets_need_update().await?;

        let mut anything_updated = false;

        // Sync sets if needed
        if sets_check.needs_update {
            self.sync_sets().await?;
            anything_updated = true;
        } else {
            info!("\n⏭️  Sets are up to date, skipping...");
        }

        // Sync rulings if needed
        if rulings_need_update {
            self.sync_rulings().await?;
            anything_updated = true;
        } else {
            info!("\n⏭️  Rulings are up to date, skipping...");
        }

        // Sync cards if needed
        if cards_need_update {
            self.sync_cards().await?;
            anything_updated = true;
        } else {
            info!("\n⏭️  Cards are up to date, skipping...");
        }

        if anything_updated {
            info!("\n✅ Database sync completed successfully!");
        } else {
            info!("\n✅ Database is already up to date!");
        }

        Ok(())
    }
}
