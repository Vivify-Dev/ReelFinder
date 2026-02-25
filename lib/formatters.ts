export const formatYear = (dateString?: string) =>
  dateString ? new Date(dateString).getFullYear() : "—";

export const formatRuntime = (runtime?: number) => {
  if (!runtime || Number.isNaN(runtime)) return "—";
  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
};

export const formatRating = (rating?: number) =>
  typeof rating === "number" && rating > 0 ? rating.toFixed(1) : "–";
