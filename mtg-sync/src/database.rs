use anyhow::Result;
use async_trait::async_trait;
use chrono::{DateTime, NaiveDate, Utc};
use serde_json::Value;
use sqlx::{Any, Pool, Postgres, Row, Sqlite};

use crate::types::{ScryfallCard, ScryfallRuling, ScryfallSet};

#[async_trait]
pub trait DatabaseOperations: Send + Sync {
    async fn get_sync_status(&self) -> Result<Option<SyncStatus>>;
    async fn update_sync_status(&self, sync_type: SyncType, timestamp: DateTime<Utc>)
        -> Result<()>;
    async fn upsert_cards_batch(&self, cards: &[ScryfallCard]) -> Result<()>;
    async fn upsert_set(&self, set: &ScryfallSet) -> Result<()>;
    async fn upsert_rulings_batch(&self, rulings: &[ScryfallRuling]) -> Result<()>;
}

#[derive(Debug, Clone)]
pub struct SyncStatus {
    pub id: i32,
    pub last_cards_sync: Option<DateTime<Utc>>,
    pub last_rulings_sync: Option<DateTime<Utc>>,
    pub last_sets_sync: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone)]
pub enum SyncType {
    Cards,
    Rulings,
    Sets,
}

pub struct SqliteDatabase {
    pool: Pool<Sqlite>,
}

pub struct PostgresDatabase {
    pool: Pool<Postgres>,
}

impl SqliteDatabase {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }
}

