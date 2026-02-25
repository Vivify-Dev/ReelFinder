import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MovieCard } from "@/components/movie-card";
import { RetryRefreshButton } from "@/components/retry-refresh-button";
import { tmdbProfileUrl } from "@/lib/tmdb-images";
import { PersonDetails } from "@/types/movies";

const getBaseUrl = () => {
  const raw =
    process.env.NEXT_PUBLIC_BASE_URL ??
    process.env.BASE_URL ??
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : undefined);
  if (!raw) {
    throw new Error("Base URL not configured for server fetch.");
  }

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("Base URL must be an absolute URL.");
  }

  url.hash = "";
  url.search = "";
  if (!url.pathname.endsWith("/")) {
    url.pathname += "/";
  }

  return url.toString();
};

type PersonFetchResult =
  | { status: "ok"; person: PersonDetails }
  | { status: "not_found" }
  | { status: "invalid" }
  | { status: "unavailable" };

async function getPerson(id: string): Promise<PersonFetchResult> {
  const base = getBaseUrl();
  const apiUrl = new URL(`api/person/${id}`, base);
  const res = await fetch(apiUrl.toString(), {
    next: { revalidate: 3600 },
  });

  if (res.status === 404) {
    return { status: "not_found" };
  }

  if (res.status === 400) {
    return { status: "invalid" };
  }

  if (res.status === 503) {
    return { status: "unavailable" };
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Person API request failed (status=${res.status}): ${body.slice(0, 200)}`
    );
  }

  return { status: "ok", person: (await res.json()) as PersonDetails };
}

type PersonPageProps = {
  params: { id?: string } | Promise<{ id?: string }>;
};

export default async function PersonPage(props: PersonPageProps) {
  const params = await props.params;
  const id = params?.id;

  if (!id) {
    notFound();
  }

  const raw = String(id ?? "");
  if (!/^\d+$/.test(raw)) {
    notFound();
  }

  const personResult = await getPerson(raw);

  if (
    personResult.status === "not_found" ||
    personResult.status === "invalid"
  ) {
    notFound();
  }

  if (personResult.status === "unavailable") {
    return (
      <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-white/10 bg-white/5 px-6 py-10 text-center text-muted-foreground">
        <h1 className="text-2xl font-semibold text-white">
          Temporarily unavailable
        </h1>
        <p className="text-sm text-muted-foreground">
          TMDB is having trouble right now. Please retry or head back.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <RetryRefreshButton />
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-cyan-400/70 hover:text-white"
          >
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  const person = personResult.person;
  const profileUrl = tmdbProfileUrl(person.profilePath, "w500");

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 shadow-2xl shadow-cyan-500/10">
        <div className="grid gap-6 px-6 py-8 sm:px-10 md:grid-cols-[240px,1fr]">
          <div className="relative mx-auto aspect-[2/3] w-full max-w-[240px] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950">
            {profileUrl ? (
              <Image
                src={profileUrl}
                alt={person.name}
                fill
                className="object-cover object-[50%_20%]"
                sizes="(max-width: 768px) 240px, 240px"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                No photo available
              </div>
            )}
          </div>

          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">
              {person.knownForDepartment || "Person"}
            </p>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              {person.name}
            </h1>
            {(person.birthday || person.placeOfBirth) && (
              <p className="text-sm text-foreground/80">
                {person.birthday ? `Born ${person.birthday}` : "Birth date unknown"}
                {person.placeOfBirth ? ` | ${person.placeOfBirth}` : ""}
              </p>
            )}
            <p className="max-w-3xl text-base leading-relaxed text-foreground/80">
              {person.biography?.trim() || "Biography is not available yet."}
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-foreground/80 transition hover:bg-white/10"
              >
                Back to search
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Movie credits</h2>
          <p className="text-sm text-muted-foreground">
            Recent and notable appearances
          </p>
        </div>

        {person.movieCredits && person.movieCredits.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {person.movieCredits.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-muted-foreground">
            Movie credits are not available for this person yet.
          </div>
        )}
      </section>
    </div>
  );
}

