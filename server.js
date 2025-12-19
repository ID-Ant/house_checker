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
const UKHPI_CSV_PATH = '/app/ukhpi/download/new.csv';
const LAND_REGISTRY_ADDRESS_ENDPOINT = '/data/ppi/address.json';
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
const PROPERTY_TYPE_FIELDS = {
  all: 'All property types',
  detached: 'Detached houses',
  'semi-detached': 'Semi-detached houses',
  terraced: 'Terraced houses',
  flat: 'Flats and maisonettes'
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

// Cache policy: short for HTML, long for static assets
app.use((req, res, next) => {
  const isHtml = req.path === '/' || req.path.endsWith('.html');
  if (isHtml) {
    res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
  } else if (/\.(css|js|svg|png|jpg|jpeg|webp|ico)$/i.test(req.path)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  res.setHeader('X-Robots-Tag', 'index, follow');
  next();
});

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

async function fetchCsvText(url, redirects = 0) {
  if (redirects > 5) {
    throw new Error('Too many redirects while requesting UKHPI CSV');
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
          reject(new Error('Unexpected redirect host when requesting UKHPI CSV'));
          return;
        }
        fetchCsvText(redirectedUrl.toString(), redirects + 1).then(resolve).catch(reject);
        return;
      }
      if (statusCode < 200 || statusCode >= 300) {
        response.resume();
        reject(new Error(`Failed to fetch UKHPI CSV (HTTP ${statusCode})`));
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

function fetchLandRegistryJson(pathname, params = null, redirects = 0) {
  if (redirects > 5) {
    return Promise.reject(new Error('Too many redirects while requesting Land Registry data'));
  }
  return new Promise((resolve, reject) => {
    const url = new URL(pathname, `https://${LAND_REGISTRY_HOST}`);
    if (params instanceof URLSearchParams) {
      params.forEach((value, key) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, value);
        }
      });
    } else if (params && typeof params === 'object') {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, value);
        }
      });
    }

    console.log('[LandRegistry] Fetch', url.toString());
    const request = https.get(url, { headers: FETCH_HEADERS }, (response) => {
      const { statusCode = 0, headers } = response;
      if ([301, 302, 307, 308].includes(statusCode) && headers?.location) {
        response.resume();
        const redirected = new URL(headers.location, url);
        if (redirected.hostname !== LAND_REGISTRY_HOST) {
          reject(new Error('Unexpected redirect host while requesting Land Registry data'));
          return;
        }
        fetchLandRegistryJson(redirected.pathname + redirected.search, null, redirects + 1)
          .then(resolve)
          .catch(reject);
        return;
      }
      if (statusCode < 200 || statusCode >= 300) {
        response.resume();
        reject(new Error(`Failed to fetch Land Registry data (HTTP ${statusCode})`));
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        try {
          const json = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          const itemCount = Array.isArray(json?.result?.items) ? json.result.items.length : undefined;
          const hasNext = Boolean(json?.result?.next);
          console.log('[LandRegistry] Response parsed', { url: url.toString(), itemCount, hasNext });
          resolve(json);
        } catch (error) {
          reject(new Error('Failed to parse Land Registry response'));
        }
      });
    });
    request.on('error', reject);
  });
}

function parseCsv(text = '') {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;
  let i = 0;
  const input = text.replace(/^\uFEFF/, '');
  while (i < input.length) {
    const char = input[i];
    if (char === '"') {
      if (inQuotes && input[i + 1] === '"') {
        field += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && input[i + 1] === '\n') {
        i += 1;
      }
      row.push(field);
      field = '';
      if (row.some((value) => value !== '')) {
        rows.push(row);
      }
      row = [];
    } else {
      field += char;
    }
    i += 1;
  }
  if (field.length || row.length) {
    row.push(field);
    if (row.some((value) => value !== '')) {
      rows.push(row);
    }
  }
  return rows;
}

async function fetchUkhpiCsv({ from, to, location }) {
  const baseUrl = new URL(`https://${LAND_REGISTRY_HOST}${UKHPI_CSV_PATH}`);
  const params = new URLSearchParams({ from, to, location });
  params.append('thm[]', 'property_type');
  params.append('in[]', 'avg');
  baseUrl.search = params.toString();
  console.log('[UKHPI CSV] Fetching', baseUrl.toString());
  const csvText = await fetchCsvText(baseUrl.toString());
  const rows = parseCsv(csvText);
  if (!rows.length) {
    throw new Error('Empty CSV data returned from UKHPI');
  }
  const headers = rows[0].map((value) => value.trim());
  const records = rows
    .slice(1)
    .map((row) => {
      const entry = {};
      headers.forEach((header, index) => {
        entry[header] = row[index] ?? '';
      });
      return entry;
    })
    .filter((entry) => Object.values(entry).some((value) => String(value || '').trim() !== ''));

  return { headers, records, url: baseUrl.toString() };
}

