const GENERIC_SEASON_NAME_REGEX = /^(stagione|season)\s+\d+$/i;

/** Preserve custom season titles while delegating generic labels to localized UI formatting. */
function normalizeSeasonName(name) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed || GENERIC_SEASON_NAME_REGEX.test(trimmed)) return null;
  return trimmed;
}

/** Identify the next season using the existing premiere and returning-series rules. */
export function findUpcomingSeason(item, detail, today) {
  const firstAir = String(item.firstAirDate || item.first_air_date || detail.first_air_date || '').slice(0, 10);
  if (firstAir && firstAir > today) {
    const firstSeason = (detail.seasons || []).find((season) => (season.season_number ?? season.seasonNumber) === 1);
    return {
      seasonNumber: 1,
      name: normalizeSeasonName(firstSeason?.name),
      airDate: firstSeason?.air_date || firstAir
    };
  }

  // Check returning series for an upcoming season premiere or future season
  const futureSeason = (detail.seasons || []).find(
    (season) => (season.season_number ?? season.seasonNumber) > 1 && season.air_date && season.air_date >= today
  );
  if (futureSeason) {
    const seasonNumber = futureSeason.season_number ?? futureSeason.seasonNumber;
    return { seasonNumber, name: normalizeSeasonName(futureSeason.name), airDate: futureSeason.air_date };
  }

  const nextEpisode = detail.next_episode_to_air;
  if (nextEpisode && nextEpisode.episode_number === 1 && nextEpisode.season_number > 1 && nextEpisode.air_date >= today) {
    return {
      seasonNumber: nextEpisode.season_number,
      name: null,
      airDate: nextEpisode.air_date
    };
  }
  return null;
}
