const { Pool } = require("pg");
const { neon, neonConfig } = require("@neondatabase/serverless");
const { env } = require("../config/env");
const { defaultProviderCategories } = require("./default-categories");

const legacyParentCategoryNames = [
  "Home Repair & Maintenance",
  "Cleaning & Household Help",
  "Beauty & Personal Care",
  "Event & Media Services",
  "Local Food & Catering",
  "Transport & Logistics",
  "Outdoor & Property Services",
  "Skills & Freelance Local Services",
];

const poolConfig = env.pgConnectionString
  ? {
      connectionString: env.pgConnectionString,
      connectionTimeoutMillis: 30_000,
      idleTimeoutMillis: 30_000,
      max: 10,
      allowExitOnIdle: true,
    }
  : {
      host: env.pgHost,
      port: env.pgPort,
      database: env.pgDatabase,
      user: env.pgUser,
      password: env.pgPassword,
      connectionTimeoutMillis: 30_000,
      idleTimeoutMillis: 30_000,
      max: 10,
      allowExitOnIdle: true,
    };

if (env.pgSslMode !== undefined) {
  poolConfig.ssl = env.pgSsl;
}

function shouldUseNeonHttp() {
  return Boolean(env.pgConnectionString && /\.neon\.tech$/i.test(env.pgHost));
}

function createNeonHttpPool(connectionString) {
  neonConfig.fetchEndpoint = (host) => `https://${host}/sql`;
  const sql = neon(connectionString);

  return {
    async query(text, params = []) {
      const rows = await sql.query(text, params);
      return { rows };
    },
    async connect() {
      return {
        async query(text, params = []) {
          if (["BEGIN", "COMMIT", "ROLLBACK"].includes(String(text).trim().toUpperCase())) {
            return { rows: [] };
          }
          const rows = await sql.query(text, params);
          return { rows };
        },
        release() {},
      };
    },
    async end() {},
  };
}

const dbDriver = shouldUseNeonHttp() ? "neon-http" : "pg";
const pool = dbDriver === "neon-http" ? createNeonHttpPool(env.pgConnectionString) : new Pool(poolConfig);

let initialized = false;
let initializingPromise = null;
let lastBootstrapError = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientDbError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.code === "ETIMEDOUT" ||
    error?.code === "ECONNRESET" ||
    error?.code === "57P01" ||
    message.includes("connection terminated unexpectedly") ||
    message.includes("connection terminated due to connection timeout") ||
    message.includes("timeout")
  );
}

async function runWithRetry(fn, { attempts = 5, initialDelayMs = 1000 } = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      lastBootstrapError = error;
      if (!isTransientDbError(error) || attempt === attempts) {
        throw error;
      }

      const delayMs = initialDelayMs * 2 ** (attempt - 1);
      // eslint-disable-next-line no-console
      console.warn(
        `Database bootstrap attempt ${attempt} failed; retrying in ${delayMs}ms: ${error.message}`,
      );
      await sleep(delayMs);
    }
  }

  throw lastError;
}