async function fetchUkhpi({ from, to, location }) {
  const baseUrl = new URL(`https://${LAND_REGISTRY_HOST}${UKHPI_PATH}`);
  const params = new URLSearchParams({ from, to, location, lang: 'en' });
  const url = `${baseUrl.origin}${baseUrl.pathname}?${params.toString()}`;
  console.log(`[UKHPI] Fetching market data`, { url });
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const table = $('table').first();
  if (!table.length) {
    throw new Error('No table found in UKHPI response');
  }
  const headerRows = table.find('tr');
  const firstRowCells = headerRows.eq(0).find('th,td');
  const secondRowCells = headerRows.eq(1).find('th,td');
  const headers = [];
  let secondIndex = 0;
  firstRowCells.each((_, cell) => {
    const $cell = $(cell);
    const text = $cell.text().trim();
    const colspan = parseInt($cell.attr('colspan') || '1', 10);
    const rowspan = parseInt($cell.attr('rowspan') || '1', 10);
    if (colspan > 1 && rowspan === 1 && secondRowCells.length) {
      for (let i = 0; i < colspan; i += 1) {
        const subCell = secondRowCells.eq(secondIndex);
        const subText = subCell.text().trim();
        headers.push(`${text} ${subText}`.trim());
        secondIndex += 1;
      }
    } else {
      headers.push(text);
    }
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
    Object.keys(record).find((key) => /all property types/i.test(key)) ||
    Object.keys(record).find((key) => /average/i.test(key) && /price/i.test(key)) ||
    Object.keys(record).find((key) => /average/i.test(key)) ||
    Object.keys(record).find((key) => /price/i.test(key));
  const key = preferredKey || Object.keys(record)[1];
  const value = key ? toCurrencyNumber(record[key]) : null;
  return { key, value };
}

function parseRecordDate(record) {
  const rawLabel = record.Date || record.Period || record.Month;
  if (!rawLabel) return null;
  const cleaned = String(rawLabel).replace(/[^0-9a-zA-Z -]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  const parsed = Date.parse(cleaned);
  if (!Number.isNaN(parsed)) return new Date(parsed);
  const monthYearMatch = cleaned.match(/([A-Za-z]+)\s+(\d{4})/);
  if (monthYearMatch) {
    const [_, month, year] = monthYearMatch;
    const tentative = Date.parse(`${month} 1, ${year}`);
    if (!Number.isNaN(tentative)) {
      return new Date(tentative);
    }
  }
  const isoMatch = cleaned.match(/(\d{4})[-/](\d{1,2})/);
  if (isoMatch) {
    const [, year, month] = isoMatch;
    const tentative = new Date(Number(year), Number(month) - 1, 1);
    if (!Number.isNaN(tentative.valueOf())) {
      return tentative;
    }
  }
  return null;
}

function normalizeHeaderLabel(label = '') {
  return String(label).replace(/\s+/g, ' ').trim().toLowerCase();
}

function resolveFieldKey(keys = [], targetField) {
  if (!targetField) return null;
  const normalizedTarget = normalizeHeaderLabel(targetField);
  return (
    keys.find((key) => normalizeHeaderLabel(key) === normalizedTarget) ||
    keys.find((key) => normalizeHeaderLabel(key).includes(normalizedTarget)) ||
    null
  );
}

function toCurrencyNumber(value) {
  if (value == null) return null;
  const numeric = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
}

function summariseMarket(records, targetField) {
  if (!Array.isArray(records) || !records.length) {
    return null;
  }
  const candidateKeys = Object.keys(records[0] || {});
  const resolvedField = resolveFieldKey(candidateKeys, targetField);
  const series = records
    .map((record, index) => {
      const label = record.Period || record.Month || record.Date || `Point ${index + 1}`;
      let value = null;
      let fieldKey = resolvedField;
      if (fieldKey && record[fieldKey] != null) {
        value = toCurrencyNumber(record[fieldKey]);
      } else {
        const fallback = extractNumericField(record);
        fieldKey = fieldKey || fallback.key;
        value = fallback.value;
      }
      return {
        label,
        date: parseRecordDate(record),
        value: Number.isFinite(value) ? value : null,
        fieldKey
      };
    })
    .filter((entry) => Number.isFinite(entry.value));

  if (!series.length) return null;
  const ordered = series.sort((a, b) => {
    if (a.date && b.date) return a.date - b.date;
    if (a.date) return 1;
    if (b.date) return -1;
    return 0;
  });

  const latestEntry = ordered[ordered.length - 1];
  const previousEntry = ordered[ordered.length - 2];
  const latestPrice = Math.round(latestEntry.value);
  const previousValue = previousEntry?.value;
  const changePercent =
    Number.isFinite(previousValue) && previousValue !== 0
      ? Number((((latestEntry.value - previousValue) / previousValue) * 100).toFixed(2))
      : null;

  console.log(`[UKHPI] Latest price resolved`, {
    fieldKey: latestEntry.fieldKey,
    latestLabel: latestEntry.label,
    latestRawValue: latestEntry.value,
    latestPrice,
    previousLabel: previousEntry?.label,
    previousValue
  });

  return {
    field: latestEntry.fieldKey,
    latestPrice,
    averagePrice: latestPrice,
    minPrice: latestPrice,
    maxPrice: latestPrice,
    changePercent,
    timeline: ordered.slice(-12)
  };
}

function normalizeAddressInput(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function uppercaseAddressInput(value) {
  return normalizeAddressInput(value).toUpperCase();
}

function extractLabel(entity) {
  if (!entity) return '';
  if (typeof entity === 'string') return entity;
  const source = entity.prefLabel || entity.label;
  if (Array.isArray(source) && source.length) {
    return source[0]?._value || source[0];
  }
  return '';
}

function formatTransactionDate(dateString) {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.valueOf())) {
    return { iso: null, display: dateString || '' };
  }
  const iso = parsed.toISOString().split('T')[0];
  const display = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(parsed);
  return { iso, display };
}

async function fetchPropertyAddresses(filters) {
  const searchParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });
  console.log('[LandRegistry] Address search', Object.fromEntries(searchParams));
  const response = await fetchLandRegistryJson(LAND_REGISTRY_ADDRESS_ENDPOINT, searchParams);
  const items = response?.result?.items;
  console.log('[LandRegistry] Address matches', items?.length ?? 0);
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }
  return { records: items, source: response?.result?._about || '' };
}

