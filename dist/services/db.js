"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = query;
exports.insertPortfolioPhoto = insertPortfolioPhoto;
exports.insertEventPhoto = insertEventPhoto;
exports.insertHeroSlide = insertHeroSlide;
exports.closeDb = closeDb;
const pg_1 = require("pg");
const index_js_1 = require("../config/index.js");
const pool = new pg_1.Pool({
    connectionString: index_js_1.config.databaseUrl,
    ssl: {
        rejectUnauthorized: false,
    },
});
async function query(text, params = []) {
    const result = await pool.query(text, params);
    return result.rows;
}
async function insertPortfolioPhoto(input) {
    await query(`INSERT INTO portfolio_photos (
      id, filename, original_url, thumbnail_url,
      thumbnail_small_url, thumbnail_medium_url, thumbnail_large_url,
      created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,now(),now()
    )`, [
        input.id,
        input.filename,
        input.originalUrl,
        input.thumbnailUrl,
        input.thumbnailSmallUrl,
        input.thumbnailMediumUrl,
        input.thumbnailLargeUrl,
    ]);
}
async function insertEventPhoto(input) {
    await query(`INSERT INTO photos (
      id, event_id, filename, original_url,
      thumbnail_url, thumbnail_small_url, thumbnail_medium_url, thumbnail_large_url,
      width, height, file_size, mime_type, created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now(),now()
    )`, [
        input.id,
        input.eventId,
        input.filename,
        input.originalUrl,
        input.thumbnailUrl,
        input.thumbnailSmallUrl,
        input.thumbnailMediumUrl,
        input.thumbnailLargeUrl,
        input.width,
        input.height,
        input.size,
        input.mimeType,
    ]);
}
async function insertHeroSlide(input) {
    await query(`INSERT INTO hero_slideshow (
      id, image_url, thumbnail_url, created_at, updated_at
    ) VALUES ($1,$2,$3,now(),now())`, [input.id, input.imageUrl, input.thumbnailUrl]);
}
async function closeDb() {
    await pool.end();
}
//# sourceMappingURL=db.js.map