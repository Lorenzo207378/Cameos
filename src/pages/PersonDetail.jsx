import { useGoBack, useScrollToTop } from '../utils/domUtils.js';
import { APP_ROUTES } from '../utils/appRoutes.js';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import PersonHeader from '../components/person/PersonHeader.jsx';
import PersonBiography from '../components/person/PersonBiography.jsx';
import PersonCameos from '../components/person/PersonCameos.jsx';
import PersonFilmography from '../components/person/PersonFilmography.jsx';
import '../css/common/carouselControls.css';
import '../css/actor/actorDetail.css';
import LoadingScreen from '../components/LoadingScreen.jsx';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { usePersonViewModel, useCameoViewModel } from "../viewmodel/index.js";
import { useImagesReady } from '../utils/imageUtils.js';

export default function PersonDetail() {
  const { id } = useParams();
  const { langKey } = useTranslation();

  // Reset the profile, pending requests and biography state when the route or language changes.
  return <PersonProfile key={`${id}:${langKey}`} id={id} />;
}

function PersonProfile({ id }) {
  const [dataReady, setDataReady] = useState(false);
  const { t, normalizedLang, langKey } = useTranslation();
  const personViewModel = usePersonViewModel({ language: normalizedLang });
  const cameoViewModel = useCameoViewModel({ language: normalizedLang });

  const {
    loading: vmLoading,
    error,
    loadPersonFilmography,
    getPersonPageData
  } = personViewModel;

  const {
    actorCameos,
    loadActorCameos
  } = cameoViewModel;

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

  const { person, cameos: cameosList, credits, creativeCredits, imageSources } = getPersonPageData(id, actorCameos, { language: langKey });
  const isImageReady = useImagesReady(dataReady && person ? String(person.id) : null, imageSources);
  const isPersonReady = Boolean(person && isImageReady && dataReady);

  useScrollToTop(id, isPersonReady);

  const goBack = useGoBack(APP_ROUTES.movies);

  if (!dataReady || (!person && vmLoading)) {
    return <LoadingScreen />;
  }

  if (!vmLoading && !person) {
    return (
      <div className="actor-detail-page w-100 p-4 text-center">
        <p role="alert" className="text-white">{t(error ? 'common.error' : 'common.noResults')}</p>
        <button type="button" onClick={goBack} className="btn btn-outline-success rounded-pill">
          {t('detail.goBack')}
        </button>
      </div>
    );
  }

  if (person && !isImageReady) {
    return <LoadingScreen />;
  }

  return (
    <div className="actor-detail-page w-100 carousel-page-padding carousel-page-padding-compact pt-2 pt-md-3 pb-5">
      <PersonHeader person={person} onGoBack={goBack} className="mb-3 mb-md-4" />
      <PersonBiography person={person} className="mb-4 mb-md-5" />
      <PersonFilmography credits={credits} failed={Boolean(error && !credits.length && !creativeCredits.length)} />
      <PersonCameos cameos={cameosList} />
      <PersonFilmography credits={creativeCredits} title={t('detail.directingAndWriting')} rows={1} />
    </div>
  );
}
