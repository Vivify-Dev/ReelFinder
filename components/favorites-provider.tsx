"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { MovieSummary } from "@/types/movies";

type FavoritesContextValue = {
  favorites: MovieSummary[];
  isFavorite: (id: number) => boolean;
  toggleFavorite: (movie: MovieSummary) => void;
  removeFavorite: (id: number) => void;
  ready: boolean;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const STORAGE_KEY = "reelfinder:favorites";

const readFavorites = (): MovieSummary[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as MovieSummary[]) : [];
  } catch (error) {
    console.warn("Failed to read favorites from storage", error);
    return [];
  }
};

export const FavoritesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [favorites, setFavorites] = useState<MovieSummary[]>(() => readFavorites());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Mark hydration complete so UI can safely interact with localStorage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    }
  }, [favorites, ready]);

  const toggleFavorite = (movie: MovieSummary) => {
    setFavorites((prev) => {
      const exists = prev.some((item) => item.id === movie.id);
      return exists
        ? prev.filter((item) => item.id !== movie.id)
        : [...prev, movie];
    });
  };

  const removeFavorite = (id: number) => {
    setFavorites((prev) => prev.filter((item) => item.id !== id));
  };

  const value = useMemo(
    () => ({
      favorites,
      isFavorite: (id: number) => favorites.some((fav) => fav.id === id),
      toggleFavorite,
      removeFavorite,
      ready,
    }),
    [favorites, ready]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return context;
};
