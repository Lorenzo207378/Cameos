import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ActorHeader from '../components/actor/ActorHeader.jsx';
import ActorBiography from '../components/actor/ActorBiography.jsx';
import ActorCameos from '../components/actor/ActorCameos.jsx';
import ActorFilmography from '../components/actor/ActorFilmography.jsx';
import '../css/actor/actorDetail.css';
import LoadingScreen from '../components/LoadingScreen.jsx';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { usePersonViewModel, useCameoViewModel } from "../viewmodel/index.js";
import { isExcludedMedia } from '../models/utils/index.js';
import { useMovieImagesReady } from '../utils/imageUtils.js';

export default function ActorDetail() {
  const { id } = useParams();
  const { langKey } = useTranslation();

  // Reset the profile, pending requests and biography state when the route or language changes.
  return <ActorProfile key={`${id}:${langKey}`} id={id} />;
}

function ActorProfile({ id }) {
  const navigate = useNavigate();
  const { t, normalizedLang, langKey } = useTranslation();
  const {
    personProfile,
    filmography,
    loading: vmLoading,
    error,
    loadPersonProfile,
    loadPersonFilmography
  } = usePersonViewModel({ language: normalizedLang });

  const {
    actorCameos,
    loadActorCameos
  } = useCameoViewModel({ language: normalizedLang });

  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [filmographyFailed, setFilmographyFailed] = useState(false);

  useEffect(() => {
    if (!id) return undefined;
    let active = true;

    // Wait for all operations: profile, filmography, and actor cameos
    Promise.all([
      loadPersonProfile(id, false, normalizedLang),
      loadPersonFilmography(id, { mediaType: 'all', sortBy: 'popularity', language: normalizedLang }),
      loadActorCameos(id, normalizedLang)
    ]).then(([, credits]) => {
      if (!active) return;
      setFilmographyFailed(!credits);
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [id, normalizedLang, loadPersonProfile, loadPersonFilmography, loadActorCameos]);

  const person = String(personProfile?.id) === String(id) ? personProfile : null;
  const profileSrc = person ? person.getProfileUrl(langKey) : null;
  const isImageReady = useMovieImagesReady(person ? String(person.id) : null, profileSrc);

  const handleGoBack = () => {
    navigate(window.history.state?.idx > 0 ? -1 : '/Cameos/movies');
  };

  if (isLoading || vmLoading || (person && !isImageReady)) {
    return <LoadingScreen />;
  }

  if (!person) {
    return (
      <div className="actor-detail-page w-100 p-4 text-center">
        <p role="alert" className="text-white">{t(error ? 'common.error' : 'common.noResults')}</p>
        <button type="button" onClick={handleGoBack} className="btn btn-outline-success rounded-pill">
          {t('detail.goBack')}
        </button>
      </div>
    );
  }

  // Exclude movies/series that appear in cameos from the filmography carousel
  const cameosList = (Array.isArray(actorCameos) ? actorCameos : []).filter((c) => !isExcludedMedia(c));
  const rawCredits = String(filmography.profile?.id) === String(id) ? (filmography.cast || []) : [];
  const cameoMediaIds = new Set(
    cameosList.map((c) => Number(c.mediaId || c.id)).filter(Boolean)
  );
  const credits = rawCredits.filter((item) => !cameoMediaIds.has(Number(item.id)));

  return (
    <div className="actor-detail-page w-100 px-3 px-md-4 px-xl-5 pt-2 pt-md-3 pb-5">
      <ActorHeader person={person} onGoBack={handleGoBack} className="mb-3 mb-md-4" />
      <ActorBiography person={person} className="mb-4 mb-md-5" />
      <ActorFilmography credits={credits} failed={filmographyFailed} />
      <ActorCameos cameos={cameosList} />
    </div>
  );
}