async function fetchTransactionsForAddress(addressUrl) {
  if (!addressUrl) {
    return { items: [], source: '' };
  }
  const parsed = new URL(addressUrl);
  if (parsed.hostname !== LAND_REGISTRY_HOST) {
    throw new Error('Unexpected Land Registry address host');
  }
  const transactionPath = `${parsed.pathname.replace(/\/$/, '')}/transactions.json`;
  const aggregatedItems = [];
  const pageSize = 200;
  let page = 0;
  let pageItems = [];
  let pagesFetched = 0;

  do {
    const params = new URLSearchParams({ _page: String(page), _pageSize: String(pageSize) });
    console.log('[LandRegistry] Transactions page request', { addressUrl, page, pageSize });
    const response = await fetchLandRegistryJson(transactionPath, params);
    pageItems = Array.isArray(response?.result?.items) ? response.result.items : [];
    aggregatedItems.push(...pageItems);
    pagesFetched += 1;
    page += 1;
  } while (pageItems.length === pageSize);

  console.log('[LandRegistry] Transactions fetched', {
    addressUrl,
    totalTransactions: aggregatedItems.length,
    pagesFetched
  });

  return {
    items: aggregatedItems,
    source: `${parsed.origin}${transactionPath}`
  };
}

function buildAddressSummary(record) {
  if (!record) return null;
  return {
    line1: [record.paon, record.saon, record.street].filter(Boolean).join(' ').trim(),
    town: record.town || record.locality || '',
    locality: record.locality || '',
    district: record.district || '',
    county: record.county || '',
    postcode: record.postcode || ''
  };
}

