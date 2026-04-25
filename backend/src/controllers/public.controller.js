const {
  countProviders,
  countBookings,
  getAverageProviderRating,
} = require("../db/repository");

async function publicStats(req, res) {
  const [providersCount, bookingsCount, averageRating] = await Promise.all([
    countProviders(),
    countBookings(),
    getAverageProviderRating(),
  ]);

  return res.json({
    stats: {
      providersCount,
      bookingsCount,
      averageRating,
    },
  });
}

module.exports = {
  publicStats,
};
