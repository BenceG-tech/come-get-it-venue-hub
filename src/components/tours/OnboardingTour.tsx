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

  // Determine whether a step targets an element inside the (mobile) sidebar drawer.
  const isSidebarTarget = (target: unknown): boolean => {
    if (typeof target !== 'string') return false;
    return (
      target.includes('data-tour="sidebar-header"') ||
      target.includes('data-tour="nav-') ||
      target.includes('data-tour="help-button"') ||
      target.includes('data-tour="role-switcher"')
    );
  };

  // Get the appropriate steps based on tour name
  const getSteps = () => {
    switch (tourName) {
      case 'main':
        return getMainTourSteps(role);
      case 'venue':
        return venueTourSteps;
      case 'drinkEditor':
        return drinkEditorTourSteps;
      default:
        return [];
    }
  };

  const steps = getSteps();

  const handleCallback = (data: CallBackProps) => {
    const { status, action, type, index, step } = data;

    // Tour finished or skipped — close the mobile sidebar if it was opened by the tour.
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      if (isMobile) window.dispatchEvent(new CustomEvent('cgi:close-mobile-sidebar'));
      if (status === STATUS.FINISHED) completeTour(tourName);
      else skipTour(tourName);
      return;
    }

    // Handle close button click
    if (action === ACTIONS.CLOSE && type === EVENTS.STEP_AFTER) {
      if (isMobile) window.dispatchEvent(new CustomEvent('cgi:close-mobile-sidebar'));
      skipTour(tourName);
      return;
    }

    // Before each step on mobile, open or close the sidebar depending on whether the
    // upcoming target lives inside it. This makes the spotlight actually land on the
    // correct element instead of an empty viewport edge.
    if (isMobile && type === EVENTS.STEP_BEFORE) {
      const currentStep = step ?? steps[index];
      if (currentStep && isSidebarTarget(currentStep.target)) {
        window.dispatchEvent(new CustomEvent('cgi:open-mobile-sidebar'));
      } else {
        window.dispatchEvent(new CustomEvent('cgi:close-mobile-sidebar'));
      }
    }
  };

  return (
    <Joyride
      steps={steps}
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
        placement: 'auto',
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
