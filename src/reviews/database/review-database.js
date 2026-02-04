const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * Review Request Tracking Database
 * Tracks all review requests to prevent duplicates and enable smart follow-ups
 */
class ReviewDatabase {
    constructor() {
        const dbPath = path.join(process.cwd(), 'src', 'reviews', 'database', 'review-requests.db');
        this.db = new sqlite3.Database(dbPath);
        this.initDatabase();
    }

    /**
     * Initialize database schema
     */
    initDatabase() {
        this.db.serialize(() => {
            // Main tracking table
            this.db.run(`
        CREATE TABLE IF NOT EXISTS review_requests (
          order_id TEXT PRIMARY KEY,
          order_date TEXT NOT NULL,
          delivery_date TEXT,
          product_asin TEXT,
          request_sent_at TEXT,
          request_day_number INTEGER,
          success BOOLEAN DEFAULT FALSE,
          review_exists BOOLEAN DEFAULT FALSE,
          review_checked_at TEXT,
          review_rating INTEGER,
          notes TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

            // Index for quick lookups
            this.db.run(`
        CREATE INDEX IF NOT EXISTS idx_order_date 
        ON review_requests(order_date)
      `);

            this.db.run(`
        CREATE INDEX IF NOT EXISTS idx_request_sent 
        ON review_requests(request_sent_at)
      `);
        });
    }

    /**
     * Record a new order
     */
    async recordOrder(orderData) {
        return new Promise((resolve, reject) => {
            const sql = `
        INSERT OR REPLACE INTO review_requests 
        (order_id, order_date, delivery_date, product_asin)
        VALUES (?, ?, ?, ?)
      `;

            this.db.run(sql, [
                orderData.orderId,
                orderData.orderDate,
                orderData.deliveryDate || null,
                orderData.productAsin || null
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * Record a review request
     */
    async recordRequest(orderId, dayNumber, success = true) {
        return new Promise((resolve, reject) => {
            const sql = `
        UPDATE review_requests
        SET request_sent_at = CURRENT_TIMESTAMP,
            request_day_number = ?,
            success = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE order_id = ?
      `;

            this.db.run(sql, [dayNumber, success, orderId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * Check if request already sent for order
     */
    async hasRequestBeenSent(orderId) {
        return new Promise((resolve, reject) => {
            const sql = `
        SELECT request_sent_at 
        FROM review_requests 
        WHERE order_id = ? AND request_sent_at IS NOT NULL
      `;

            this.db.get(sql, [orderId], (err, row) => {
                if (err) reject(err);
                else resolve(!!row);
            });
        });
    }

    /**
     * Mark that review exists for order
     */
    async markReviewExists(orderId, rating = null) {
        return new Promise((resolve, reject) => {
            const sql = `
        UPDATE review_requests
        SET review_exists = TRUE,
            review_checked_at = CURRENT_TIMESTAMP,
            review_rating = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE order_id = ?
      `;

            this.db.run(sql, [rating, orderId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * Get orders eligible for day X requests (no request sent yet)
     */
    async getEligibleOrdersForDay(dayNumber) {
        return new Promise((resolve, reject) => {
            const sql = `
        SELECT *
        FROM review_requests
        WHERE request_sent_at IS NULL
          AND date(order_date, '+${dayNumber} days') = date('now')
      `;

            this.db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    /**
     * Get all pending review requests (sent but no review yet)
     */
    async getPendingReviews() {
        return new Promise((resolve, reject) => {
            const sql = `
        SELECT *
        FROM review_requests
        WHERE request_sent_at IS NOT NULL 
          AND review_exists = FALSE
        ORDER BY request_sent_at DESC
      `;

            this.db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    /**
     * Get statistics
     */
    async getStats() {
        return new Promise((resolve, reject) => {
            const sql = `
        SELECT 
          COUNT(*) as total_orders,
          SUM(CASE WHEN request_sent_at IS NOT NULL THEN 1 ELSE 0 END) as requests_sent,
          SUM(CASE WHEN review_exists = TRUE THEN 1 ELSE 0 END) as reviews_received,
          ROUND(
            CAST(SUM(CASE WHEN review_exists = TRUE THEN 1 ELSE 0 END) AS FLOAT) / 
            NULLIF(SUM(CASE WHEN request_sent_at IS NOT NULL THEN 1 ELSE 0 END), 0) * 100,
            2
          ) as response_rate
        FROM review_requests
      `;

            this.db.get(sql, [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    /**
     * Close database connection
     */
    close() {
        this.db.close();
    }
}

module.exports = ReviewDatabase;
