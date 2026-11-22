import * as db from '../db.js';

export const obtener = () => db.ajuste('perfil', null);
export const guardar = (perfil) => db.fijarAjuste('perfil', perfil);
export const onboardingHecho = () => db.ajuste('onboarding', false);
export const marcarOnboarding = () => db.fijarAjuste('onboarding', true);
