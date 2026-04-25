const { app } = require("./app");
const { env } = require("./config/env");
const { ensurePostgres } = require("./db/postgres");

const startServer = async () => {
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`LocalLink backend listening on http://localhost:${env.port}`);
  });

  const bootstrapDatabase = async () => {
    // eslint-disable-next-line no-console
    console.log("Starting DB initialization (ensurePostgres)");
    // eslint-disable-next-line no-console
    console.log("PG config:", {
      connectionString: env.pgConnectionString,
      host: env.pgHost,
      port: env.pgPort,
      database: env.pgDatabase,
      user: env.pgUser,
      sslMode: env.pgSslMode,
    });

    while (true) {
      try {
        await ensurePostgres();
        // eslint-disable-next-line no-console
        console.log("DB initialization complete");
        return;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("DB initialization failed; retrying in 10s", error);
        await new Promise((resolve) => setTimeout(resolve, 10_000));
      }
    }
  };

  bootstrapDatabase().catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Unexpected DB bootstrap failure", error);
  });
};

startServer().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server", error);
  process.exit(1);
});
