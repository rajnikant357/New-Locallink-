const { env } = require("../src/config/env");
const { pool, ensurePostgres, dbDriver } = require("../src/db/postgres");

async function main() {
  await ensurePostgres();

  const identityResult = await pool.query(
    "SELECT current_database() AS database, current_user AS db_user, inet_server_addr()::text AS server_addr",
  );
  const sslResult =
    dbDriver === "neon-http"
      ? { rows: [{ ssl: true, version: "https", cipher: "neon-http" }] }
      : await pool.query("SELECT ssl, version, cipher FROM pg_stat_ssl WHERE pid = pg_backend_pid()");

  const identity = identityResult.rows[0] || {};
  const sslInfo = sslResult.rows[0] || { ssl: false, version: null, cipher: null };
  const sslUsed = sslInfo.ssl === true;

  if (dbDriver !== "neon-http" && env.pgSslMode && env.pgSslMode !== "disable" && !sslUsed) {
    throw new Error(`SSL is not active for current connection while PGSSLMODE=${env.pgSslMode}`);
  }

  if (env.pgHost.includes("render.com") && !sslUsed) {
    throw new Error("Render Postgres connection is not using SSL");
  }

  const result = {
    status: "ok",
    nodeEnv: env.nodeEnv,
    db: {
      driver: dbDriver,
      host: env.pgHost,
      port: env.pgPort,
      database: identity.database || env.pgDatabase,
      user: identity.db_user || env.pgUser,
      serverAddress: identity.server_addr || null,
    },
    ssl: {
      mode: env.pgSslMode || "not-set",
      active: sslUsed,
      rejectUnauthorized: typeof env.pgSsl === "object" ? env.pgSsl.rejectUnauthorized : null,
      version: sslInfo.version || null,
      cipher: sslInfo.cipher || null,
    },
    validation: {
      accessTokenSecretMinLength: env.accessTokenSecret.length >= 32,
      refreshTokenSecretMinLength: env.refreshTokenSecret.length >= 32,
      secretsAreDifferent: env.accessTokenSecret !== env.refreshTokenSecret,
    },
  };

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    const nestedErrors = Array.isArray(error?.errors) ? error.errors : [];
    const nestedMessages = nestedErrors
      .map((entry) => (entry && entry.message ? entry.message : String(entry || "")))
      .filter(Boolean);
    const message = error?.message || nestedMessages.join(" | ") || "Unknown validation error";
    console.error(
      JSON.stringify(
        {
          status: "error",
          message,
          code: error?.code || null,
          nestedErrors: nestedMessages,
        },
        null,
        2,
      ),
    );
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
