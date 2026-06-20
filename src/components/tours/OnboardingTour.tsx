import Joyride, { CallBackProps, STATUS, ACTIONS, EVENTS } from 'react-joyride';
import { useTour } from '@/contexts/TourContext';
import { getMainTourSteps, venueTourSteps, drinkEditorTourSteps } from './tourSteps';
import { useIsMobile } from '@/hooks/use-mobile';

interface OnboardingTourProps {
  tourName: 'main' | 'venue' | 'drinkEditor';
  role?: string;
}

// Custom styles to match the CGI dark theme
const tourStyles = {
  options: {
    primaryColor: 'hsl(45, 93%, 47%)', // cgi-primary gold color
    backgroundColor: 'hsl(240, 6%, 10%)', // cgi-surface
    textColor: 'hsl(0, 0%, 98%)', // cgi-surface-foreground
    overlayColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: 10000,
    arrowColor: 'hsl(240, 6%, 10%)',
  },
  tooltip: {
    borderRadius: '8px',
    padding: '16px',
  },
  tooltipContainer: {
    textAlign: 'left' as const,
  },
  tooltipTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  tooltipContent: {
    fontSize: '14px',
    lineHeight: '1.5',
  },
  buttonNext: {
    backgroundColor: 'hsl(45, 93%, 47%)',
    color: 'hsl(240, 10%, 4%)',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
  },
  buttonBack: {
    color: 'hsl(0, 0%, 98%)',
    marginRight: '8px',
  },
  buttonSkip: {
    color: 'hsl(240, 5%, 65%)',
  },
  spotlight: {
    borderRadius: '8px',
  },
  beacon: {
    display: 'none', // Disable beacons, we use disableBeacon on first step
  },
};

// Hungarian locale
const locale = {
  back: 'Vissza',
  close: 'Bezárás',
  last: 'Befejezés',
  next: 'Következő',
  skip: 'Kihagyás',
};

export function OnboardingTour({ tourName, role = 'venue_staff' }: OnboardingTourProps) {
  const { isRunning, completeTour, skipTour } = useTour();
  const isMobile = useIsMobile();

  const run = isRunning(tourName);

  // Compute a safe fixed pixel width for mobile (Joyride needs numeric width).
  const mobileWidth =
    typeof window !== 'undefined'
      ? Math.min(window.innerWidth - 24, 360)
      : 320;

  // Mobile-optimized styles
  const mobileStyles = {
    ...tourStyles,
    options: {
      ...tourStyles.options,
      width: mobileWidth,
    },
    tooltip: {
      ...tourStyles.tooltip,
      width: mobileWidth,
      maxWidth: mobileWidth,
      padding: '14px',
      boxSizing: 'border-box' as const,
    },
    tooltipTitle: {
      ...tourStyles.tooltipTitle,
      fontSize: '15px',
      marginBottom: '6px',
    },
    tooltipContent: {
      ...tourStyles.tooltipContent,
      fontSize: '13px',
      lineHeight: '1.45',
      padding: '4px 0',
    },
    buttonNext: {
      ...tourStyles.buttonNext,
      fontSize: '13px',
      padding: '8px 12px',
    },
    buttonBack: {
      ...tourStyles.buttonBack,
      fontSize: '13px',
    },
    buttonSkip: {
      ...tourStyles.buttonSkip,
      fontSize: '13px',
      padding: '8px 8px',
    },
  };

  // Get the appropriate steps based on tour name
  const getSteps = () => {
    let steps;
    switch (tourName) {
      case 'main':
        steps = getMainTourSteps(role);
        break;
      case 'venue':
        steps = venueTourSteps;
        break;
      case 'drinkEditor':
        steps = drinkEditorTourSteps;
        break;
      default:
        return [];
    }

    // On mobile, force center placement so tooltips never overflow viewport.
    if (isMobile) {
      return steps.map((s) => ({ ...s, placement: 'center' as const }));
    }
    return steps;
  };

  const handleCallback = (data: CallBackProps) => {
    const { status, action, type } = data;

    // Tour finished or skipped
    if (status === STATUS.FINISHED) {
      completeTour(tourName);
    } else if (status === STATUS.SKIPPED) {
      skipTour(tourName);
    }

    // Handle close button click
    if (action === ACTIONS.CLOSE && type === EVENTS.STEP_AFTER) {
      skipTour(tourName);
    }
  };

  return (
    <Joyride
      steps={getSteps()}
      run={run}
      continuous
      showProgress={!isMobile}
      showSkipButton
      scrollToFirstStep
      spotlightClicks
      disableOverlayClose
      disableScrollParentFix
      styles={isMobile ? mobileStyles : tourStyles}
      locale={locale}
      callback={handleCallback}
      scrollOffset={100}
      floaterProps={{
        disableAnimation: false,
        placement: isMobile ? 'center' : 'auto',
        styles: isMobile
          ? {
              floater: { maxWidth: '100vw' },
              floaterWithAnimation: { maxWidth: '100vw' },
            }
          : undefined,
      }}
    />
  );
}
