use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ImageUris {
    pub small: Option<String>,
    pub normal: Option<String>,
    pub large: Option<String>,
    pub png: Option<String>,
    pub art_crop: Option<String>,
    pub border_crop: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CardFace {
    pub name: String,
    pub mana_cost: Option<String>,
    pub type_line: Option<String>,
    pub cmc: Option<f64>,
    pub oracle_text: Option<String>,
    pub colors: Option<Vec<String>>,
    pub power: Option<String>,
    pub toughness: Option<String>,
    pub loyalty: Option<String>,
    pub flavor_text: Option<String>,
    pub artist: Option<String>,
    pub image_uris: Option<ImageUris>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Prices {
    pub usd: Option<String>,
    pub usd_foil: Option<String>,
    pub usd_etched: Option<String>,
    pub eur: Option<String>,
    pub eur_foil: Option<String>,
    pub tix: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ScryfallCard {
    pub id: String,
    pub oracle_id: Option<String>,
    pub mtgo_id: Option<i32>,
    pub tcgplayer_id: Option<i32>,
    pub cardmarket_id: Option<i32>,
    pub name: String,
    pub printed_name: Option<String>,
    pub lang: String,
    pub layout: String,
    pub mana_cost: Option<String>,
    pub cmc: Option<f64>,
    pub type_line: Option<String>,
    pub oracle_text: Option<String>,
    pub printed_text: Option<String>,
    pub flavor_text: Option<String>,
    pub power: Option<String>,
    pub toughness: Option<String>,
    pub loyalty: Option<String>,
    pub set: String,
    pub set_name: String,
    pub set_id: String,
    pub collector_number: String,
    pub rarity: String,
    pub image_uris: Option<ImageUris>,
    pub card_faces: Option<Vec<CardFace>>,
    pub colors: Option<Vec<String>>,
    pub color_identity: Option<Vec<String>>,
    pub color_indicator: Option<Vec<String>>,
    pub legalities: HashMap<String, String>,
    pub reserved: bool,
    pub foil: bool,
    pub nonfoil: bool,
    pub oversized: bool,
    pub promo: bool,
    pub reprint: bool,
    pub variation: bool,
    pub frame: String,
    pub frame_effects: Option<Vec<String>>,
    pub border_color: String,
    pub prices: Prices,
    pub arena_id: Option<i32>,
    pub scryfall_uri: String,
    pub uri: String,
    pub keywords: Option<Vec<String>>,
    pub produced_mana: Option<Vec<String>>,
    pub watermark: Option<String>,
    pub artist: Option<String>,
    pub artist_id: Option<String>,
    pub illustration_id: Option<String>,
    pub hand_modifier: Option<String>,
    pub life_modifier: Option<String>,
    pub released_at: Option<NaiveDate>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ScryfallSet {
    pub id: String,
    pub code: String,
    pub mtgo_code: Option<String>,
    pub tcgplayer_id: Option<i32>,
    pub name: String,
    pub uri: String,
    pub scryfall_uri: String,
    pub search_uri: String,
    pub released_at: Option<NaiveDate>,
    pub set_type: String,
    pub card_count: i32,
    pub digital: bool,
    pub foil_only: bool,
    pub nonfoil_only: bool,
    pub icon_svg_uri: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ScryfallRuling {
    pub oracle_id: String,
    pub source: String,
    pub published_at: NaiveDate,
    pub comment: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BulkDataItem {
    #[serde(rename = "type")]
    pub data_type: String,
    pub download_uri: String,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BulkDataResponse {
    pub data: Vec<BulkDataItem>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SetsResponse {
    pub data: Vec<ScryfallSet>,
    pub has_more: bool,
    pub next_page: Option<String>,
}

#[derive(Debug, Clone)]
pub struct SyncCheckResult {
    pub needs_update: bool,
    pub scryfall_updated_at: DateTime<Utc>,
    pub last_sync_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone)]
pub struct SyncConfig {
    pub card_limit: Option<usize>,
    pub english_only: bool,
    pub batch_size: usize,
    pub force: bool,
}

impl Default for SyncConfig {
    fn default() -> Self {
        Self {
            card_limit: None,
            english_only: false,
            batch_size: 1000,
            force: false,
        }
    }
}
