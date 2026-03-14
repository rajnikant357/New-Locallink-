const { app } = require("./app");
const { env } = require("./config/env");
const { ensurePostgres } = require("./db/postgres");

const startServer = async () => {
  await ensurePostgres();
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`LocalLink backend listening on http://localhost:${env.port}`);
  });
};

startServer().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server", error);
  process.exit(1);
});
