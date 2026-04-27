const { app } = require("./app");
const { env } = require("./config/env");
const { ensurePostgres } = require("./db/postgres");

const startServer = async () => {
  app.listen(env.port, () => {
    console.log(`LocalLink backend listening on http://localhost:${env.port}`);
  });

  const bootstrapDatabase = async () => {
    console.log("Starting DB initialization (ensurePostgres)");
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
        console.log("DB initialization complete");
        return;
      } catch (error) {
        console.error("DB initialization failed; retrying in 10s", error);
        await new Promise((resolve) => setTimeout(resolve, 10_000));
      }
    }
  };

  bootstrapDatabase().catch((error) => {
    console.error("Unexpected DB bootstrap failure", error);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
