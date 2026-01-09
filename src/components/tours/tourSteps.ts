import { Step } from 'react-joyride';

// Main navigation tour steps for different roles
export function getMainTourSteps(role: string): Step[] {
  const baseSteps: Step[] = [
    {
      target: '[data-tour="sidebar-header"]',
      content: 'Üdvözlünk a Come Get It Partner Dashboardban! Ez a rövid bemutató végigvezet a fő funkciókon.',
      title: 'Üdvözlünk! 👋',
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '[data-tour="nav-dashboard"]',
      content: 'Ez a főoldal, ahol áttekintheted a rendszer állapotát és a legfontosabb mutatókat.',
      title: 'Dashboard',
      placement: 'right',
    },
    {
      target: '[data-tour="nav-redemptions"]',
      content: 'Itt látod az összes ingyenes ital beváltást valós időben.',
      title: 'Beváltások',
      placement: 'right',
    },
  ];

  // Role-specific steps
  if (role === 'cgi_admin') {
    return [
      ...baseSteps,
      {
        target: '[data-tour="nav-venues"]',
        content: 'Itt kezelheted az összes venue-t, új helyszínt hozhatsz létre és szerkesztheted őket.',
        title: 'Helyszínek',
        placement: 'right',
      },
      {
        target: '[data-tour="nav-analytics"]',
        content: 'Részletes statisztikák és grafikonok a venue-k teljesítményéről.',
        title: 'Analitika',
        placement: 'right',
      },
      {
        target: '[data-tour="nav-notifications"]',
        content: 'Push értesítések küldése a felhasználóknak.',
        title: 'Értesítések',
        placement: 'right',
      },
      {
        target: '[data-tour="role-switcher"]',
        content: 'Admin-ként megnézheted, hogyan látják a dashboardot a venue ownerek és staffok.',
        title: 'Szerepkör előnézet',
        placement: 'top',
      },
      {
        target: '[data-tour="help-button"]',
        content: 'Bármikor újraindíthatod ezt a bemutatót erre a gombra kattintva.',
        title: 'Súgó',
        placement: 'top',
      },
    ];
  }

  if (role === 'venue_owner') {
    return [
      ...baseSteps,
      {
        target: '[data-tour="nav-rewards"]',
        content: 'Állítsd be a vendégeknek járó jutalmakat.',
        title: 'Jutalmak',
        placement: 'right',
      },
      {
        target: '[data-tour="nav-settings"]',
        content: 'Személyre szabhatod a helyszíned beállításait.',
        title: 'Beállítások',
        placement: 'right',
      },
      {
        target: '[data-tour="help-button"]',
        content: 'Bármikor újraindíthatod ezt a bemutatót erre a gombra kattintva.',
        title: 'Súgó',
        placement: 'top',
      },
    ];
  }

  // Staff tour
  return [
    ...baseSteps,
    {
      target: '[data-tour="help-button"]',
      content: 'Bármikor újraindíthatod ezt a bemutatót erre a gombra kattintva.',
      title: 'Súgó',
      placement: 'top',
    },
  ];
}

// Venue detail page tour
export const venueTourSteps: Step[] = [
  {
    target: '[data-tour="venue-header"]',
    content: 'Itt látod a helyszín alapadatait: név, cím, elérhetőségek és aktuális státusz.',
    title: 'Helyszín áttekintés',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="kpi-cards"]',
    content: 'Valós idejű statisztikák a helyszínről: forgalom, beváltások, aktív vendégek.',
    title: 'Mutatók',
    placement: 'bottom',
  },
  {
    target: '[data-tour="free-drinks-tab"]',
    content: 'Itt kezelheted az ingyenes ital ajánlatokat és időablakokat.',
    title: 'Ingyenes italok',
    placement: 'bottom',
  },
  {
    target: '[data-tour="schedule-grid"]',
    content: 'A kiemelt cellák jelzik, mikor érhető el az ingyenes ital. A sorok a napokat, az oszlopok az órákat jelölik.',
    title: 'Időbeosztás',
    placement: 'top',
  },
  {
    target: '[data-tour="edit-button"]',
    content: 'Kattints ide a venue adatainak és az ingyenes ital beállítások módosításához.',
    title: 'Szerkesztés',
    placement: 'left',
  },
];

// Drink editor tour (in VenueFormModal)
export const drinkEditorTourSteps: Step[] = [
  {
    target: '[data-tour="drinks-tab"]',
    content: 'Ezen a lapon kezelheted a venue italait és az ingyenes ital időablakokat.',
    title: 'Italok kezelése',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="free-drink-checkbox"]',
    content: 'Jelöld be, ha ezt az italt ingyenesként akarod ajánlani a megadott időablakokban.',
    title: 'Ingyenes ital',
    placement: 'right',
  },
  {
    target: '[data-tour="add-time-window"]',
    content: 'Több időablakra akkor van szükség, ha az ingyenes ital különböző időszakokban érhető el (pl. reggel 10-12 ÉS este 18-21).',
    title: 'Időablak hozzáadása',
    placement: 'top',
  },
  {
    target: '[data-tour="day-selector"]',
    content: 'Válaszd ki, mely napokon legyen elérhető az ingyenes ital ebben az időablakban.',
    title: 'Napválasztó',
    placement: 'top',
  },
];
