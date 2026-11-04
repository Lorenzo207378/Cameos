/** Identify the next season using the existing premiere and returning-series rules. */
export function findUpcomingSeason(item, detail, today) {
  const firstAir = String(item.firstAirDate || item.first_air_date || detail.first_air_date || '').slice(0, 10);
  if (firstAir && firstAir > today) {
    const firstSeason = (detail.seasons || []).find((season) => (season.season_number ?? season.seasonNumber) === 1);
    return {
      seasonNumber: 1,
      name: firstSeason?.name || 'Stagione 1',
      airDate: firstSeason?.air_date || firstAir
    };
  }

  // Check returning series for an upcoming season premiere or future season
  const futureSeason = (detail.seasons || []).find(
    (season) => (season.season_number ?? season.seasonNumber) > 1 && season.air_date && season.air_date >= today
  );
  if (futureSeason) {
    const seasonNumber = futureSeason.season_number ?? futureSeason.seasonNumber;
    return { seasonNumber, name: futureSeason.name || `Stagione ${seasonNumber}`, airDate: futureSeason.air_date };
  }

  const nextEpisode = detail.next_episode_to_air;
  if (nextEpisode && nextEpisode.episode_number === 1 && nextEpisode.season_number > 1 && nextEpisode.air_date >= today) {
    return {
      seasonNumber: nextEpisode.season_number,
      name: `Stagione ${nextEpisode.season_number}`,
      airDate: nextEpisode.air_date
    };
  }
  return null;
}
