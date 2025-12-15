const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const https = require('node:https');
const cheerio = require('cheerio');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'ukhpi_data.json');
const LAND_REGISTRY_HOST = 'landregistry.data.gov.uk';
const UKHPI_PATH = '/app/ukhpi/browse';
const EARLIEST_DATE = new Date(1995, 0, 1);
const MAX_MONTH_RANGE = 36;

const REGION_LOCATIONS = {
  'north-east': 'http://landregistry.data.gov.uk/id/region/north-east',
  'north-west': 'http://landregistry.data.gov.uk/id/region/north-west',
  'east-england': 'http://landregistry.data.gov.uk/id/region/east-of-england',
  'east-midlands': 'http://landregistry.data.gov.uk/id/region/east-midlands',
  london: 'http://landregistry.data.gov.uk/id/region/london',
  'south-east': 'http://landregistry.data.gov.uk/id/region/south-east',
  'south-west': 'http://landregistry.data.gov.uk/id/region/south-west',
  'west-midlands': 'http://landregistry.data.gov.uk/id/region/west-midlands',
  'yorkshire-humber': 'http://landregistry.data.gov.uk/id/region/yorkshire-and-the-humber'
};

Object.keys(REGION_LOCATIONS).forEach((key) => {
  REGION_LOCATIONS[key] = normalizeLocationValue(REGION_LOCATIONS[key]);
});

const DEFAULT_LOCATION = REGION_LOCATIONS['north-east'];
const ALLOWED_LOCATION_URLS = new Set(Object.values(REGION_LOCATIONS));
const PROPERTY_TYPE_FACTORS = {
  detached: 1.15,
  'semi-detached': 1.05,
  terraced: 0.95,
  flat: 0.85,
  all: 1
};

const FETCH_HEADERS = {
  'user-agent': 'HouseChecker/1.0 (+https://github.com/)'
};

app.disable('x-powered-by');
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', apiLimiter);
app.use(express.static(PUBLIC_DIR));

function formatDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.valueOf())) {
    throw new Error('Invalid date supplied');
  }
  return date.toISOString().split('T')[0];
}

function minusMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  return result;
}

function defaultRange() {
  const today = new Date();
  const from = new Date(today.getFullYear() - 1, 0, 1);
  const to = minusMonths(today, 2);
  return { from: formatDate(from), to: formatDate(to) };
}

function sanitizeDate(value, fallback) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  return fallback;
}

function fetchHtml(url, redirects = 0) {
  if (redirects > 5) {
    return Promise.reject(new Error('Too many redirects while requesting UKHPI data'));
  }
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname !== LAND_REGISTRY_HOST) {
      reject(new Error('Blocked request to unexpected host'));
      return;
    }
    const request = https.get(parsedUrl, { headers: FETCH_HEADERS }, (response) => {
      const { statusCode = 0, headers } = response;
      const locationHeader = headers?.location;
      if ([301, 302, 307, 308].includes(statusCode) && locationHeader) {
        response.resume();
        const redirectedUrl = new URL(locationHeader, url);
        if (redirectedUrl.hostname !== LAND_REGISTRY_HOST) {
          reject(new Error('Unexpected redirect host when requesting UKHPI data'));
          return;
        }
        fetchHtml(redirectedUrl.toString(), redirects + 1).then(resolve).catch(reject);
        return;
      }
      if (statusCode < 200 || statusCode >= 300) {
        response.resume();
        reject(new Error(`Failed to fetch UKHPI data (HTTP ${statusCode})`));
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer.toString('utf8'));
      });
    });
    request.on('error', reject);
  });
}

