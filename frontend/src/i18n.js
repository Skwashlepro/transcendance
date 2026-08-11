import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const translations = {
  en: {
    app: { title: 'GameVault', tagline: 'Discover, review, and play in real time.' },
    nav: {
      home: 'Home',
      games: 'Browse Games',
      play: 'Play',
      friends: 'Friends',
      privacy: 'Privacy',
      terms: 'Terms',
      chat: 'Chat',
      profile: 'Profile',
      logout: 'Logout',
      signin: 'Sign In',
      signup: 'Sign Up',
      language: 'Language',
    },
    legal: {
      welcome: 'Welcome to GameVault',
      subtitle: 'Please review and accept the legal terms before continuing.',
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
      refuse: 'Refuse',
      accept: 'Accept and continue',
      required: 'Legal consent required',
      requiredText: 'You must accept the Privacy Policy and Terms of Service before using this platform.',
      reviewAgain: 'Review again',
      acceptNow: 'Accept now',
    },
    auth: {
      username: 'Username',
      email: 'Email',
      password: 'Password',
      usernameOrEmail: 'Username or Email',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      signingIn: 'Signing in...',
      creatingAccount: 'Creating account...',
      noAccount: "Don't have an account?",
      haveAccount: 'Already have an account?',
      signInAlt: 'Sign In',
      signUpAlt: 'Sign Up',
      submit: 'Submit',
    },
    play: {
      title: 'Pong Arena',
      connected: 'Connected',
      reconnecting: 'Reconnecting...',
      signInPrompt: 'Sign in to play multiplayer Pong',
      findOnline: 'Find Online Match',
      playAi: 'Play vs AI',
      searching: 'Searching for opponent...',
      queueTime: 'Queue time',
      cancel: 'Cancel',
      rematch: 'Rematch',
      backToMenu: 'Back to Menu',
      opponentDisconnected: 'Opponent disconnected',
      yourPongRecord: 'Your Pong Record',
      wins: 'Wins',
      losses: 'Losses',
      winRate: 'Win rate',
      recentMatches: 'Recent Matches',
      noMatches: 'No matches played yet.',
      noHistory: 'No matches played yet',
      vs: 'vs',
      status: 'Pong status',
      useControls: 'Use W/S or Arrow keys to move your paddle',
    },
    home: {
      publicLibrary: 'Public game library',
      browseGames: 'Browse Games',
      playPong: 'Play Pong',
      systemStatus: 'System status',
      realtimeConnected: 'Realtime connected',
      realtimeOffline: 'Realtime offline',
      apiLatency: 'API latency',
      liveLibrary: 'Live library',
      gamesLoaded: 'games loaded',
      autoRefresh: 'Auto-refreshes every 30 seconds',
      social: 'Friends & chat',
      signInUnlock: 'Sign in to unlock social live stats',
      socialInfo: 'Friends, chat, and online indicators',
      onlineOf: 'online',
      pending: 'pending',
      feature1Title: '🎮 Extensive Catalog',
      feature1Text: 'Browse a wide range of platform and genre experiences.',
      feature2Title: '⭐ Write Reviews',
      feature2Text: 'Share your opinions and rate games with detailed reviews.',
      feature3Title: '👥 Friends & Chat',
      feature3Text: 'Connect with gamers and discuss your favorite titles in real time.',
      feature4Title: '📊 Rankings',
      feature4Text: 'See what the community thinks about different games.',
      apiUnavailable: 'API unavailable',
    },
    aria: {
      skipToMain: 'Skip to main content',
      main: 'Main content',
      languageSelector: 'Language selector',
      legalConsent: 'Legal consent',
      pongCanvas: 'Pong game area',
    },
    misc: {
      notFound: '404 - Not Found',
      connected: 'connected',
      offline: 'offline',
      review: 'Review',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
    },
  },
  fr: {
    app: { title: 'GameVault', tagline: 'Découvrir, noter et jouer en temps réel.' },
    nav: {
      home: 'Accueil',
      games: 'Parcourir les jeux',
      play: 'Jouer',
      friends: 'Amis',
      privacy: 'Confidentialité',
      terms: 'Conditions',
      chat: 'Chat',
      profile: 'Profil',
      logout: 'Déconnexion',
      signin: 'Connexion',
      signup: 'Inscription',
      language: 'Langue',
    },
    legal: {
      welcome: 'Bienvenue sur GameVault',
      subtitle: 'Veuillez consulter et accepter les conditions avant de continuer.',
      privacyPolicy: 'Politique de confidentialité',
      termsOfService: 'Conditions d’utilisation',
      refuse: 'Refuser',
      accept: 'Accepter et continuer',
      required: 'Consentement légal requis',
      requiredText: 'Vous devez accepter la politique de confidentialité et les conditions avant d’utiliser cette plateforme.',
      reviewAgain: 'Revérifier',
      acceptNow: 'Accepter maintenant',
    },
    auth: {
      username: 'Nom d’utilisateur',
      email: 'E-mail',
      password: 'Mot de passe',
      usernameOrEmail: 'Nom d’utilisateur ou e-mail',
      signIn: 'Connexion',
      signUp: 'Inscription',
      signingIn: 'Connexion...',
      creatingAccount: 'Création du compte...',
      noAccount: 'Vous n’avez pas de compte ?',
      haveAccount: 'Vous avez déjà un compte ?',
      signInAlt: 'Se connecter',
      signUpAlt: 'Créer un compte',
      submit: 'Envoyer',
    },
    play: {
      title: 'Arène Pong',
      connected: 'Connecté',
      reconnecting: 'Reconnexion...',
      signInPrompt: 'Connectez-vous pour jouer au Pong multijoueur',
      findOnline: 'Trouver une partie en ligne',
      playAi: 'Jouer contre l’IA',
      searching: 'Recherche d’adversaire...',
      queueTime: 'Temps d’attente',
      cancel: 'Annuler',
      rematch: 'Revanche',
      backToMenu: 'Retour au menu',
      opponentDisconnected: 'Adversaire déconnecté',
      yourPongRecord: 'Votre dossier Pong',
      wins: 'Victoires',
      losses: 'Défaites',
      winRate: 'Taux de victoire',
      recentMatches: 'Matchs récents',
      noMatches: 'Aucun match joué pour le moment.',
      noHistory: 'Aucun match joué pour le moment',
      vs: 'contre',
      status: 'Statut Pong',
      useControls: 'Utilisez W/S ou les flèches pour bouger votre raquette',
    },
    home: {
      publicLibrary: 'Bibliothèque publique',
      browseGames: 'Parcourir les jeux',
      playPong: 'Jouer au Pong',
      systemStatus: 'État du système',
      realtimeConnected: 'Temps réel connecté',
      realtimeOffline: 'Temps réel hors ligne',
      apiLatency: 'Latence API',
      liveLibrary: 'Bibliothèque live',
      gamesLoaded: 'jeux chargés',
      autoRefresh: 'Actualisation toutes les 30 secondes',
      social: 'Amis et chat',
      signInUnlock: 'Connectez-vous pour accéder au statut social en direct',
      socialInfo: 'Amis, chat et présence en ligne',
      onlineOf: 'en ligne',
      pending: 'en attente',
      feature1Title: '🎮 Catalogue complet',
      feature1Text: 'Explorez un large éventail de jeux sur différentes plateformes et genres.',
      feature2Title: '⭐ Écrire des avis',
      feature2Text: 'Partagez votre avis et notez les jeux avec des critiques détaillées.',
      feature3Title: '👥 Amis et chat',
      feature3Text: 'Rencontrez des joueurs et discutez de vos jeux préférés en temps réel.',
      feature4Title: '📊 Classements',
      feature4Text: 'Découvrez ce que la communauté pense des différents jeux.',
      apiUnavailable: 'API indisponible',
    },
    aria: {
      skipToMain: 'Aller au contenu principal',
      main: 'Contenu principal',
      languageSelector: 'Sélecteur de langue',
      legalConsent: 'Consentement légal',
      pongCanvas: 'Zone de jeu Pong',
    },
    misc: {
      notFound: '404 - Introuvable',
      connected: 'connecté',
      offline: 'hors ligne',
      review: 'Avis',
      privacy: 'Politique de confidentialité',
      terms: 'Conditions d’utilisation',
    },
  },
  es: {
    app: { title: 'GameVault', tagline: 'Descubre, reseña y juega en tiempo real.' },
    nav: {
      home: 'Inicio',
      games: 'Juegos',
      play: 'Jugar',
      friends: 'Amigos',
      privacy: 'Privacidad',
      terms: 'Términos',
      chat: 'Chat',
      profile: 'Perfil',
      logout: 'Cerrar sesión',
      signin: 'Iniciar sesión',
      signup: 'Registrarse',
      language: 'Idioma',
    },
    legal: {
      welcome: 'Bienvenido a GameVault',
      subtitle: 'Revisa y acepta los términos legales antes de continuar.',
      privacyPolicy: 'Política de privacidad',
      termsOfService: 'Términos del servicio',
      refuse: 'Rechazar',
      accept: 'Aceptar y continuar',
      required: 'Se requiere consentimiento legal',
      requiredText: 'Debes aceptar la política de privacidad y los términos antes de usar la plataforma.',
      reviewAgain: 'Revisar otra vez',
      acceptNow: 'Aceptar ahora',
    },
    auth: {
      username: 'Usuario',
      email: 'Correo electrónico',
      password: 'Contraseña',
      usernameOrEmail: 'Usuario o correo',
      signIn: 'Iniciar sesión',
      signUp: 'Registrarse',
      signingIn: 'Iniciando sesión...',
      creatingAccount: 'Creando cuenta...',
      noAccount: '¿No tienes cuenta?',
      haveAccount: '¿Ya tienes cuenta?',
      signInAlt: 'Iniciar sesión',
      signUpAlt: 'Crear cuenta',
      submit: 'Enviar',
    },
    play: {
      title: 'Arena Pong',
      connected: 'Conectado',
      reconnecting: 'Reconectando...',
      signInPrompt: 'Inicia sesión para jugar Pong multijugador',
      findOnline: 'Buscar partida en línea',
      playAi: 'Jugar contra IA',
      searching: 'Buscando oponente...',
      queueTime: 'Tiempo de espera',
      cancel: 'Cancelar',
      rematch: 'Revancha',
      backToMenu: 'Volver al menú',
      opponentDisconnected: 'Oponente desconectado',
      yourPongRecord: 'Tu historial de Pong',
      wins: 'Victorias',
      losses: 'Derrotas',
      winRate: 'Porcentaje de victorias',
      recentMatches: 'Partidas recientes',
      noMatches: 'Todavía no hay partidas.',
      noHistory: 'Todavía no hay partidas',
      vs: 'contra',
      status: 'Estado de Pong',
      useControls: 'Usa W/S o flechas para mover tu pala',
    },
    home: {
      publicLibrary: 'Biblioteca pública',
      browseGames: 'Ver juegos',
      playPong: 'Jugar Pong',
      systemStatus: 'Estado del sistema',
      realtimeConnected: 'Tiempo real conectado',
      realtimeOffline: 'Tiempo real desconectado',
      apiLatency: 'Latencia de API',
      liveLibrary: 'Biblioteca en vivo',
      gamesLoaded: 'juegos cargados',
      autoRefresh: 'Se actualiza cada 30 segundos',
      social: 'Amigos y chat',
      signInUnlock: 'Inicia sesión para ver el estado social en vivo',
      socialInfo: 'Amigos, chat e indicadores en línea',
      onlineOf: 'en línea',
      pending: 'pendientes',
      feature1Title: '🎮 Catálogo amplio',
      feature1Text: 'Explora una gran variedad de juegos entre plataformas y géneros.',
      feature2Title: '⭐ Escribir reseñas',
      feature2Text: 'Comparte tu opinión y califica los juegos con reseñas detalladas.',
      feature3Title: '👥 Amigos y chat',
      feature3Text: 'Conecta con otros jugadores y habla de tus juegos favoritos en tiempo real.',
      feature4Title: '📊 Rankings',
      feature4Text: 'Descubre qué piensa la comunidad sobre los diferentes juegos.',
      apiUnavailable: 'API no disponible',
    },
    aria: {
      skipToMain: 'Saltar al contenido principal',
      main: 'Contenido principal',
      languageSelector: 'Selector de idioma',
      legalConsent: 'Consentimiento legal',
      pongCanvas: 'Área de juego Pong',
    },
    misc: {
      notFound: '404 - No encontrado',
      connected: 'conectado',
      offline: 'sin conexión',
      review: 'Reseña',
      privacy: 'Política de privacidad',
      terms: 'Términos del servicio',
    },
  },
};

const STORAGE_KEY = 'ft_transcendence_locale';
const defaultLocale = 'en';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored && translations[stored] ? stored : defaultLocale;
  });

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const value = useMemo(() => ({
    locale,
    setLocale,
    t: (key, fallback) => {
      const keys = key.split('.');
      let current = translations[locale];
      for (const part of keys) {
        if (!current || !(part in current)) {
          current = translations[defaultLocale];
          break;
        }
        current = current[part];
      }
      if (typeof current !== 'string') {
        return fallback || key;
      }
      return current;
    },
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider');
  }
  return context;
}

export function getAvailableLanguages() {
  return Object.keys(translations);
}
