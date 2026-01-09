import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type TourName = 'main' | 'venue' | 'drinkEditor';

interface TourState {
  completedTours: TourName[];
  runningTour: TourName | null;
}

interface TourContextType {
  state: TourState;
  startTour: (tourName: TourName) => void;
  completeTour: (tourName: TourName) => void;
  skipTour: (tourName: TourName) => void;
  resetTour: (tourName: TourName) => void;
  resetAllTours: () => void;
  hasCompletedTour: (tourName: TourName) => boolean;
  isRunning: (tourName: TourName) => boolean;
}

const STORAGE_KEY = 'cgi_tour_state';

const TourContext = createContext<TourContextType | undefined>(undefined);

function loadTourState(): TourState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        completedTours: parsed.completedTours || [],
        runningTour: null, // Never persist running state
      };
    }
  } catch (e) {
    console.error('Failed to load tour state:', e);
  }
  return { completedTours: [], runningTour: null };
}

function saveTourState(state: TourState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      completedTours: state.completedTours,
    }));
  } catch (e) {
    console.error('Failed to save tour state:', e);
  }
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TourState>(loadTourState);

  useEffect(() => {
    saveTourState(state);
  }, [state.completedTours]);

  const startTour = (tourName: TourName) => {
    setState(prev => ({ ...prev, runningTour: tourName }));
  };

  const completeTour = (tourName: TourName) => {
    setState(prev => ({
      completedTours: prev.completedTours.includes(tourName) 
        ? prev.completedTours 
        : [...prev.completedTours, tourName],
      runningTour: prev.runningTour === tourName ? null : prev.runningTour,
    }));
  };

  const skipTour = (tourName: TourName) => {
    // Same as complete - user explicitly chose to skip
    completeTour(tourName);
  };

  const resetTour = (tourName: TourName) => {
    setState(prev => ({
      ...prev,
      completedTours: prev.completedTours.filter(t => t !== tourName),
    }));
  };

  const resetAllTours = () => {
    setState({ completedTours: [], runningTour: null });
  };

  const hasCompletedTour = (tourName: TourName) => {
    return state.completedTours.includes(tourName);
  };

  const isRunning = (tourName: TourName) => {
    return state.runningTour === tourName;
  };

  return (
    <TourContext.Provider value={{
      state,
      startTour,
      completeTour,
      skipTour,
      resetTour,
      resetAllTours,
      hasCompletedTour,
      isRunning,
    }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
