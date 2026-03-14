const { Pool } = require("pg");
const { env } = require("../src/config/env");

const pool = env.pgConnectionString
  ? new Pool({ connectionString: env.pgConnectionString })
  : new Pool({
      host: env.pgHost,
      port: env.pgPort,
      database: env.pgDatabase,
      user: env.pgUser,
      password: env.pgPassword,
    });

(async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("DB time rows:", res.rows);
  } catch (err) {
    console.error("test failed", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
