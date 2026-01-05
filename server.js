// server.js - Node.js Backend with Express and SQLite

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// SQLite Database Setup
const DB_PATH = path.join(__dirname, 'dashboard.db');
let db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database schema
function initializeDatabase() {
    db.serialize(() => {
        // Metrics table
        db.run(`CREATE TABLE IF NOT EXISTS metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            cpu REAL,
            memory REAL,
            requests INTEGER,
            errors INTEGER
        )`);

        // Logs table
        db.run(`CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            level TEXT,
            message TEXT,
            source TEXT,
            responseTime INTEGER
        )`);

        // Code issues table
        db.run(`CREATE TABLE IF NOT EXISTS code_issues (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            file TEXT,
            line INTEGER,
            severity TEXT,
            description TEXT,
            resolved BOOLEAN DEFAULT 0
        )`);

        // System status table
        db.run(`CREATE TABLE IF NOT EXISTS system_status (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service TEXT UNIQUE,
            status TEXT,
            uptime REAL,
            lastChecked DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Insert initial data
        insertInitialData();
    });
}

// Insert initial sample data
function insertInitialData() {
    const levels = ['info', 'warning', 'error', 'debug'];
    const messages = [
        'Database connection established',
        'API request processed: /api/users',
        'Cache invalidation triggered',
        'WebSocket connection opened',
        'Authentication token validated',
        'Memory threshold warning: 75%',
        'Failed to resolve dependency',
        'Network timeout on external service',
        'Deployment pipeline initiated',
        'Background job completed successfully'
    ];
    const sources = ['api/handlers.js', 'utils/cache.js', 'services/auth.js', 'middleware/logger.js', 'worker/queue.js'];

    // Check if logs already exist
    db.get('SELECT COUNT(*) as count FROM logs', (err, row) => {
        if (row.count === 0) {
            // Insert sample logs
            for (let i = 0; i < 20; i++) {
                const level = levels[Math.floor(Math.random() * levels.length)];
                const message = messages[Math.floor(Math.random() * messages.length)];
                const source = sources[Math.floor(Math.random() * sources.length)];
                const responseTime = Math.floor(Math.random() * 500) + 50;

                db.run(
                    'INSERT INTO logs (level, message, source, responseTime) VALUES (?, ?, ?, ?)',
                    [level, message, source, responseTime]
                );
            }
        }
    });

    // Check if code issues exist
    db.get('SELECT COUNT(*) as count FROM code_issues', (err, row) => {
        if (row.count === 0) {
            const issues = [
                ['N+1 query detected', 'api/handlers.js', 124, 'error', 'Optimize database queries'],
                ['Memory leak in event listener', 'utils/cache.js', 87, 'warning', 'Clean up event listeners properly'],
                ['Unhandled promise rejection', 'services/auth.js', 203, 'warning', 'Add .catch() handler'],
                ['Performance: 450ms response time', 'middleware/logger.js', 56, 'info', 'Consider optimization']
            ];

            issues.forEach(issue => {
                db.run(
                    'INSERT INTO code_issues (title, file, line, severity, description) VALUES (?, ?, ?, ?, ?)',
                    issue
                );
            });
        }
    });

    // Check if system status exists
    db.get('SELECT COUNT(*) as count FROM system_status', (err, row) => {
        if (row.count === 0) {
            const services = [
                ['API Server', 'online', 99.9],
                ['Database', 'online', 99.8],
                ['Cache Layer', 'online', 100.0],
                ['Message Queue', 'online', 99.5]
            ];

            services.forEach(service => {
                db.run(
                    'INSERT INTO system_status (service, status, uptime) VALUES (?, ?, ?)',
                    service
                );
            });
        }
    });

    // Check if metrics exist
    db.get('SELECT COUNT(*) as count FROM metrics', (err, row) => {
        if (row.count === 0) {
            for (let i = 0; i < 10; i++) {
                db.run(
                    'INSERT INTO metrics (cpu, memory, requests, errors) VALUES (?, ?, ?, ?)',
                    [Math.random() * 70 + 20, Math.random() * 50 + 40, Math.floor(Math.random() * 2000), Math.floor(Math.random() * 15)]
                );
            }
        }
    });
}

// API Routes

// Get metrics
app.get('/api/metrics', (req, res) => {
    db.get(
        'SELECT cpu, memory, requests, errors FROM metrics ORDER BY timestamp DESC LIMIT 1',
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (!row) {
                return res.json({ cpu: 45, memory: 62, requests: 1240, errors: 8 });
            }
            
            // Simulate slight changes
            const metrics = {
                cpu: Math.max(20, Math.min(90, row.cpu + (Math.random() - 0.5) * 10)),
                memory: Math.max(30, Math.min(95, row.memory + (Math.random() - 0.5) * 8)),
                requests: row.requests + Math.floor(Math.random() * 50) + 10,
                errors: Math.max(0, row.errors + Math.floor(Math.random() * 3) - 1)
            };

            // Store updated metrics
            db.run(
                'INSERT INTO metrics (cpu, memory, requests, errors) VALUES (?, ?, ?, ?)',
                [metrics.cpu, metrics.memory, metrics.requests, metrics.errors]
            );

            res.json(metrics);
        }
    );
});

// Get logs
app.get('/api/logs', (req, res) => {
    const limit = req.query.limit || 30;
    db.all(
        'SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?',
        [limit],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows || []);
        }
    );
});

// Create new log
app.post('/api/logs', (req, res) => {
    const { level, message, source, responseTime } = req.body;
    db.run(
        'INSERT INTO logs (level, message, source, responseTime) VALUES (?, ?, ?, ?)',
        [level, message, source, responseTime],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, level, message, source, responseTime });
        }
    );
});

// Get code issues
app.get('/api/code-issues', (req, res) => {
    db.all(
        'SELECT * FROM code_issues WHERE resolved = 0',
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows || []);
        }
    );
});

// Get system status
app.get('/api/system-status', (req, res) => {
    db.all(
        'SELECT service, status, uptime FROM system_status',
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            // Simulate uptime changes
            const updated = rows.map(row => ({
                ...row,
                uptime: (row.uptime + (Math.random() - 0.5) * 0.1).toFixed(1)
            }));
            res.json(updated || []);
        }
    );
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get dashboard summary
app.get('/api/summary', (req, res) => {
    const summary = {
        totalRequests: 0,
        totalErrors: 0,
        avgCPU: 0,
        avgMemory: 0
    };

    db.get('SELECT COUNT(*) as count FROM logs WHERE level = "error"', (err, row) => {
        if (!err) summary.totalErrors = row.count;
    });

    db.get('SELECT AVG(cpu) as avg FROM metrics', (err, row) => {
        if (!err) summary.avgCPU = row.avg ? row.avg.toFixed(2) : 0;
    });

    db.get('SELECT AVG(memory) as avg FROM metrics', (err, row) => {
        if (!err) summary.avgMemory = row.avg ? row.avg.toFixed(2) : 0;
    });

    db.get('SELECT SUM(requests) as total FROM metrics', (err, row) => {
        if (!err) summary.totalRequests = row.total || 0;
        res.json(summary);
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Dashboard Server Running!`);
    console.log(`📊 API Server: http://localhost:${PORT}`);
    console.log(`🗄️  Database: ${DB_PATH}`);
    console.log(`\n✅ Open the HTML dashboard in your browser to see live data\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) console.error(err.message);
        console.log('Database connection closed');
        process.exit(0);
    });
});
