import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      app_name:            'Khargba',
      rocks:               'Rocks',
      date_pits:           'Date Pits',
      create_game:         'Create Game',
      available_games:     'Available Sessions',
      no_games:            'No open sessions',
      join_game:           'Join',
      waiting_for_opponent:'Waiting for opponent...',
      your_turn:           'Your Turn',
      opponent_turn:       'Opponent\'s Turn',
      you_win:             'Victory',
      you_lose:            'Defeated',
      logout:              'Logout',
      loading:             'Loading...',
      phase_placement:     'Placement Phase',
      phase_movement:      'Movement Phase',
    }
  },
  fr: {
    translation: {
      app_name:            'Khargba',
      rocks:               'Cailloux',
      date_pits:           'Noyaux de Dattes',
      create_game:         'Créer une partie',
      available_games:     'Sessions disponibles',
      no_games:            'Aucune session ouverte',
      join_game:           'Rejoindre',
      waiting_for_opponent:'En attente d\'un adversaire...',
      your_turn:           'Votre tour',
      opponent_turn:       'Tour de l\'adversaire',
      you_win:             'Victoire',
      you_lose:            'Défaite',
      logout:              'Déconnexion',
      loading:             'Chargement...',
      phase_placement:     'Phase de placement',
      phase_movement:      'Phase de mouvement',
    }
  },
  ar: {
    translation: {
      app_name:            'خربڤة',
      rocks:               'الحجارة',
      date_pits:           'نوى التمر',
      create_game:         'إنشاء مباراة',
      available_games:     'الجلسات المتاحة',
      no_games:            'لا توجد جلسات مفتوحة',
      join_game:           'انضمام',
      waiting_for_opponent:'بانتظار المنافس...',
      your_turn:           'دورك',
      opponent_turn:       'دور المنافس',
      you_win:             'فزت',
      you_lose:            'خسرت',
      logout:              'خروج',
      loading:             'جار التحميل...',
      phase_placement:     'طور التوضع',
      phase_movement:      'طور الحركة',
    }
  },
  tzm: {
    translation: {
      app_name:            'ⵅⴰⵔⴳⴱⴰ',
      rocks:               'ⵉⵥⵓⵔⴰⵏ',
      date_pits:           'ⵉⵖⵔⴷⴰ',
      create_game:         'ⵙⵏⴼⵍ ⴰⵎⵙⵓⴷⴷ',
      available_games:     'ⵉⵎⵙⵓⴷⴷⴰ ⵉⵍⵍⴰⵏ',
      no_games:            'ⵓⵔ ⵍⵍⵉⵏ ⵉⵎⵙⵓⴷⴷⴰ',
      join_game:           'ⴽⵛⵎ',
      waiting_for_opponent:'ⵔⴰⴷ ⵏⵙⵓⵔ...',
      your_turn:           'ⵜⵓⵔⴰ ⴰⴽ',
      opponent_turn:       'ⵜⵓⵔⴰ ⵏ ⵓⵎⵙⵇⴰⵔ',
      you_win:             'ⵜⵓⵙⵉⴷ',
      you_lose:            'ⵜⵅⵙⴰⵔⴷ',
      logout:              'ⴼⴼⵖ',
      loading:             'ⵉⵜⵜⵓⵔⵉⴷ...',
      phase_placement:     'ⴰⵣⵎⵣ ⵏ ⵓⵙⵙⵉⴷ',
      phase_movement:      'ⴰⵣⵎⵣ ⵏ ⵓⵙⵔⴰⵔ',
    }
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng:           localStorage.getItem('i18nextLng') || 'ar',
    fallbackLng:   'ar',
    interpolation: { escapeValue: false },
  });

export default i18n;
