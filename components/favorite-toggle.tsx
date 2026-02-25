"use client";

import { MovieSummary } from "@/types/movies";
import { useFavorites } from "./favorites-provider";
import { HeartIcon } from "./ui/icons";

type Props = {
  movie: MovieSummary;
};

export function FavoriteToggle({ movie }: Props) {
  const { isFavorite, toggleFavorite, ready } = useFavorites();
  const favorite = isFavorite(movie.id);

  return (
    <button
      type="button"
      disabled={!ready}
      onClick={() => toggleFavorite(movie)}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
        favorite
          ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
          : "bg-white/10 text-white hover:border-cyan-400/60 hover:bg-white/20"
      }`}
      aria-pressed={favorite}
    >
      <HeartIcon
        className={`h-4 w-4 ${favorite ? "text-white" : "text-rose-300"}`}
      />
      {favorite ? "Saved" : "Add to Favorites"}
    </button>
  );
}