impl PostgresDatabase {
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl DatabaseOperations for SqliteDatabase {
    async fn get_sync_status(&self) -> Result<Option<SyncStatus>> {
        let query =
            "SELECT id, lastCardsSync, lastRulingsSync, lastSetsSync FROM sync_status WHERE id = 1";

        let row = sqlx::query(query).fetch_optional(&self.pool).await?;

        if let Some(row) = row {
            Ok(Some(SyncStatus {
                id: row.get::<i32, _>("id"),
                last_cards_sync: row.get::<Option<DateTime<Utc>>, _>("lastCardsSync"),
                last_rulings_sync: row.get::<Option<DateTime<Utc>>, _>("lastRulingsSync"),
                last_sets_sync: row.get::<Option<DateTime<Utc>>, _>("lastSetsSync"),
            }))
        } else {
            Ok(None)
        }
    }

    async fn update_sync_status(
        &self,
        sync_type: SyncType,
        timestamp: DateTime<Utc>,
    ) -> Result<()> {
        let (field, value) = match sync_type {
            SyncType::Cards => ("lastCardsSync", timestamp),
            SyncType::Rulings => ("lastRulingsSync", timestamp),
            SyncType::Sets => ("lastSetsSync", timestamp),
        };

        let query = format!(
            "INSERT INTO sync_status (id, {}, updatedAt) VALUES (1, ?, CURRENT_TIMESTAMP) 
             ON CONFLICT(id) DO UPDATE SET {} = ?, updatedAt = CURRENT_TIMESTAMP",
            field, field
        );

        sqlx::query(&query)
            .bind(value)
            .bind(value)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    async fn upsert_cards_batch(&self, cards: &[ScryfallCard]) -> Result<()> {
        let mut transaction = self.pool.begin().await?;

        for card in cards {
            // Process card faces for multi-faced cards
            let (
                type_line,
                mana_cost,
                oracle_text,
                power,
                toughness,
                loyalty,
                colors,
                artist,
                flavor_text,
            ) = process_card_data(card);

            // Handle optional cmc field - some cards might have missing cmc at top level
            let cmc_value = card.cmc.unwrap_or(0.0);

            let query = r#"
                INSERT INTO Card (
                    id, oracleId, mtgoId, tcgplayerId, cardmarketId, name, printedName, lang,
                    layout, manaCost, cmc, typeLine, oracleText, printedText, flavorText,
                    power, toughness, loyalty, setCode, setName, setId, collectorNumber,
                    rarity, imageUris, cardFaces, colors, colorIdentity, colorIndicator,
                    legalities, reserved, foil, nonfoil, oversized, promo, reprint,
                    variation, frame, frameEffects, borderColor, prices, arenaId,
                    scryfallUri, uri, keywords, producedMana, watermark, artist,
                    artistId, illustrationId, handModifier, lifeModifier, releasedAt,
                    createdAt, updatedAt
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                ON CONFLICT(id) DO UPDATE SET
                    oracleId = excluded.oracleId,
                    mtgoId = excluded.mtgoId,
                    tcgplayerId = excluded.tcgplayerId,
                    cardmarketId = excluded.cardmarketId,
                    name = excluded.name,
                    printedName = excluded.printedName,
                    lang = excluded.lang,
                    layout = excluded.layout,
                    manaCost = excluded.manaCost,
                    cmc = excluded.cmc,
                    typeLine = excluded.typeLine,
                    oracleText = excluded.oracleText,
                    printedText = excluded.printedText,
                    flavorText = excluded.flavorText,
                    power = excluded.power,
                    toughness = excluded.toughness,
                    loyalty = excluded.loyalty,
                    setCode = excluded.setCode,
                    setName = excluded.setName,
                    setId = excluded.setId,
                    collectorNumber = excluded.collectorNumber,
                    rarity = excluded.rarity,
                    imageUris = excluded.imageUris,
                    cardFaces = excluded.cardFaces,
                    colors = excluded.colors,
                    colorIdentity = excluded.colorIdentity,
                    colorIndicator = excluded.colorIndicator,
                    legalities = excluded.legalities,
                    reserved = excluded.reserved,
                    foil = excluded.foil,
                    nonfoil = excluded.nonfoil,
                    oversized = excluded.oversized,
                    promo = excluded.promo,
                    reprint = excluded.reprint,
                    variation = excluded.variation,
                    frame = excluded.frame,
                    frameEffects = excluded.frameEffects,
                    borderColor = excluded.borderColor,
                    prices = excluded.prices,
                    arenaId = excluded.arenaId,
                    scryfallUri = excluded.scryfallUri,
                    uri = excluded.uri,
                    keywords = excluded.keywords,
                    producedMana = excluded.producedMana,
                    watermark = excluded.watermark,
                    artist = excluded.artist,
                    artistId = excluded.artistId,
                    illustrationId = excluded.illustrationId,
                    handModifier = excluded.handModifier,
                    lifeModifier = excluded.lifeModifier,
                    releasedAt = excluded.releasedAt,
                    updatedAt = CURRENT_TIMESTAMP
            "#;

            sqlx::query(query)
                .bind(&card.id)
                .bind(&card.oracle_id)
                .bind(card.mtgo_id)
                .bind(card.tcgplayer_id)
                .bind(card.cardmarket_id)
                .bind(&card.name)
                .bind(&card.printed_name)
                .bind(&card.lang)
                .bind(&card.layout)
                .bind(&mana_cost)
                .bind(cmc_value)
                .bind(&type_line)
                .bind(&oracle_text)
                .bind(&card.printed_text)
                .bind(&flavor_text)
                .bind(&power)
                .bind(&toughness)
                .bind(&loyalty)
                .bind(&card.set)
                .bind(&card.set_name)
                .bind(&card.set_id)
                .bind(&card.collector_number)
                .bind(&card.rarity)
                .bind(
                    card.image_uris
                        .as_ref()
                        .map(|u| serde_json::to_string(u).unwrap()),
                )
                .bind(
                    card.card_faces
                        .as_ref()
                        .map(|f| serde_json::to_string(f).unwrap()),
                )
                .bind(colors.map(|c| serde_json::to_string(&c).unwrap()))
                .bind(
                    card.color_identity
                        .as_ref()
                        .map(|c| serde_json::to_string(c).unwrap()),
                )
                .bind(
                    card.color_indicator
                        .as_ref()
                        .map(|c| serde_json::to_string(c).unwrap()),
                )
                .bind(serde_json::to_string(&card.legalities).unwrap())
                .bind(card.reserved)
                .bind(card.foil)
                .bind(card.nonfoil)
                .bind(card.oversized)
                .bind(card.promo)
                .bind(card.reprint)
                .bind(card.variation)
                .bind(&card.frame)
                .bind(
                    card.frame_effects
                        .as_ref()
                        .map(|f| serde_json::to_string(f).unwrap()),
                )
                .bind(&card.border_color)
                .bind(serde_json::to_string(&card.prices).unwrap())
                .bind(card.arena_id)
                .bind(&card.scryfall_uri)
                .bind(&card.uri)
                .bind(
                    card.keywords
                        .as_ref()
                        .map(|k| serde_json::to_string(k).unwrap()),
                )
                .bind(
                    card.produced_mana
                        .as_ref()
                        .map(|p| serde_json::to_string(p).unwrap()),
                )
                .bind(&card.watermark)
                .bind(&artist)
                .bind(&card.artist_id)
                .bind(&card.illustration_id)
                .bind(&card.hand_modifier)
                .bind(&card.life_modifier)
                .bind(card.released_at)
                .execute(&mut *transaction)
                .await?;
        }

        transaction.commit().await?;
        Ok(())
    }

    async fn upsert_set(&self, set: &ScryfallSet) -> Result<()> {
        let query = r#"
            INSERT INTO "Set" (
                id, code, mtgoCode, tcgplayerId, name, uri, scryfallUri, searchUri,
                releasedAt, setType, cardCount, digital, foilOnly, nonfoilOnly, iconSvgUri,
                createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                code = excluded.code,
                mtgoCode = excluded.mtgoCode,
                tcgplayerId = excluded.tcgplayerId,
                name = excluded.name,
                uri = excluded.uri,
                scryfallUri = excluded.scryfallUri,
                searchUri = excluded.searchUri,
                releasedAt = excluded.releasedAt,
                setType = excluded.setType,
                cardCount = excluded.cardCount,
                digital = excluded.digital,
                foilOnly = excluded.foilOnly,
                nonfoilOnly = excluded.nonfoilOnly,
                iconSvgUri = excluded.iconSvgUri,
                updatedAt = CURRENT_TIMESTAMP
        "#;

        sqlx::query(query)
            .bind(&set.id)
            .bind(&set.code)
            .bind(&set.mtgo_code)
            .bind(set.tcgplayer_id)
            .bind(&set.name)
            .bind(&set.uri)
            .bind(&set.scryfall_uri)
            .bind(&set.search_uri)
            .bind(set.released_at)
            .bind(&set.set_type)
            .bind(set.card_count)
            .bind(set.digital)
            .bind(set.foil_only)
            .bind(set.nonfoil_only)
            .bind(&set.icon_svg_uri)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    async fn upsert_rulings_batch(&self, rulings: &[ScryfallRuling]) -> Result<()> {
        let mut transaction = self.pool.begin().await?;

        for ruling in rulings {
            let unique_id = format!(
                "{}-{}-{}",
                ruling.oracle_id,
                ruling.published_at,
                &ruling.comment.chars().take(50).collect::<String>()
            );

            let query = r#"
                INSERT INTO Ruling (id, oracleId, source, publishedAt, comment, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT(id) DO UPDATE SET
                    oracleId = excluded.oracleId,
                    source = excluded.source,
                    publishedAt = excluded.publishedAt,
                    comment = excluded.comment,
                    updatedAt = CURRENT_TIMESTAMP
            "#;

            sqlx::query(query)
                .bind(&unique_id)
                .bind(&ruling.oracle_id)
                .bind(&ruling.source)
                .bind(ruling.published_at)
                .bind(&ruling.comment)
                .execute(&mut *transaction)
                .await?;
        }

        transaction.commit().await?;
        Ok(())
    }
}

#[async_trait]
impl DatabaseOperations for PostgresDatabase {
    async fn get_sync_status(&self) -> Result<Option<SyncStatus>> {
        let query = r#"SELECT id, "lastCardsSync", "lastRulingsSync", "lastSetsSync" FROM "sync_status" WHERE id = 1"#;

        let row = sqlx::query(query).fetch_optional(&self.pool).await?;

        if let Some(row) = row {
            Ok(Some(SyncStatus {
                id: row.get::<i32, _>("id"),
                last_cards_sync: row.get::<Option<DateTime<Utc>>, _>("lastCardsSync"),
                last_rulings_sync: row.get::<Option<DateTime<Utc>>, _>("lastRulingsSync"),
                last_sets_sync: row.get::<Option<DateTime<Utc>>, _>("lastSetsSync"),
            }))
        } else {
            Ok(None)
        }
    }

    async fn update_sync_status(
        &self,
        sync_type: SyncType,
        timestamp: DateTime<Utc>,
    ) -> Result<()> {
        let (field, value) = match sync_type {
            SyncType::Cards => ("lastCardsSync", timestamp),
            SyncType::Rulings => ("lastRulingsSync", timestamp),
            SyncType::Sets => ("lastSetsSync", timestamp),
        };

        let query = format!(
            r#"INSERT INTO "sync_status" (id, "{}", "updatedAt") VALUES (1, $1, NOW()) 
             ON CONFLICT(id) DO UPDATE SET "{}" = $2, "updatedAt" = NOW()"#,
            field, field
        );

        sqlx::query(&query)
            .bind(value)
            .bind(value)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    async fn upsert_cards_batch(&self, cards: &[ScryfallCard]) -> Result<()> {
        let mut transaction = self.pool.begin().await?;

        for card in cards {
            // Process card faces for multi-faced cards
            let (
                type_line,
                mana_cost,
                oracle_text,
                power,
                toughness,
                loyalty,
                colors,
                artist,
                flavor_text,
            ) = process_card_data(card);

            // Handle optional cmc field - some cards might have missing cmc at top level
            let cmc_value = card.cmc.unwrap_or(0.0);

            let query = r#"
                INSERT INTO "Card" (
                    id, "oracleId", "mtgoId", "tcgplayerId", "cardmarketId", name, "printedName", lang,
                    layout, "manaCost", cmc, "typeLine", "oracleText", "printedText", "flavorText",
                    power, toughness, loyalty, "setCode", "setName", "setId", "collectorNumber",
                    rarity, "imageUris", "cardFaces", colors, "colorIdentity", "colorIndicator",
                    legalities, reserved, foil, nonfoil, oversized, promo, reprint,
                    variation, frame, "frameEffects", "borderColor", prices, "arenaId",
                    "scryfallUri", uri, keywords, "producedMana", watermark, artist,
                    "artistId", "illustrationId", "handModifier", "lifeModifier", "releasedAt",
                    "createdAt", "updatedAt"
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, NOW(), NOW()
                )
                ON CONFLICT(id) DO UPDATE SET
                    "oracleId" = EXCLUDED."oracleId",
                    "mtgoId" = EXCLUDED."mtgoId",
                    "tcgplayerId" = EXCLUDED."tcgplayerId",
                    "cardmarketId" = EXCLUDED."cardmarketId",
                    name = EXCLUDED.name,
                    "printedName" = EXCLUDED."printedName",
                    lang = EXCLUDED.lang,
                    layout = EXCLUDED.layout,
                    "manaCost" = EXCLUDED."manaCost",
                    cmc = EXCLUDED.cmc,
                    "typeLine" = EXCLUDED."typeLine",
                    "oracleText" = EXCLUDED."oracleText",
                    "printedText" = EXCLUDED."printedText",
                    "flavorText" = EXCLUDED."flavorText",
                    power = EXCLUDED.power,
                    toughness = EXCLUDED.toughness,
                    loyalty = EXCLUDED.loyalty,
                    "setCode" = EXCLUDED."setCode",
                    "setName" = EXCLUDED."setName",
                    "setId" = EXCLUDED."setId",
                    "collectorNumber" = EXCLUDED."collectorNumber",
                    rarity = EXCLUDED.rarity,
                    "imageUris" = EXCLUDED."imageUris",
                    "cardFaces" = EXCLUDED."cardFaces",
                    colors = EXCLUDED.colors,
                    "colorIdentity" = EXCLUDED."colorIdentity",
                    "colorIndicator" = EXCLUDED."colorIndicator",
                    legalities = EXCLUDED.legalities,
                    reserved = EXCLUDED.reserved,
                    foil = EXCLUDED.foil,
                    nonfoil = EXCLUDED.nonfoil,
                    oversized = EXCLUDED.oversized,
                    promo = EXCLUDED.promo,
                    reprint = EXCLUDED.reprint,
                    variation = EXCLUDED.variation,
                    frame = EXCLUDED.frame,
                    "frameEffects" = EXCLUDED."frameEffects",
                    "borderColor" = EXCLUDED."borderColor",
                    prices = EXCLUDED.prices,
                    "arenaId" = EXCLUDED."arenaId",
                    "scryfallUri" = EXCLUDED."scryfallUri",
                    uri = EXCLUDED.uri,
                    keywords = EXCLUDED.keywords,
                    "producedMana" = EXCLUDED."producedMana",
                    watermark = EXCLUDED.watermark,
                    artist = EXCLUDED.artist,
                    "artistId" = EXCLUDED."artistId",
                    "illustrationId" = EXCLUDED."illustrationId",
                    "handModifier" = EXCLUDED."handModifier",
                    "lifeModifier" = EXCLUDED."lifeModifier",
                    "releasedAt" = EXCLUDED."releasedAt",
                    "updatedAt" = NOW()
            "#;

            sqlx::query(query)
                .bind(&card.id)
                .bind(&card.oracle_id)
                .bind(card.mtgo_id)
                .bind(card.tcgplayer_id)
                .bind(card.cardmarket_id)
                .bind(&card.name)
                .bind(&card.printed_name)
                .bind(&card.lang)
                .bind(&card.layout)
                .bind(&mana_cost)
                .bind(cmc_value)
                .bind(&type_line)
                .bind(&oracle_text)
                .bind(&card.printed_text)
                .bind(&flavor_text)
                .bind(&power)
                .bind(&toughness)
                .bind(&loyalty)
                .bind(&card.set)
                .bind(&card.set_name)
                .bind(&card.set_id)
                .bind(&card.collector_number)
                .bind(&card.rarity)
                .bind(
                    card.image_uris
                        .as_ref()
                        .map(|u| serde_json::to_value(u).unwrap()),
                )
                .bind(
                    card.card_faces
                        .as_ref()
                        .map(|f| serde_json::to_value(f).unwrap()),
                )
                .bind(colors.map(|c| serde_json::to_value(&c).unwrap()))
                .bind(
                    card.color_identity
                        .as_ref()
                        .map(|c| serde_json::to_value(c).unwrap()),
                )
                .bind(
                    card.color_indicator
                        .as_ref()
                        .map(|c| serde_json::to_value(c).unwrap()),
                )
                .bind(serde_json::to_value(&card.legalities).unwrap())
                .bind(card.reserved)
                .bind(card.foil)
                .bind(card.nonfoil)
                .bind(card.oversized)
                .bind(card.promo)
                .bind(card.reprint)
                .bind(card.variation)
                .bind(&card.frame)
                .bind(
                    card.frame_effects
                        .as_ref()
                        .map(|f| serde_json::to_value(f).unwrap()),
                )
                .bind(&card.border_color)
                .bind(serde_json::to_value(&card.prices).unwrap())
                .bind(card.arena_id)
                .bind(&card.scryfall_uri)
                .bind(&card.uri)
                .bind(
                    card.keywords
                        .as_ref()
                        .map(|k| serde_json::to_value(k).unwrap()),
                )
                .bind(
                    card.produced_mana
                        .as_ref()
                        .map(|p| serde_json::to_value(p).unwrap()),
                )
                .bind(&card.watermark)
                .bind(&artist)
                .bind(&card.artist_id)
                .bind(&card.illustration_id)
                .bind(&card.hand_modifier)
                .bind(&card.life_modifier)
                .bind(card.released_at)
                .execute(&mut *transaction)
                .await?;
        }

        transaction.commit().await?;
        Ok(())
    }

    async fn upsert_set(&self, set: &ScryfallSet) -> Result<()> {
        let query = r#"
            INSERT INTO "Set" (
                id, code, "mtgoCode", "tcgplayerId", name, uri, "scryfallUri", "searchUri",
                "releasedAt", "setType", "cardCount", digital, "foilOnly", "nonfoilOnly", "iconSvgUri",
                "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
            ON CONFLICT(id) DO UPDATE SET
                code = EXCLUDED.code,
                "mtgoCode" = EXCLUDED."mtgoCode",
                "tcgplayerId" = EXCLUDED."tcgplayerId",
                name = EXCLUDED.name,
                uri = EXCLUDED.uri,
                "scryfallUri" = EXCLUDED."scryfallUri",
                "searchUri" = EXCLUDED."searchUri",
                "releasedAt" = EXCLUDED."releasedAt",
                "setType" = EXCLUDED."setType",
                "cardCount" = EXCLUDED."cardCount",
                digital = EXCLUDED.digital,
                "foilOnly" = EXCLUDED."foilOnly",
                "nonfoilOnly" = EXCLUDED."nonfoilOnly",
                "iconSvgUri" = EXCLUDED."iconSvgUri",
                "updatedAt" = NOW()
        "#;

        sqlx::query(query)
            .bind(&set.id)
            .bind(&set.code)
            .bind(&set.mtgo_code)
            .bind(set.tcgplayer_id)
            .bind(&set.name)
            .bind(&set.uri)
            .bind(&set.scryfall_uri)
            .bind(&set.search_uri)
            .bind(set.released_at)
            .bind(&set.set_type)
            .bind(set.card_count)
            .bind(set.digital)
            .bind(set.foil_only)
            .bind(set.nonfoil_only)
            .bind(&set.icon_svg_uri)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    async fn upsert_rulings_batch(&self, rulings: &[ScryfallRuling]) -> Result<()> {
        let mut transaction = self.pool.begin().await?;

        for ruling in rulings {
            let unique_id = format!(
                "{}-{}-{}",
                ruling.oracle_id,
                ruling.published_at,
                &ruling.comment.chars().take(50).collect::<String>()
            );

            let query = r#"
                INSERT INTO "Ruling" (id, "oracleId", source, "publishedAt", comment, "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                ON CONFLICT(id) DO UPDATE SET
                    "oracleId" = EXCLUDED."oracleId",
                    source = EXCLUDED.source,
                    "publishedAt" = EXCLUDED."publishedAt",
                    comment = EXCLUDED.comment,
                    "updatedAt" = NOW()
            "#;

            sqlx::query(query)
                .bind(&unique_id)
                .bind(&ruling.oracle_id)
                .bind(&ruling.source)
                .bind(ruling.published_at)
                .bind(&ruling.comment)
                .execute(&mut *transaction)
                .await?;
        }

        transaction.commit().await?;
        Ok(())
    }
}

fn process_card_data(
    card: &ScryfallCard,
) -> (
    String,
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
    Option<Vec<String>>,
    Option<String>,
    Option<String>,
) {
    // Start with main card data
    let mut type_line = card.type_line.clone();
    let mut mana_cost = card.mana_cost.clone();
    let mut oracle_text = card.oracle_text.clone();
    let mut power = card.power.clone();
    let mut toughness = card.toughness.clone();
    let mut loyalty = card.loyalty.clone();
    let mut colors = card.colors.clone();
    let mut artist = card.artist.clone();
    let mut flavor_text = card.flavor_text.clone();

    // For multi-faced cards, prefer data from the first face if main card data is missing
    if let Some(ref card_faces) = card.card_faces {
        if let Some(first_face) = card_faces.first() {
            // Use card face data if main card data is missing (matching TypeScript logic)
            if type_line.as_ref().map_or(true, |tl| tl.is_empty())
                && first_face
                    .type_line
                    .as_ref()
                    .map_or(false, |tl| !tl.is_empty())
            {
                type_line = first_face.type_line.clone();
            }
            if mana_cost.is_none() && first_face.mana_cost.is_some() {
                mana_cost = first_face.mana_cost.clone();
            }
            if oracle_text.is_none() && first_face.oracle_text.is_some() {
                oracle_text = first_face.oracle_text.clone();
            }
            if power.is_none() && first_face.power.is_some() {
                power = first_face.power.clone();
            }
            if toughness.is_none() && first_face.toughness.is_some() {
                toughness = first_face.toughness.clone();
            }
            if loyalty.is_none() && first_face.loyalty.is_some() {
                loyalty = first_face.loyalty.clone();
            }
            if colors.is_none() && first_face.colors.is_some() {
                colors = first_face.colors.clone();
            }
            if artist.is_none() && first_face.artist.is_some() {
                artist = first_face.artist.clone();
            }
            if flavor_text.is_none() && first_face.flavor_text.is_some() {
                flavor_text = first_face.flavor_text.clone();
            }
        }
    }

    // Ensure we have a type_line (required field) - fallback to empty string if still None
    let final_type_line = type_line.unwrap_or_else(|| String::new());

    (
        final_type_line,
        mana_cost,
        oracle_text,
        power,
        toughness,
        loyalty,
        colors,
        artist,
        flavor_text,
    )
}
