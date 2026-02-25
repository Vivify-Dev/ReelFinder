"use client";

import Image from "next/image";
import Link from "next/link";
import { PersonSummary } from "@/types/movies";
import { tmdbProfileUrl } from "@/lib/tmdb-images";

type Props = {
  person: PersonSummary;
};

export function PersonCard({ person }: Props) {
  const profileUrl = tmdbProfileUrl(person.profilePath, "w342");

  return (
    <Link
      href={`/person/${person.id}`}
      prefetch={false}
      className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg shadow-cyan-500/10 transition hover:-translate-y-1 hover:border-cyan-400/40"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-gradient-to-b from-slate-800 to-slate-950">
        {profileUrl ? (
          <Image
            src={profileUrl}
            alt={person.name}
            fill
            className="object-cover transition duration-500 group-hover:scale-105 group-hover:opacity-90"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 220px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            No photo
          </div>
        )}
      </div>
      <div className="space-y-2 px-4 pb-4 pt-3">
        <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-white">
          {person.name}
        </h3>
        <p className="text-xs uppercase tracking-wide text-cyan-200">
          {person.knownForDepartment || "Person"}
        </p>
        {person.knownForTitles && person.knownForTitles.length > 0 && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            Known for: {person.knownForTitles.slice(0, 2).join(", ")}
          </p>
        )}
      </div>
    </Link>
  );
}
