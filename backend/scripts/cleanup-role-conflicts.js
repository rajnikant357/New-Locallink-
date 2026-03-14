const { pool, ensurePostgres } = require("../src/db/postgres");

async function main() {
  await ensurePostgres();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const removedProvidersResult = await client.query(`
      DELETE FROM app_providers p
      WHERE p.user_id IS NULL
        OR NOT EXISTS (SELECT 1 FROM app_users u WHERE u.id = p.user_id)
        OR EXISTS (SELECT 1 FROM app_users u WHERE u.id = p.user_id AND u.type = 'admin')
      RETURNING id
    `);

    const removedBookingsResult = await client.query(`
      DELETE FROM app_bookings b
      WHERE b.provider_id IS NULL
        OR b.provider_user_id IS NULL
        OR b.customer_id IS NULL
        OR NOT EXISTS (SELECT 1 FROM app_providers p WHERE p.id = b.provider_id)
        OR NOT EXISTS (SELECT 1 FROM app_users pu WHERE pu.id = b.provider_user_id)
        OR NOT EXISTS (SELECT 1 FROM app_users cu WHERE cu.id = b.customer_id)
      RETURNING id
    `);

    const removedNotificationsResult = await client.query(`
      DELETE FROM app_notifications n
      WHERE NOT EXISTS (SELECT 1 FROM app_users u WHERE u.id = n.user_id)
        OR (
          n.type = 'booking'
          AND (
            EXISTS (SELECT 1 FROM app_users owner WHERE owner.id = n.user_id AND owner.type = 'admin')
            OR NOT EXISTS (
              SELECT 1
              FROM app_bookings b
              WHERE b.id = n.booking_id
                AND (b.customer_id = n.user_id OR b.provider_user_id = n.user_id)
            )
          )
        )
      RETURNING id
    `);

    await client.query(`
      UPDATE app_users
      SET refresh_token_hashes = '{}'
      WHERE refresh_token_hashes IS NULL
    `);

    await client.query("COMMIT");

    console.log(
      JSON.stringify(
        {
          status: "ok",
          removedAdminLinkedProviders: removedProvidersResult.rowCount,
          removedProviders: removedProvidersResult.rowCount,
          removedBookings: removedBookingsResult.rowCount,
          removedNotifications: removedNotificationsResult.rowCount,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
