export default async function ComingSoonPage({
  searchParams,
}: {
  searchParams: Promise<{ feature?: string }>;
}) {
  const { feature } = await searchParams;
  const featureName = feature && feature.trim() ? feature : "Kipengele hiki";

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-zinc-900">
          {featureName} — Kipengele hiki kinakuja hivi karibuni
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Tunakiendeleza. Rudi baadaye.
        </p>
      </div>
    </div>
  );
}