async function fetchUkhpi({ from, to, location }) {
  const baseUrl = new URL(`https://${LAND_REGISTRY_HOST}${UKHPI_PATH}`);
  const params = new URLSearchParams({ from, to, location, lang: 'en' });
  const url = `${baseUrl.origin}${baseUrl.pathname}?${params.toString()}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const table = $('table').first();
  if (!table.length) {
    throw new Error('No table found in UKHPI response');
  }

  const headers = [];
  table.find('tr').first().find('th,td').each((_, cell) => {
    headers.push($(cell).text().trim());
  });

  const rows = [];
  table.find('tr').slice(1).each((_, row) => {
    const rowData = [];
    $(row).find('th,td').each((__, cell) => {
      rowData.push($(cell).text().trim());
    });
    if (rowData.length) {
      rows.push(rowData);
    }
  });

  const records = rows.map((row) => {
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = row[index] ?? '';
    });
    return entry;
  });

  return { url, headers, rows, records };
}

async function persistData(records) {
  const json = JSON.stringify(records, null, 2);
  await fs.writeFile(DATA_FILE, json, 'utf8');
}

function extractNumericField(record) {
  if (!record) return { key: null, value: null };
  const preferredKey =
    Object.keys(record).find((key) => /average/i.test(key) && /price/i.test(key)) ||
    Object.keys(record).find((key) => /average/i.test(key)) ||
    Object.keys(record).find((key) => /price/i.test(key));
  const key = preferredKey || Object.keys(record)[1];
  const value = key ? toCurrencyNumber(record[key]) : null;
  return { key, value };
}

function toCurrencyNumber(value) {
  if (value == null) return null;
  const numeric = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
}

function summariseMarket(records, multiplier = 1) {
  if (!Array.isArray(records) || !records.length) {
    return null;
  }
  let fieldKey = null;
  const series = records
    .map((record, index) => {
      const { key, value } = extractNumericField(record);
      if (!fieldKey && key) fieldKey = key;
      return {
        label: record.Period || record.Month || record.Date || `Point ${index + 1}`,
        value: Number.isFinite(value) ? value * multiplier : null
      };
    })
    .filter((entry) => Number.isFinite(entry.value));

  if (!series.length) return null;

  const values = series.map((entry) => entry.value);
  const latest = series[0].value;
  const earliest = series[series.length - 1].value;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const changePercent = earliest ? ((latest - earliest) / earliest) * 100 : null;

  return {
    field: fieldKey,
    latestPrice: Math.round(latest),
    averagePrice: Math.round(average),
    minPrice: Math.round(Math.min(...values)),
    maxPrice: Math.round(Math.max(...values)),
    changePercent: changePercent != null ? Number(changePercent.toFixed(2)) : null,
    timeline: series.slice(0, 12)
  };
}

app.get('/api/ukhpi', async (req, res, next) => {
  try {
    const { from: defaultFrom, to: defaultTo } = defaultRange();
    const sanitizedFrom = sanitizeDate(req.query.from, defaultFrom);
    const sanitizedTo = sanitizeDate(req.query.to, defaultTo);
    const { from, to } = normalizeDateRange(sanitizedFrom, sanitizedTo);
    const resolvedLocation = normalizeLocation(req.query.location);

    if (!resolvedLocation.ok) {
      return res.status(400).json({ error: 'Unsupported location parameter' });
    }

    const result = await fetchUkhpi({ from, to, location: resolvedLocation.value });
    await persistData(result.records);

    res.json({
      metadata: {
        source: result.url,
        fetchedAt: new Date().toISOString(),
        rowCount: result.rows.length,
        from,
        to,
        location: resolvedLocation.value
      },
      headers: result.headers,
      rows: result.rows,
      records: result.records
    });
  } catch (error) {
    next(error);
  }
});

app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Unexpected server error' });
});

app.get('/api/market', async (req, res, next) => {
  try {
    const { from: defaultFrom, to: defaultTo } = defaultRange();
    const sanitizedFrom = sanitizeDate(req.query.from, defaultFrom);
    const sanitizedTo = sanitizeDate(req.query.to, defaultTo);
    const { from, to } = normalizeDateRange(sanitizedFrom, sanitizedTo);
    const resolvedLocation = normalizeLocation(req.query.location);
    const propertyType = String(req.query.type || 'all').toLowerCase();
    const typeFactor = PROPERTY_TYPE_FACTORS[propertyType] || PROPERTY_TYPE_FACTORS.all;

    if (!resolvedLocation.ok) {
      return res.status(400).json({ error: 'Unsupported location parameter' });
    }

    const result = await fetchUkhpi({ from, to, location: resolvedLocation.value });
    const summary = summariseMarket(result.records, typeFactor);

    res.json({
      summary,
      metadata: {
        source: result.url,
        fetchedAt: new Date().toISOString(),
        from,
        to,
        location: resolvedLocation.value,
        propertyType
      }
    });
  } catch (error) {
    next(error);
  }
});

function normalizeLocation(rawLocation) {
  if (!rawLocation) {
    return { ok: true, value: DEFAULT_LOCATION };
  }
  const normalizedKey = String(rawLocation).trim().toLowerCase();
  if (REGION_LOCATIONS[normalizedKey]) {
    return { ok: true, value: REGION_LOCATIONS[normalizedKey] };
  }
  try {
    const parsed = new URL(rawLocation);
    const normalizedUrl = normalizeLocationValue(`${parsed.origin}${parsed.pathname}`);
    if (parsed.hostname === LAND_REGISTRY_HOST && ALLOWED_LOCATION_URLS.has(normalizedUrl)) {
      return { ok: true, value: normalizedUrl };
    }
  } catch (error) {
    return { ok: false };
  }
  return { ok: false };
}

function normalizeDateRange(fromStr, toStr) {
  const today = new Date();
  let fromDate = new Date(fromStr);
  let toDate = new Date(toStr);

  if (Number.isNaN(fromDate.valueOf()) || Number.isNaN(toDate.valueOf())) {
    throw new Error('Invalid date range supplied');
  }

  if (toDate > today) {
    toDate = today;
  }

  if (fromDate < EARLIEST_DATE) {
    fromDate = EARLIEST_DATE;
  }

  if (fromDate > toDate) {
    fromDate = minusMonths(toDate, 1);
  }

  const monthDelta = (toDate.getFullYear() - fromDate.getFullYear()) * 12 + (toDate.getMonth() - fromDate.getMonth());
  if (monthDelta > MAX_MONTH_RANGE) {
    fromDate = minusMonths(toDate, MAX_MONTH_RANGE);
    if (fromDate < EARLIEST_DATE) {
      fromDate = EARLIEST_DATE;
    }
  }

  return { from: formatDate(fromDate), to: formatDate(toDate) };
}

function normalizeLocationValue(value = '') {
  return String(value).trim().replace(/\/$/, '');
}

function start() {
  app.listen(PORT, () => {
    console.log(`House Checker server running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