async function ensurePostgres() {
  if (initialized) {
    return;
  }

  if (initializingPromise) {
    return initializingPromise;
  }

  initializingPromise = runWithRetry(async () => {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      type TEXT,
      location TEXT,
      profile_image_url TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      password_hash TEXT,
      refresh_token_hashes TEXT[] DEFAULT '{}',
      data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_providers (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES app_users(id) ON DELETE CASCADE,
      name TEXT,
      category TEXT,
      sub_category TEXT,
      bio TEXT,
      location TEXT,
      billing_type TEXT DEFAULT 'hourly',
      price_min NUMERIC,
      skills TEXT[],
      rating NUMERIC,
      reviews INTEGER,
      is_verified BOOLEAN DEFAULT FALSE,
      experience TEXT,
      hourly_rate NUMERIC,
      application_status TEXT DEFAULT 'pending',
      verification_notes TEXT,
      aadhaar_number TEXT,
      certificate_url TEXT,
      social_links JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE app_providers ADD COLUMN IF NOT EXISTS billing_type TEXT DEFAULT 'hourly'`);
  await pool.query(`ALTER TABLE app_providers ADD COLUMN IF NOT EXISTS sub_category TEXT`);
  await pool.query(`ALTER TABLE app_providers ADD COLUMN IF NOT EXISTS application_status TEXT DEFAULT 'pending'`);
  await pool.query(`ALTER TABLE app_providers ADD COLUMN IF NOT EXISTS verification_notes TEXT`);
  await pool.query(`ALTER TABLE app_providers ADD COLUMN IF NOT EXISTS aadhaar_number TEXT`);
  await pool.query(`ALTER TABLE app_providers ADD COLUMN IF NOT EXISTS certificate_url TEXT`);
  await pool.query(`ALTER TABLE app_providers ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb`);

  await pool.query(`
    UPDATE app_providers
    SET billing_type = 'hourly'
    WHERE billing_type IS NULL OR TRIM(billing_type) = ''
  `);

  await pool.query(`
    UPDATE app_providers
    SET application_status = CASE
      WHEN is_verified = TRUE THEN 'approved'
      ELSE 'pending'
    END
    WHERE application_status IS NULL OR TRIM(application_status) = ''
  `);

  await pool.query(`
    UPDATE app_providers
    SET social_links = '{}'::jsonb
    WHERE social_links IS NULL
  `);

  await pool.query(`
    UPDATE app_providers
    SET category = sub_category,
        sub_category = NULL,
        updated_at = NOW()
    WHERE sub_category IS NOT NULL AND TRIM(sub_category) <> ''
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      subcategories TEXT[] DEFAULT '{}',
      subcategory_details JSONB DEFAULT '[]'::jsonb,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE app_categories ADD COLUMN IF NOT EXISTS subcategories TEXT[] DEFAULT '{}'`);
  await pool.query(`ALTER TABLE app_categories ADD COLUMN IF NOT EXISTS subcategory_details JSONB DEFAULT '[]'::jsonb`);

  await pool.query(`
    UPDATE app_categories
    SET subcategories = '{}',
        subcategory_details = '[]'::jsonb,
        updated_at = NOW()
    WHERE subcategories IS DISTINCT FROM '{}'::text[]
       OR subcategory_details IS DISTINCT FROM '[]'::jsonb
  `);

  if (legacyParentCategoryNames.length > 0) {
    const placeholders = legacyParentCategoryNames.map((_, index) => `$${index + 1}`).join(", ");
    await pool.query(
      `DELETE FROM app_categories WHERE name IN (${placeholders})`,
      legacyParentCategoryNames,
    );
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_reviews (
      id TEXT PRIMARY KEY,
      provider_id TEXT REFERENCES app_providers(id) ON DELETE CASCADE,
      customer_id TEXT REFERENCES app_users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (provider_id, customer_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_bookings (
      id TEXT PRIMARY KEY,
      customer_id TEXT REFERENCES app_users(id) ON DELETE CASCADE,
      provider_id TEXT REFERENCES app_providers(id) ON DELETE SET NULL,
      provider_user_id TEXT REFERENCES app_users(id) ON DELETE SET NULL,
      service TEXT,
      scheduled_for TIMESTAMPTZ,
      status TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_messages (
      id TEXT PRIMARY KEY,
      from_user_id TEXT REFERENCES app_users(id) ON DELETE CASCADE,
      to_user_id TEXT REFERENCES app_users(id) ON DELETE CASCADE,
      text TEXT,
      edited_at TIMESTAMPTZ,
      forwarded_from_message_id TEXT,
      forwarded_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE app_messages ADD COLUMN IF NOT EXISTS forwarded_from_message_id TEXT`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES app_users(id) ON DELETE CASCADE,
      from_user_id TEXT REFERENCES app_users(id) ON DELETE CASCADE,
      message_id TEXT REFERENCES app_messages(id) ON DELETE CASCADE,
      booking_id TEXT REFERENCES app_bookings(id) ON DELETE CASCADE,
      type TEXT,
      title TEXT,
      message TEXT,
      data JSONB,
      payload JSONB,
      is_read BOOLEAN DEFAULT FALSE,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS from_user_id TEXT REFERENCES app_users(id) ON DELETE CASCADE`);
  await pool.query(`ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS message_id TEXT REFERENCES app_messages(id) ON DELETE CASCADE`);
  await pool.query(`ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS booking_id TEXT REFERENCES app_bookings(id) ON DELETE CASCADE`);
  await pool.query(`ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS payload JSONB`);
  await pool.query(`ALTER TABLE app_notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE`);
  await pool.query(`
    UPDATE app_notifications
    SET payload = data
    WHERE payload IS NULL AND data IS NOT NULL
  `);
  await pool.query(`
    UPDATE app_notifications
    SET is_read = TRUE
    WHERE is_read = FALSE AND read_at IS NOT NULL
  `);

  // Sessions table for server-backed refresh tokens
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES app_users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      user_agent TEXT,
      ip_address TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      revoked BOOLEAN DEFAULT FALSE
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_sessions_userid ON user_sessions(user_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_sessions_tokenhash ON user_sessions(token_hash)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_contact_messages (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      phone TEXT,
      subject TEXT,
      message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE app_contact_messages ADD COLUMN IF NOT EXISTS phone TEXT`);
  await pool.query(`ALTER TABLE app_contact_messages ADD COLUMN IF NOT EXISTS subject TEXT`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_hurry_requests (
      id TEXT PRIMARY KEY,
      customer_id TEXT REFERENCES app_users(id) ON DELETE CASCADE,
      service TEXT,
      location TEXT,
      budget_min NUMERIC,
      budget_max NUMERIC,
      notes TEXT,
      status TEXT DEFAULT 'pending',
      matched_provider_id TEXT REFERENCES app_providers(id) ON DELETE SET NULL,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_hurry_responses (
      id TEXT PRIMARY KEY,
      request_id TEXT REFERENCES app_hurry_requests(id) ON DELETE CASCADE,
      provider_id TEXT REFERENCES app_providers(id) ON DELETE CASCADE,
      provider_user_id TEXT REFERENCES app_users(id) ON DELETE CASCADE,
      status TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_payments (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      related_id TEXT,
      user_id TEXT,
      amount NUMERIC NOT NULL,
      currency TEXT DEFAULT 'INR',
      provider_id TEXT,
      status TEXT DEFAULT 'pending',
      provider_payload JSONB,
      gateway_session TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE app_payments ADD COLUMN IF NOT EXISTS gateway_session TEXT`);
  await pool.query(`ALTER TABLE app_payments ADD COLUMN IF NOT EXISTS provider_id TEXT`);

  await pool.query(
    `
    INSERT INTO app_categories (id, name, description, subcategories, subcategory_details, is_active)
    VALUES ${defaultProviderCategories
      .map(
        (_, index) =>
          `($${index * 6 + 1}, $${index * 6 + 2}, $${index * 6 + 3}, $${index * 6 + 4}, $${index * 6 + 5}, $${index * 6 + 6})`,
      )
      .join(", ")}
    ON CONFLICT (name) DO UPDATE SET
      description = EXCLUDED.description,
      subcategories = EXCLUDED.subcategories,
      subcategory_details = EXCLUDED.subcategory_details,
      is_active = EXCLUDED.is_active,
      updated_at = NOW()
  `,
    defaultProviderCategories.flatMap((category) => [
      category.id,
      category.name,
      category.description,
      [],
      JSON.stringify([]),
      category.isActive,
    ]),
  );

    initialized = true;
    lastBootstrapError = null;
  }, { attempts: 5, initialDelayMs: 1000 }).finally(() => {
    initializingPromise = null;
  });

  return initializingPromise;
}

function isPostgresReady() {
  return initialized;
}

function getPostgresBootstrapError() {
  return lastBootstrapError
    ? {
        message: lastBootstrapError.message,
        code: lastBootstrapError.code || null,
      }
    : null;
}

module.exports = {
  pool,
  ensurePostgres,
  isPostgresReady,
  getPostgresBootstrapError,
  dbDriver,
};
