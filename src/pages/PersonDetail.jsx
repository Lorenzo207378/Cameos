import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import PersonHeader from '../components/person/PersonHeader.jsx';
import PersonBiography from '../components/person/PersonBiography.jsx';
import PersonCameos from '../components/person/PersonCameos.jsx';
import PersonFimography from '../components/person/PersonFimography.jsx';
import '../css/actor/actorDetail.css';
import LoadingScreen from '../components/LoadingScreen.jsx';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { usePersonViewModel, useCameoViewModel } from "../viewmodel/index.js";
import { isExcludedMedia, resolveLocalizedImage, IMAGE_PLACEHOLDERS } from '../models/utils/index.js';
import { useImagesReady } from '../utils/imageUtils.js';
import { selectPersonCredits } from '../utils/personCredits.js';

export default function PersonDetail() {
  const { id } = useParams();
  const { langKey } = useTranslation();
  const [searchParams] = useSearchParams();

  // Reset the profile, pending requests and biography state when the route or language changes.
  return <PersonProfile key={`${id}:${langKey}`} id={id} creditsMode={searchParams.get('credits')} />;
}

function PersonProfile({ id, creditsMode }) {
  const [dataReady, setDataReady] = useState(false);
  const navigate = useNavigate();
  const { t, normalizedLang, langKey } = useTranslation();
  const {
    personProfile,
    filmography,
    loading: vmLoading,
    error,
    loadPersonFilmography
  } = usePersonViewModel({ language: normalizedLang });

  const {
    actorCameos,
    loadActorCameos
  } = useCameoViewModel({ language: normalizedLang });

  useEffect(() => {
    let active = true;
    if (id) {
      Promise.all([
        loadPersonFilmography(id, { mediaType: 'all', sortBy: 'popularity', language: normalizedLang }),
        loadActorCameos(id, normalizedLang)
      ]).then(() => { if (active) setDataReady(true); });
    }
    return () => { active = false; };
  }, [id, normalizedLang, loadPersonFilmography, loadActorCameos]);

  const person = String(personProfile?.id) === String(id) ? personProfile : null;
  const profileSrc = person ? person.getProfileUrl(langKey) : null;

  // Exclude movies/series that appear in cameos from the acting filmography carousel.
  // Creative credits remain visible even when the person also has a cameo in that media.
  const cameosList = (Array.isArray(actorCameos) ? actorCameos : []).filter((c) => !isExcludedMedia(c));
  const mode = creditsMode === 'cast' || creditsMode === 'crew'
    ? creditsMode : ['Directing', 'Writing'].includes(person?.knownForDepartment) ? 'crew' : 'cast';
  const credits = String(filmography.profile?.id) === String(id)
    ? selectPersonCredits(filmography, cameosList, mode) : [];
  const imageSources = [
    profileSrc,
    ...credits.map((item) => resolveLocalizedImage(item.posterUrl || item.poster_path, langKey, IMAGE_PLACEHOLDERS.POSTER)),
    ...cameosList.map((cameo) => cameo.getPosterUrl?.(langKey)
      || resolveLocalizedImage(cameo.posterUrl, langKey, IMAGE_PLACEHOLDERS.POSTER))
  ];
  const isImageReady = useImagesReady(dataReady && person ? String(person.id) : null, imageSources);

  const handleGoBack = () => {
    navigate(window.history.state?.idx > 0 ? -1 : '/Cameos/movies');
  };

  if (!dataReady || (!person && vmLoading)) {
    return <LoadingScreen />;
  }

  if (!vmLoading && !person) {
    return (
      <div className="actor-detail-page w-100 p-4 text-center">
        <p role="alert" className="text-white">{t(error ? 'common.error' : 'common.noResults')}</p>
        <button type="button" onClick={handleGoBack} className="btn btn-outline-success rounded-pill">
          {t('detail.goBack')}
        </button>
      </div>
    );
  }

  if (person && !isImageReady) {
    return <LoadingScreen />;
  }

  return (
    <div className="actor-detail-page w-100 px-3 px-md-4 px-xl-5 pt-2 pt-md-3 pb-5">
      <PersonHeader person={person} onGoBack={handleGoBack} className="mb-3 mb-md-4" />
      <PersonBiography person={person} className="mb-4 mb-md-5" />
      <PersonFimography credits={credits} failed={Boolean(error && !credits.length)} />
      <PersonCameos cameos={cameosList} />
    </div>
  );
}