function pickPreferredAddress(records = [], filters = {}) {
  if (!records.length) return null;
  const normalizedPaon = uppercaseAddressInput(filters.paon);
  const normalizedStreet = uppercaseAddressInput(filters.street);
  const normalizedPostcode = uppercaseAddressInput(filters.postcode);

  const scored = records
    .map((record) => {
      let score = 0;
      if (record.paon && uppercaseAddressInput(record.paon) === normalizedPaon) score += 4;
      if (record.street && uppercaseAddressInput(record.street) === normalizedStreet) score += 3;
      if (record.postcode && uppercaseAddressInput(record.postcode) === normalizedPostcode) score += 5;
      if (record.locality) score += 1;
      if (record.town) score += 1;
      return { record, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.record || records[0];
}

function simplifyTransactions(items = []) {
  return items
    .map((item) => {
      const { iso, display } = formatTransactionDate(item.transactionDate);
      const recordStatusLabel = extractLabel(item.recordStatus);
      return {
        id: item.transactionId,
        pricePaid: Number(item.pricePaid) || null,
        estateType: extractLabel(item.estateType),
        propertyType: extractLabel(item.propertyType),
        transactionCategory: extractLabel(item.transactionCategory),
        statusLabel: recordStatusLabel,
        statusCode: recordStatusLabel ? recordStatusLabel.charAt(0).toUpperCase() : '',
        isoDate: iso,
        displayDate: display,
        rawDate: item.transactionDate || ''
      };
    })
    .sort((a, b) => {
      if (a.isoDate && b.isoDate) {
        if (a.isoDate === b.isoDate) return 0;
        return a.isoDate < b.isoDate ? 1 : -1;
      }
      if (a.isoDate) return -1;
      if (b.isoDate) return 1;
      return b.rawDate.localeCompare(a.rawDate);
    });
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

app.get('/api/property-transactions', async (req, res, next) => {
  try {
    const rawPaon = normalizeAddressInput(req.query.paon);
    const rawStreet = normalizeAddressInput(req.query.street);
    const rawPostcode = normalizeAddressInput(req.query.postcode);

    if (!rawPaon || !rawStreet || !rawPostcode) {
      return res.status(400).json({ error: 'Building, street and postcode are required.' });
    }

    const normalizedFilters = {
      paon: uppercaseAddressInput(rawPaon),
      street: uppercaseAddressInput(rawStreet),
      postcode: uppercaseAddressInput(rawPostcode)
    };

    const addressResult = await fetchPropertyAddresses(normalizedFilters);
    if (!addressResult || !addressResult.records?.length) {
      return res.status(404).json({ error: 'No matching address found.' });
    }

    const uniqueAddresses = addressResult.records
      .map((record) => record?._about)
      .filter((url, index, array) => typeof url === 'string' && url && array.indexOf(url) === index);

    const allTransactions = [];
    const seenIds = new Set();
    for (const addressUrl of uniqueAddresses) {
      const transactionResult = await fetchTransactionsForAddress(addressUrl);
      (transactionResult.items || []).forEach((item) => {
        if (item?.transactionId && !seenIds.has(item.transactionId)) {
          seenIds.add(item.transactionId);
          allTransactions.push(item);
        }
      });
    }

    const summaryRecord = pickPreferredAddress(addressResult.records, normalizedFilters);
    const summary = buildAddressSummary(summaryRecord);
    const transactions = simplifyTransactions(allTransactions);

    res.json({
      address: summary,
      transactions,
      metadata: {
        fetchedAt: new Date().toISOString(),
        addressSource: addressResult.source,
        query: {
          paon: rawPaon,
          street: rawStreet,
          postcode: rawPostcode
        },
        matchedAddressCount: addressResult.records.length,
        transactionCount: transactions.length
      }
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
    const fieldLabel = PROPERTY_TYPE_FIELDS[propertyType] || PROPERTY_TYPE_FIELDS.all;

    if (!resolvedLocation.ok) {
      return res.status(400).json({ error: 'Unsupported location parameter' });
    }

    const csvResult = await fetchUkhpiCsv({ from, to, location: resolvedLocation.value });
    const summary = summariseMarket(csvResult.records, fieldLabel);

    res.json({
      summary,
      metadata: {
        source: csvResult.url,
        fetchedAt: new Date().toISOString(),
        from,
        to,
        location: resolvedLocation.value,
        propertyType,
        fieldLabel,
        headers: csvResult.headers
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
    const isRegionPath =
      normalizedUrl.startsWith('http://landregistry.data.gov.uk/id/region/') ||
      normalizedUrl.startsWith('https://landregistry.data.gov.uk/id/region/');
    if (
      parsed.hostname === LAND_REGISTRY_HOST &&
      (ALLOWED_LOCATION_URLS.has(normalizedUrl) || isRegionPath)
    ) {
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
  const serverInstance = app.listen(PORT, () => {
    console.log(`House Checker server running on http://localhost:${PORT}`);
  });
  return serverInstance;
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
