const { pool } = require("./postgres");
const crypto = require("crypto");

// Default session TTL (ms) used when caller doesn't provide expiresAt.
const DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function camelToSnake(key) {
  return key.replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`);
}

function buildUpdateClause(updates) {
  const entries = Object.entries(updates);
  if (entries.length === 0) {
    return null;
  }
  const clauseParts = entries.map(([key], index) => `"${camelToSnake(key)}" = $${index + 1}`);
  return {
    clause: clauseParts.join(", "),
    values: entries.map(([, value]) => value),
  };
}

function normalizeTimestamp(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}


function normalizeSocialLinks(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((accumulator, [key, entry]) => {
    const normalizedKey = String(key || "").trim();
    const normalizedValue = String(entry || "").trim();
    if (normalizedKey && normalizedValue) {
      accumulator[normalizedKey] = normalizedValue;
    }
    return accumulator;
  }, {});
}

function mapUserRow(row) {
  if (!row) return null;
  const extra = row.data || {};
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    type: row.type,
    location: row.location,
    profileImageUrl: row.profile_image_url,
    isActive: row.is_active,
    passwordHash: row.password_hash,
    data: row.data || {},
    ...extra,
    createdAt: normalizeTimestamp(row.created_at),
    updatedAt: normalizeTimestamp(row.updated_at),
  };
}

function mapSessionRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    userAgent: row.user_agent,
    ipAddress: row.ip_address,
    createdAt: normalizeTimestamp(row.created_at),
    expiresAt: normalizeTimestamp(row.expires_at),
    revoked: row.revoked,
  };
}

function mapCategoryRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    createdAt: normalizeTimestamp(row.created_at),
    updatedAt: normalizeTimestamp(row.updated_at),
  };
}

function mapProviderRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    category: row.category,
    bio: row.bio,
    location: row.location,
    billingType: row.billing_type || "hourly",
    priceMin: row.price_min !== null ? Number(row.price_min) : null,
    skills: row.skills || [],
    rating: row.rating !== null ? Number(row.rating) : 0,
    reviews: row.reviews !== null ? Number(row.reviews) : 0,
    isActive: row.is_active,
    isVerified: row.is_verified,
    experience: row.experience,
    hourlyRate: row.hourly_rate !== null ? Number(row.hourly_rate) : null,
    applicationStatus: row.application_status || (row.is_verified ? "approved" : "pending"),
    verificationNotes: row.verification_notes || "",
    aadhaarNumber: row.aadhaar_number || "",
    certificateUrl: row.certificate_url || "",
    socialLinks: normalizeSocialLinks(row.social_links),
    createdAt: normalizeTimestamp(row.created_at),
    updatedAt: normalizeTimestamp(row.updated_at),
  };
}

function mapReviewRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    providerId: row.provider_id,
    customerId: row.customer_id,
    rating: Number(row.rating),
    comment: row.comment,
    createdAt: normalizeTimestamp(row.created_at),
    updatedAt: normalizeTimestamp(row.updated_at),
  };
}

function mapBookingRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    providerId: row.provider_id,
    providerUserId: row.provider_user_id,
    customerId: row.customer_id,
    service: row.service,
    scheduledFor: normalizeTimestamp(row.scheduled_for),
    notes: row.notes,
    status: row.status,
    createdAt: normalizeTimestamp(row.created_at),
    updatedAt: normalizeTimestamp(row.updated_at),
  };
}

function mapMessageRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    text: row.text,
    createdAt: normalizeTimestamp(row.created_at),
    editedAt: normalizeTimestamp(row.edited_at),
    forwardedFromMessageId: row.forwarded_from_message_id,
    forwardedAt: normalizeTimestamp(row.forwarded_at),
  };
}

function mapNotificationRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    fromUserId: row.from_user_id,
    messageId: row.message_id,
    bookingId: row.booking_id,
    title: row.title,
    message: row.message,
    type: row.type,
    isRead: row.is_read,
    readAt: normalizeTimestamp(row.read_at),
    payload: row.payload || null,
    createdAt: normalizeTimestamp(row.created_at),
  };
}

function mapContactMessageRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    message: row.message,
    createdAt: normalizeTimestamp(row.created_at),
    updatedAt: normalizeTimestamp(row.updated_at),
  };
}

function mapHurryRequestRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    customerId: row.customer_id,
    service: row.service,
    location: row.location,
    budgetMin: row.budget_min !== null ? Number(row.budget_min) : null,
    budgetMax: row.budget_max !== null ? Number(row.budget_max) : null,
    notes: row.notes,
    status: row.status,
    matchedProviderId: row.matched_provider_id,
    expiresAt: normalizeTimestamp(row.expires_at),
    createdAt: normalizeTimestamp(row.created_at),
    updatedAt: normalizeTimestamp(row.updated_at),
  };
}

function mapHurryResponseRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    requestId: row.request_id,
    providerId: row.provider_id,
    providerUserId: row.provider_user_id,
    status: row.status,
    createdAt: normalizeTimestamp(row.created_at),
  };
}

async function getUserByEmail(email) {
  const { rows } = await pool.query(
    `
    SELECT * FROM app_users WHERE email = $1
  `,
    [email],
  );
  return mapUserRow(rows[0]);
}

async function getUserById(id) {
  const { rows } = await pool.query(
    `
    SELECT * FROM app_users WHERE id = $1
  `,
    [id],
  );
  return mapUserRow(rows[0]);
}

// Session helpers for server-side sessions
async function createSession({ userId, userAgent = null, ipAddress = null, expiresAt = null }) {
  const sessionId = crypto.randomUUID();
  // Ensure expiresAt is always a timestamp string — if caller omitted it, compute default TTL (7 days)
  const finalExpiresAt = expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const expiresParam = finalExpiresAt instanceof Date ? finalExpiresAt.toISOString() : finalExpiresAt;

  const { rows } = await pool.query(
    `
    INSERT INTO user_sessions (
      id, user_id, user_agent, ip_address, expires_at
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `,
    [sessionId, userId, userAgent, ipAddress, expiresParam],
  );
  return mapSessionRow(rows[0]);
}

async function getSessionById(sessionId) {
  const { rows } = await pool.query(
    `SELECT * FROM user_sessions WHERE id = $1 LIMIT 1`,
    [sessionId],
  );
  return mapSessionRow(rows[0]);
}

async function revokeSessionById(sessionId) {
  const { rows } = await pool.query(
    `UPDATE user_sessions SET revoked = true WHERE id = $1 RETURNING *`,
    [sessionId],
  );
  return mapSessionRow(rows[0]);
}

async function updateSessionExpiration(sessionId, expiresAt) {
  const expiresParam = expiresAt instanceof Date ? expiresAt.toISOString() : expiresAt;
  const { rows } = await pool.query(
    `UPDATE user_sessions SET expires_at = $1 WHERE id = $2 RETURNING *`,
    [expiresParam, sessionId],
  );
  return mapSessionRow(rows[0]);
}

async function pruneExpiredSessions() {
  await pool.query(`DELETE FROM user_sessions WHERE expires_at IS NOT NULL AND expires_at < NOW()`);
}

async function getUserByResetTokenHash(hash) {
  const { rows } = await pool.query(
    `
    SELECT * FROM app_users
    WHERE data ->> 'resetTokenHash' = $1
    LIMIT 1
  `,
    [hash],
  );
  return mapUserRow(rows[0]);
}

async function setResetTokenForUser(userId, resetTokenHash, expiresAt) {
  const { rows } = await pool.query(
    `
    UPDATE app_users
    SET data = jsonb_set(
          jsonb_set(COALESCE(data, '{}'::jsonb), '{resetTokenHash}', to_jsonb($1::text), true),
          '{resetTokenExpiresAt}',
          to_jsonb($2::text),
          true
        ),
        updated_at = NOW()
    WHERE id = $3
    RETURNING *
  `,
    [resetTokenHash, expiresAt instanceof Date ? expiresAt.toISOString() : expiresAt, userId],
  );
  return mapUserRow(rows[0]);
}

async function clearResetTokenForUser(userId) {
  const { rows } = await pool.query(
    `
    UPDATE app_users
    SET data = (COALESCE(data, '{}'::jsonb) - 'resetTokenHash' - 'resetTokenExpiresAt'),
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `,
    [userId],
  );
  return mapUserRow(rows[0]);
}

async function listUsers() {
  const { rows } = await pool.query(`
    SELECT * FROM app_users ORDER BY created_at DESC
  `);
  return rows.map(mapUserRow);
}

async function getUsersByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return [];
  }
  const { rows } = await pool.query(
    `
    SELECT * FROM app_users WHERE id = ANY($1)
  `,
    [ids],
  );
  return rows.map(mapUserRow);
}

async function createUser(values) {
  const {
    id,
    name,
    email,
    phone,
    type,
    location,
    profileImageUrl,
    isActive = true,
    passwordHash,
    data = {},
  } = values;
  const { rows } = await pool.query(
    `
    INSERT INTO app_users (
      id,
      name,
      email,
      phone,
      type,
      location,
      profile_image_url,
      is_active,
      password_hash,
      data
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *
  `,
    [id, name, email, phone, type, location, profileImageUrl, isActive, passwordHash, data],
  );
  return mapUserRow(rows[0]);
}

async function updateUser(id, updates) {
  const clause = buildUpdateClause(updates);
  if (!clause) {
    return getUserById(id);
  }
  const { clause: setClause, values } = clause;
  const { rows } = await pool.query(
    `
    UPDATE app_users SET ${setClause}, updated_at = NOW()
    WHERE id = $${values.length + 1}
    RETURNING *
  `,
    [...values, id],
  );
  return mapUserRow(rows[0]);
}

async function deleteUser(id) {
  await pool.query("DELETE FROM app_bookings WHERE customer_id = $1 OR provider_user_id = $1", [id]);
  await pool.query("DELETE FROM app_messages WHERE from_user_id = $1 OR to_user_id = $1", [id]);
  await pool.query("DELETE FROM app_notifications WHERE user_id = $1 OR from_user_id = $1", [id]);
  await pool.query("DELETE FROM app_providers WHERE user_id = $1", [id]);
  await pool.query("DELETE FROM app_users WHERE id = $1", [id]);
}

async function countUsers() {
  const { rows } = await pool.query("SELECT COUNT(*) AS count FROM app_users");
  return Number(rows[0]?.count || 0);
}

async function listCategories() {
  const { rows } = await pool.query(`SELECT * FROM app_categories ORDER BY name ASC`);
  return rows.map(mapCategoryRow);
}

async function getCategoryById(id) {
  const { rows } = await pool.query("SELECT * FROM app_categories WHERE id = $1", [id]);
  return mapCategoryRow(rows[0]);
}

async function getCategoryByName(name) {
  const { rows } = await pool.query("SELECT * FROM app_categories WHERE LOWER(name) = LOWER($1)", [name]);
  return mapCategoryRow(rows[0]);
}

async function createCategory(values) {
  const { rows } = await pool.query(
    `
    INSERT INTO app_categories (
      id,
      name,
      description,
      is_active
    ) VALUES ($1,$2,$3,$4)
    RETURNING *
  `,
    [
      values.id,
      values.name,
      values.description,
      values.isActive,
    ],
  );
  return mapCategoryRow(rows[0]);
}

async function updateCategory(id, updates) {
  const clause = buildUpdateClause(updates);
  if (!clause) {
    return getCategoryById(id);
  }
  const { clause: setClause, values } = clause;
  const { rows } = await pool.query(
    `
    UPDATE app_categories SET ${setClause}, updated_at = NOW()
    WHERE id = $${values.length + 1}
    RETURNING *
  `,
    [...values, id],
  );
  return mapCategoryRow(rows[0]);
}

async function deleteCategory(id) {
  await pool.query("DELETE FROM app_categories WHERE id = $1", [id]);
}

async function countCategories() {
  const { rows } = await pool.query("SELECT COUNT(*) AS count FROM app_categories");
  return Number(rows[0]?.count || 0);
}

async function listProviders(options = {}) {
  const limit =
    Number.isInteger(options.limit) && options.limit > 0 ? Math.min(options.limit, 100) : null;
  const query = limit
    ? "SELECT * FROM app_providers ORDER BY created_at DESC LIMIT $1"
    : "SELECT * FROM app_providers ORDER BY created_at DESC";
  const params = limit ? [limit] : [];
  const { rows } = await pool.query(query, params);
  return rows.map(mapProviderRow);
}

async function getProviderById(id) {
  const { rows } = await pool.query("SELECT * FROM app_providers WHERE id = $1", [id]);
  return mapProviderRow(rows[0]);
}

async function getProviderByUserId(userId) {
  if (!userId) return null;
  const { rows } = await pool.query("SELECT * FROM app_providers WHERE user_id = $1", [userId]);
  return mapProviderRow(rows[0]);
}

async function createProvider(provider) {
  const { rows } = await pool.query(
    `
    INSERT INTO app_providers (
      id,
      user_id,
      name,
      category,
      sub_category,
      bio,
      location,
      billing_type,
      price_min,
      skills,
      is_verified,
      experience,
      hourly_rate,
      rating,
      reviews,
      application_status,
      verification_notes,
      aadhaar_number,
      certificate_url,
      social_links
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
    RETURNING *
  `,
    [
      provider.id,
      provider.userId,
      provider.name,
      provider.category,
      null,
      provider.bio,
      provider.location,
      provider.billingType || "hourly",
      provider.priceMin,
      provider.skills,
      provider.isVerified || false,
      provider.experience,
      provider.hourlyRate,
      provider.rating || 0,
      provider.reviews || 0,
      provider.applicationStatus || (provider.isVerified ? "approved" : "pending"),
      provider.verificationNotes || "",
      provider.aadhaarNumber || "",
      provider.certificateUrl || "",
      JSON.stringify(normalizeSocialLinks(provider.socialLinks)),
    ],
  );
  return mapProviderRow(rows[0]);
}

async function updateProvider(id, updates) {
  const clause = buildUpdateClause(updates);
  if (!clause) {
    return getProviderById(id);
  }
  const { clause: setClause, values } = clause;
  const { rows } = await pool.query(
    `
    UPDATE app_providers SET ${setClause}, updated_at = NOW()
    WHERE id = $${values.length + 1}
    RETURNING *
  `,
    [...values, id],
  );
  return mapProviderRow(rows[0]);
}

async function deleteProvider(id) {
  await pool.query("DELETE FROM app_bookings WHERE provider_id = $1", [id]);
  await pool.query("DELETE FROM app_providers WHERE id = $1", [id]);
}

async function updateProviderCategoryName(oldName, newName) {
  await pool.query(
    `
    UPDATE app_providers SET category = $1, updated_at = NOW()
    WHERE LOWER(category) = LOWER($2)
  `,
    [newName, oldName],
  );
}

async function countProviders() {
  const { rows } = await pool.query("SELECT COUNT(*) AS count FROM app_providers");
  return Number(rows[0]?.count || 0);
}

async function listReviewsByProvider(providerId) {
  const { rows } = await pool.query(
    `
    SELECT * FROM app_reviews
    WHERE provider_id = $1
    ORDER BY created_at DESC
  `,
    [providerId],
  );
  return rows.map(mapReviewRow);
}

async function getReviewByProviderAndCustomer(providerId, customerId) {
  const { rows } = await pool.query(
    `
    SELECT * FROM app_reviews
    WHERE provider_id = $1 AND customer_id = $2
  `,
    [providerId, customerId],
  );
  return mapReviewRow(rows[0]);
}

async function upsertReview({ id, providerId, customerId, rating, comment }) {
  const { rows } = await pool.query(
    `
    INSERT INTO app_reviews (
      id,
      provider_id,
      customer_id,
      rating,
      comment
    ) VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (provider_id, customer_id) DO UPDATE SET
      rating = EXCLUDED.rating,
      comment = EXCLUDED.comment,
      updated_at = NOW()
    RETURNING *
  `,
    [id, providerId, customerId, rating, comment],
  );
  return mapReviewRow(rows[0]);
}

async function recalculateProviderRating(providerId) {
  const { rows } = await pool.query(
    `
    SELECT AVG(rating)::numeric(10,1) AS average, COUNT(*)::int AS count
    FROM app_reviews
    WHERE provider_id = $1
  `,
    [providerId],
  );
  const average = rows[0]?.average ? Number(rows[0].average) : 0;
  const count = rows[0]?.count ?? 0;
  await pool.query(
    `
    UPDATE app_providers SET rating = $1, reviews = $2, updated_at = NOW()
    WHERE id = $3
  `,
    [average, count, providerId],
  );
}

async function createBooking(values) {
  const { rows } = await pool.query(
    `
    INSERT INTO app_bookings (
      id,
      provider_id,
      provider_user_id,
      customer_id,
      service,
      scheduled_for,
      notes,
      status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *
  `,
    [
      values.id,
      values.providerId,
      values.providerUserId,
      values.customerId,
      values.service,
      values.scheduledFor,
      values.notes,
      values.status,
    ],
  );
  return mapBookingRow(rows[0]);
}

async function getBookingById(id) {
  const { rows } = await pool.query("SELECT * FROM app_bookings WHERE id = $1", [id]);
  return mapBookingRow(rows[0]);
}

async function listBookingsForUser(userId, status) {
  let query = `
    SELECT * FROM app_bookings
    WHERE customer_id = $1 OR provider_user_id = $1
  `;
  const params = [userId];
  if (status) {
    query += " AND status = $2";
    params.push(status);
  }
  query += " ORDER BY created_at DESC";
  const { rows } = await pool.query(query, params);
  return rows.map(mapBookingRow);
}

async function hasCompletedBooking(providerId, customerId) {
  const { rows } = await pool.query(
    `
    SELECT 1 FROM app_bookings
    WHERE provider_id = $1 AND customer_id = $2 AND status = 'completed'
    LIMIT 1
  `,
    [providerId, customerId],
  );
  return rows.length > 0;
}

async function countCompletedBookingsForProvider(providerId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS count FROM app_bookings WHERE provider_id = $1 AND status = 'completed'`,
    [providerId],
  );
  return Number(rows[0]?.count || 0);
}

async function listAllBookings() {
  const { rows } = await pool.query(`
    SELECT * FROM app_bookings ORDER BY created_at DESC
  `);
  return rows.map(mapBookingRow);
}

async function updateBookingStatus(id, status) {
  const { rows } = await pool.query(
    `
    UPDATE app_bookings SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `,
    [status, id],
  );
  return mapBookingRow(rows[0]);
}

async function createMessage(values) {
  const { rows } = await pool.query(
    `
    INSERT INTO app_messages (
      id,
      from_user_id,
      to_user_id,
      text,
      forwarded_from_message_id
    ) VALUES ($1,$2,$3,$4,$5)
    RETURNING *
  `,
    [values.id, values.fromUserId, values.toUserId, values.text, values.forwardedFromMessageId],
  );
  return mapMessageRow(rows[0]);
}

async function getMessageById(id) {
  const { rows } = await pool.query("SELECT * FROM app_messages WHERE id = $1", [id]);
  return mapMessageRow(rows[0]);
}

async function listConversation(userId, withUserId) {
  const { rows } = await pool.query(
    `
    SELECT * FROM app_messages
    WHERE (from_user_id = $1 AND to_user_id = $2)
      OR (from_user_id = $2 AND to_user_id = $1)
    ORDER BY created_at ASC
  `,
    [userId, withUserId],
  );
  return rows.map(mapMessageRow);
}

async function listMessagesForUser(userId) {
  const { rows } = await pool.query(
    `
    SELECT * FROM app_messages
    WHERE from_user_id = $1 OR to_user_id = $1
    ORDER BY created_at DESC
  `,
    [userId],
  );
  return rows.map(mapMessageRow);
}

async function listAllMessages() {
  const { rows } = await pool.query(`SELECT * FROM app_messages ORDER BY created_at DESC`);
  return rows.map(mapMessageRow);
}

async function listRecipients(excludeUserId) {
  const { rows } = await pool.query(
    `
    SELECT * FROM app_users
    WHERE id <> $1
    ORDER BY name ASC
  `,
    [excludeUserId],
  );
  return rows.map(mapUserRow);
}

async function updateMessageText(id, text) {
  const { rows } = await pool.query(
    `
    UPDATE app_messages SET text = $1, edited_at = NOW()
    WHERE id = $2
    RETURNING *
  `,
    [text, id],
  );
  return mapMessageRow(rows[0]);
}

async function deleteMessage(id) {
  await pool.query("DELETE FROM app_messages WHERE id = $1", [id]);
}

async function createNotification(values) {
  const { rows } = await pool.query(
    `
    INSERT INTO app_notifications (
      id,
      user_id,
      from_user_id,
      message_id,
      booking_id,
      title,
      message,
      type,
      payload
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
  `,
    [
      values.id,
      values.userId,
      values.fromUserId,
      values.messageId,
      values.bookingId,
      values.title,
      values.message,
      values.type,
      values.payload,
    ],
  );
  return mapNotificationRow(rows[0]);
}

async function listNotifications(userId, { unreadOnly, includeMessage } = {}) {
  let query = `
    SELECT * FROM app_notifications
    WHERE user_id = $1
  `;
  const params = [userId];
  if (!includeMessage) {
    query += ` AND type <> 'message'`;
  }
  if (unreadOnly) {
    query += includeMessage ? " AND is_read = FALSE" : " AND is_read = FALSE";
  }
  query += " ORDER BY created_at DESC";
  const { rows } = await pool.query(query, params);
  const notifications = rows.map(mapNotificationRow);

  // Enrich notifications missing payload with booking/provider info when possible
  await Promise.all(
    notifications.map(async (n) => {
      if (n && !n.payload && n.bookingId) {
        try {
          const booking = await getBookingById(n.bookingId);
          if (booking && booking.providerId) {
            const provider = await getProviderById(booking.providerId);
            if (provider) {
              n.payload = {
                providerName: provider.name,
                service: booking.service,
                providerCategory: provider.category,
              };
            }
          }
        } catch (err) {
          // ignore enrichment errors
        }
      }
    }),
  );

  return notifications;
}

async function markNotificationRead(id, userId) {
  const { rows } = await pool.query(
    `
    UPDATE app_notifications SET is_read = TRUE, read_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING *
  `,
    [id, userId],
  );
  return mapNotificationRow(rows[0]);
}

async function markAllNotificationsRead(userId) {
  const { rows } = await pool.query(
    `
    UPDATE app_notifications SET is_read = TRUE, read_at = NOW()
    WHERE user_id = $1 AND type <> 'message' AND is_read = FALSE
    RETURNING *
  `,
    [userId],
  );
  return rows.map(mapNotificationRow);
}

async function markMessageNotificationsReadBySender(userId, fromUserId) {
  const { rows } = await pool.query(
    `
    UPDATE app_notifications SET is_read = TRUE, read_at = NOW()
    WHERE user_id = $1 AND type = 'message' AND from_user_id = $2 AND is_read = FALSE
    RETURNING *
  `,
    [userId, fromUserId],
  );
  return rows.map(mapNotificationRow);
}

async function markAllMessageNotificationsRead(userId) {
  const { rows } = await pool.query(
    `
    UPDATE app_notifications SET is_read = TRUE, read_at = NOW()
    WHERE user_id = $1 AND type = 'message' AND is_read = FALSE
    RETURNING *
  `,
    [userId],
  );
  return rows.map(mapNotificationRow);
}

async function deleteNotification(id, userId) {
  const { rows } = await pool.query(
    `
    DELETE FROM app_notifications
    WHERE id = $1 AND user_id = $2
    RETURNING *
  `,
    [id, userId],
  );
  return mapNotificationRow(rows[0]);
}

async function deleteAllNotifications(userId) {
  const { rows } = await pool.query(
    `
    DELETE FROM app_notifications
    WHERE user_id = $1
    RETURNING *
  `,
    [userId],
  );
  return rows.map(mapNotificationRow);
}

async function listContactMessages() {
  const { rows } = await pool.query(`
    SELECT * FROM app_contact_messages ORDER BY created_at DESC
  `);
  return rows.map(mapContactMessageRow);
}

async function createContactMessage(values) {
  const { rows } = await pool.query(
    `
    INSERT INTO app_contact_messages (
      id,
      name,
      email,
      phone,
      subject,
      message
    ) VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING *
  `,
    [values.id, values.name, values.email, values.phone, values.subject, values.message],
  );
  return mapContactMessageRow(rows[0]);
}

async function createPayment(values) {
  const { rows } = await pool.query(
    `
    INSERT INTO app_payments (
      id, type, related_id, user_id, provider_id, amount, currency, status, provider_payload, gateway_session
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *
  `,
    [
      values.id,
      values.type,
      values.relatedId || null,
      values.userId || null,
      values.providerId || null,
      values.amount,
      values.currency || "INR",
      values.status || "pending",
      values.providerPayload ? JSON.stringify(values.providerPayload) : null,
      values.gatewaySession || null,
    ],
  );
  return rows[0];
}

async function getPaymentById(id) {
  const { rows } = await pool.query("SELECT * FROM app_payments WHERE id = $1", [id]);
  return rows[0] || null;
}

async function updatePaymentStatus(id, status, gatewaySession) {
  const { rows } = await pool.query(
    `UPDATE app_payments SET status = $1, gateway_session = COALESCE($2, gateway_session), updated_at = NOW() WHERE id = $3 RETURNING *`,
    [status, gatewaySession || null, id],
  );
  return rows[0] || null;
}

async function updateContactMessage(id, values) {
  const clause = buildUpdateClause(values);
  if (!clause) {
    return getContactMessageById(id);
  }
  const { clause: setClause, values: params } = clause;
  const { rows } = await pool.query(
    `
    UPDATE app_contact_messages SET ${setClause}, updated_at = NOW()
    WHERE id = $${params.length + 1}
    RETURNING *
  `,
    [...params, id],
  );
  return mapContactMessageRow(rows[0]);
}

async function getContactMessageById(id) {
  const { rows } = await pool.query("SELECT * FROM app_contact_messages WHERE id = $1", [id]);
  return mapContactMessageRow(rows[0]);
}

async function deleteContactMessage(id) {
  await pool.query("DELETE FROM app_contact_messages WHERE id = $1", [id]);
}

async function countBookings() {
  const { rows } = await pool.query("SELECT COUNT(*) AS count FROM app_bookings");
  return Number(rows[0]?.count || 0);
}

async function getAverageProviderRating() {
  // Compute global average rating from individual reviews to reflect real customer feedback
  const { rows } = await pool.query(
    `SELECT AVG(rating)::numeric(3,2) AS avg_rating FROM app_reviews WHERE rating IS NOT NULL`
  );
  return rows[0] && rows[0].avg_rating ? Number(rows[0].avg_rating) : 0;
}

async function countUnreadNotifications() {
  const { rows } = await pool.query("SELECT COUNT(*) AS count FROM app_notifications WHERE is_read = FALSE");
  return Number(rows[0]?.count || 0);
}

async function createHurryRequest(values) {
  const { rows } = await pool.query(
    `
    INSERT INTO app_hurry_requests (
      id, customer_id, service, location, budget_min, budget_max, notes, status, matched_provider_id, expires_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *
  `,
    [
      values.id,
      values.customerId,
      values.service,
      values.location,
      values.budgetMin ?? null,
      values.budgetMax ?? null,
      values.notes || "",
      values.status || "pending",
      values.matchedProviderId || null,
      values.expiresAt || null,
    ],
  );
  return mapHurryRequestRow(rows[0]);
}

async function updateHurryRequest(id, updates) {
  const clause = buildUpdateClause(updates);
  if (!clause) return getHurryRequest(id);
  const { clause: setClause, values } = clause;
  const { rows } = await pool.query(
    `
    UPDATE app_hurry_requests SET ${setClause}, updated_at = NOW()
    WHERE id = $${values.length + 1}
    RETURNING *
  `,
    [...values, id],
  );
  return mapHurryRequestRow(rows[0]);
}

async function getHurryRequest(id) {
  const { rows } = await pool.query("SELECT * FROM app_hurry_requests WHERE id = $1", [id]);
  return mapHurryRequestRow(rows[0]);
}

async function listActiveHurryRequests(expiresAfter = new Date()) {
  const { rows } = await pool.query(
    `
    SELECT * FROM app_hurry_requests
    WHERE status = 'pending' AND (expires_at IS NULL OR expires_at > $1)
    ORDER BY created_at DESC
  `,
    [expiresAfter],
  );
  return rows.map(mapHurryRequestRow);
}

async function listHurryResponses(requestId) {
  const { rows } = await pool.query("SELECT * FROM app_hurry_responses WHERE request_id = $1 ORDER BY created_at ASC", [
    requestId,
  ]);
  return rows.map(mapHurryResponseRow);
}

async function addHurryResponse(values) {
  const { rows } = await pool.query(
    `
    INSERT INTO app_hurry_responses (id, request_id, provider_id, provider_user_id, status)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *
  `,
    [values.id, values.requestId, values.providerId, values.providerUserId, values.status],
  );
  return mapHurryResponseRow(rows[0]);
}

module.exports = {
  getUserByEmail,
  getUserById,
  getUserByResetTokenHash,
  getUsersByIds,
  listUsers,
  createUser,
  updateUser,
  setResetTokenForUser,
  clearResetTokenForUser,
  deleteUser,
  countUsers,
  listCategories,
  getCategoryById,
  getCategoryByName,
  createCategory,
  updateCategory,
  deleteCategory,
  countCategories,
  listProviders,
  getProviderById,
  getProviderByUserId,
  createProvider,
  updateProvider,
  deleteProvider,
  updateProviderCategoryName,
  countProviders,
  listReviewsByProvider,
  getReviewByProviderAndCustomer,
  upsertReview,
  recalculateProviderRating,
  createBooking,
  listBookingsForUser,
  hasCompletedBooking,
  countCompletedBookingsForProvider,
  listAllBookings,
  getBookingById,
  updateBookingStatus,
  countBookings,
  createMessage,
  getMessageById,
  listConversation,
  listMessagesForUser,
  listRecipients,
  updateMessageText,
  deleteMessage,
  listAllMessages,
  createNotification,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  markMessageNotificationsReadBySender,
  markAllMessageNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
  countUnreadNotifications,
  listContactMessages,
  createContactMessage,
  updateContactMessage,
  getContactMessageById,
  deleteContactMessage,
  createHurryRequest,
  updateHurryRequest,
  getHurryRequest,
  listActiveHurryRequests,
  listHurryResponses,
  addHurryResponse,
  // session helpers
  createSession,
  getSessionById,
  revokeSessionById,
  updateSessionExpiration,
  pruneExpiredSessions,
  createPayment,
  getPaymentById,
  updatePaymentStatus,
  getAverageProviderRating,
};







