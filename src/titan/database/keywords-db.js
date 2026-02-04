/**
 * Titan Keyword Database
 * SQLite database for storing and managing discovered keywords
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class KeywordDatabase {
    constructor(dbPath = './data/titan-keywords.db') {
        // Ensure data directory exists
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        this.db = new Database(dbPath);
        this.initializeDatabase();
    }

    /**
     * Initialize database schema
     */
    initializeDatabase() {
        // Main keywords table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS keywords (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        keyword TEXT UNIQUE NOT NULL,
        
        -- Metrics
        search_volume INTEGER,
        competition REAL,
        competition_index REAL,
        estimated_cpc REAL,
        high_cpc REAL,
        
        -- Rankings
        your_rank INTEGER,
        competitor_ranks TEXT, -- JSON array
        
        -- Scoring
        opportunity_score INTEGER,
        score_breakdown TEXT, -- JSON object
        tier TEXT,
        
        -- Bidding
        suggested_bid REAL,
        your_bid REAL,
        tos_multiplier INTEGER DEFAULT 200,
        pp_multiplier INTEGER DEFAULT 100,
        
        -- Campaign
        match_type TEXT,
        campaign_name TEXT,
        status TEXT DEFAULT 'Ready',
        
        -- Metadata
        notes TEXT,
        source TEXT,
        added_date TEXT,
        last_updated TEXT,
        last_synced TEXT,
        
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Indexes for common queries
      CREATE INDEX IF NOT EXISTS idx_score ON keywords(opportunity_score DESC);
      CREATE INDEX IF NOT EXISTS idx_tier ON keywords(tier);
      CREATE INDEX IF NOT EXISTS idx_status ON keywords(status);
      CREATE INDEX IF NOT EXISTS idx_campaign ON keywords(campaign_name);
      CREATE INDEX IF NOT EXISTS idx_keyword ON keywords(keyword);
      
      -- Sync history table
      CREATE TABLE IF NOT EXISTS sync_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sync_type TEXT, -- 'push' or 'pull'
        keywords_count INTEGER,
        success BOOLEAN,
        error_message TEXT,
        synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Settings table
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

        console.log('✅ Database initialized');
    }

    /**
     * Add a keyword to the database
     */
    addKeyword(keyword) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO keywords (
        keyword, search_volume, competition, competition_index,
        estimated_cpc, high_cpc, your_rank, competitor_ranks,
        opportunity_score, score_breakdown, tier,
        suggested_bid, your_bid, tos_multiplier, pp_multiplier,
        match_type, campaign_name, status, notes, source,
        added_date, last_updated, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, CURRENT_TIMESTAMP
      )
    `);

        const result = stmt.run(
            keyword.keyword,
            keyword.searchVolume || null,
            keyword.competition || null,
            keyword.competitionIndex || null,
            keyword.estimatedCPC || null,
            keyword.highCPC || null,
            keyword.yourRank || null,
            JSON.stringify(keyword.competitorRanks || []),
            keyword.opportunityScore || null,
            JSON.stringify(keyword.scoreBreakdown || {}),
            keyword.tier || null,
            keyword.suggestedBid || null,
            keyword.yourBid || null,
            keyword.tosMultiplier || 200,
            keyword.ppMultiplier || 100,
            keyword.matchType || 'PHRASE',
            keyword.campaignName || '',
            keyword.status || 'Ready',
            keyword.notes || '',
            keyword.source || 'manual',
            keyword.addedDate || new Date().toISOString().split('T')[0],
            new Date().toISOString()
        );

        return result.changes > 0;
    }

    /**
     * Get all keywords
     */
    getAllKeywords() {
        const stmt = this.db.prepare('SELECT * FROM keywords ORDER BY opportunity_score DESC');
        const rows = stmt.all();
        return rows.map(row => this.parseKeyword(row));
    }

    /**
     * Get keywords by tier
     */
    getKeywordsByTier(tier) {
        const stmt = this.db.prepare('SELECT * FROM keywords WHERE tier = ? ORDER BY opportunity_score DESC');
        const rows = stmt.all(tier);
        return rows.map(row => this.parseKeyword(row));
    }

    /**
     * Get keywords by status
     */
    getKeywordsByStatus(status) {
        const stmt = this.db.prepare('SELECT * FROM keywords WHERE status = ? ORDER BY opportunity_score DESC');
        const rows = stmt.all(status);
        return rows.map(row => this.parseKeyword(row));
    }

    /**
     * Get top opportunities
     */
    getTopOpportunities(limit = 100) {
        const stmt = this.db.prepare('SELECT * FROM keywords ORDER BY opportunity_score DESC LIMIT ?');
        const rows = stmt.all(limit);
        return rows.map(row => this.parseKeyword(row));
    }

    /**
     * Update a keyword
     */
    updateKeyword(keywordText, updates) {
        const fields = [];
        const values = [];

        for (const [key, value] of Object.entries(updates)) {
            const dbKey = this.camelToSnake(key);

            if (key === 'competitorRanks' || key === 'scoreBreakdown') {
                fields.push(`${dbKey} = ?`);
                values.push(JSON.stringify(value));
            } else {
                fields.push(`${dbKey} = ?`);
                values.push(value);
            }
        }

        if (fields.length === 0) return false;

        fields.push('updated_at = CURRENT_TIMESTAMP');

        const sql = `UPDATE keywords SET ${fields.join(', ')} WHERE keyword = ?`;
        values.push(keywordText);

        const stmt = this.db.prepare(sql);
        const result = stmt.run(...values);

        return result.changes > 0;
    }

    /**
     * Search keywords
     */
    searchKeywords(query) {
        const stmt = this.db.prepare('SELECT * FROM keywords WHERE keyword LIKE ? ORDER BY opportunity_score DESC');
        const rows = stmt.all(`%${query}%`);
        return rows.map(row => this.parseKeyword(row));
    }

    /**
     * Get database statistics
     */
    getStats() {
        const stats = {
            totalKeywords: this.db.prepare('SELECT COUNT(*) as count FROM keywords').get().count,
            byTier: {},
            byStatus: {},
            avgScore: this.db.prepare('SELECT AVG(opportunity_score) as avg FROM keywords').get().avg || 0
        };

        // By tier
        const tierStats = this.db.prepare('SELECT tier, COUNT(*) as count FROM keywords GROUP BY tier').all();
        tierStats.forEach(row => {
            stats.byTier[row.tier || 'Unscored'] = row.count;
        });

        // By status
        const statusStats = this.db.prepare('SELECT status, COUNT(*) as count FROM keywords GROUP BY status').all();
        statusStats.forEach(row => {
            stats.byStatus[row.status] = row.count;
        });

        return stats;
    }

    /**
     * Record sync event
     */
    recordSync(syncType, keywordsCount, success = true, errorMessage = null) {
        const stmt = this.db.prepare(`
      INSERT INTO sync_history (sync_type, keywords_count, success, error_message)
      VALUES (?, ?, ?, ?)
    `);

        stmt.run(syncType, keywordsCount, success ? 1 : 0, errorMessage);
    }

    /**
     * Get sync history
     */
    getSyncHistory(limit = 10) {
        const stmt = this.db.prepare('SELECT * FROM sync_history ORDER BY synced_at DESC LIMIT ?');
        return stmt.all(limit);
    }

    /**
     * Save setting
     */
    saveSetting(key, value) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);
        stmt.run(key, typeof value === 'object' ? JSON.stringify(value) : value);
    }

    /**
     * Get setting
     */
    getSetting(key) {
        const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
        const row = stmt.get(key);
        if (!row) return null;

        try {
            return JSON.parse(row.value);
        } catch {
            return row.value;
        }
    }

    /**
     * Update settings from Google Sheets
     */
    updateSettings(settings) {
        this.saveSetting('titan_settings', settings);
        return true;
    }

    /**
     * Get performance data (placeholder for now)
     */
    async getPerformanceData() {
        // TODO: Integrate with Amazon Ads API
        return [];
    }

    /**
     * Parse database row to keyword object
     */
    parseKeyword(row) {
        return {
            id: row.id,
            keyword: row.keyword,
            searchVolume: row.search_volume,
            competition: row.competition,
            competitionIndex: row.competition_index,
            estimatedCPC: row.estimated_cpc,
            highCPC: row.high_cpc,
            yourRank: row.your_rank,
            competitorRanks: this.parseJSON(row.competitor_ranks, []),
            opportunityScore: row.opportunity_score,
            scoreBreakdown: this.parseJSON(row.score_breakdown, {}),
            tier: row.tier,
            suggestedBid: row.suggested_bid,
            yourBid: row.your_bid,
            tosMultiplier: row.tos_multiplier,
            ppMultiplier: row.pp_multiplier,
            matchType: row.match_type,
            campaignName: row.campaign_name,
            status: row.status,
            notes: row.notes,
            source: row.source,
            addedDate: row.added_date,
            lastUpdated: row.last_updated,
            lastSynced: row.last_synced,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    /**
     * Helper: Parse JSON safely
     */
    parseJSON(str, defaultValue) {
        try {
            return JSON.parse(str);
        } catch {
            return defaultValue;
        }
    }

    /**
     * Helper: Convert camelCase to snake_case
     */
    camelToSnake(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }

    /**
     * Close database connection
     */
    close() {
        this.db.close();
    }
}

module.exports = KeywordDatabase;
