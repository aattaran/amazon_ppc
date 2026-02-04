const fs = require('fs');
const zlib = require('zlib');
const util = require('util');

// Read the file
const content = fs.readFileSync('fetch-metrics.js', 'utf8');

// Replace the downloadReport method
const oldMethod = /async downloadReport\(reportUrl\) \{[\s\S]*?return metrics;\s*\}\s*\}/;

const newMethod = `async downloadReport(reportUrl) {
        const zlib = require('zlib');
        const util = require('util');
        const gunzip = util.promisify(zlib.gunzip);

        const response = await fetch(reportUrl);  // No auth needed for S3 URL

        if (!response.ok) {
            throw new Error(\`Download failed: \${response.status}\`);
        }

        // v3 reports are gzipped JSON
        const buffer = Buffer.from(await response.arrayBuffer());
        const decompressed = await gunzip(buffer);
        const jsonText = decompressed.toString('utf-8');

        // Parse JSON array (v3 format)
        let metrics;
        try {
            metrics = JSON.parse(jsonText);
        } catch (e) {
            console.error('Failed to parse JSON:', e.message);
            console.error('First 500 chars:', jsonText.substring(0, 500));
            throw e;
        }

        return metrics;
    }
}`;

const updated = content.replace(oldMethod, newMethod);

fs.writeFileSync('fetch-metrics.js', updated, 'utf8');
console.log('✅ Updated download method!');
