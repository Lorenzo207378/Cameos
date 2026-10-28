import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ActorHeader from '../components/actor/ActorHeader.jsx';
import ActorBiography from '../components/actor/ActorBiography.jsx';
import ActorCameos from '../components/actor/ActorCameos.jsx';
import ActorFilmography from '../components/actor/ActorFilmography.jsx';
import '../css/actor/actorDetail.css';
import LoadingScreen from '../components/LoadingScreen.jsx';
//import { getPersonById, CATALOG_PERSON_STAN_LEE } from '../data/catalogData.js';
import { useTranslation } from '../utils/translations.js';
import { usePersonViewModel } from "../viewmodel/index.js";

export default function ActorDetail() {
  const { id } = useParams();
  const { langKey } = useTranslation();

  // Reset the profile, pending requests and biography state when the route or language changes.
  return <ActorProfile key={`${id}:${langKey}`} id={id} />;
}

function ActorProfile({ id }) {
  const navigate = useNavigate();
  const { t, normalizedLang } = useTranslation();
  const {
    personProfile,
    filmography,
    error,
    loadPersonProfile,
    loadPersonFilmography
  } = usePersonViewModel({ language: normalizedLang });
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [filmographyFailed, setFilmographyFailed] = useState(false);

  useEffect(() => {
    if (!id) return undefined;
    let active = true;

    // Wait for both operations: the ViewModel loading flag is shared by concurrent requests.
    Promise.all([
      loadPersonProfile(id, false, normalizedLang),
      loadPersonFilmography(id, { mediaType: 'all', sortBy: 'popularity', language: normalizedLang })
    ]).then(([, credits]) => {
      if (!active) return;
      setFilmographyFailed(!credits);
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [id, normalizedLang, loadPersonProfile, loadPersonFilmography]);

  const person = String(personProfile?.id) === String(id) ? personProfile : null;
  const handleGoBack = () => {
    navigate(window.history.state?.idx > 0 ? -1 : '/Cameos/movies');
  };

  if (isLoading) return <LoadingScreen />;

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

  // Movie credits and TV credits
  const credits = String(filmography.profile?.id) === String(id) ? filmography.cast : [];

  return (
    <div className="actor-detail-page w-100 px-3 px-md-4 px-xl-5 py-4 pb-5">
      <div className="actor-detail-header d-flex flex-column align-items-start gap-3 gap-md-4 mb-4">
        {/* PULSANTE INDIETRO CIRCOLARE */}
        <button
          type="button"
          onClick={handleGoBack}
          className="btn btn-dark rounded-circle d-flex align-items-center justify-content-center back-btn flex-shrink-0"
          aria-label={t('detail.goBack')}
          title={t('detail.goBack')}
        >
          <i className="bi bi-arrow-left text-white fs-5" />
        </button>
        <ActorHeader person={person} />
      </div>
      <ActorBiography person={person} />
      <ActorCameos cameos={person.careerCameos} />
      <ActorFilmography credits={credits} failed={filmographyFailed} />
    </div>
  );
}
