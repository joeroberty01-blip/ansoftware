export default async function ComingSoonPage({
  searchParams,
}: {
  searchParams: Promise<{ feature?: string }>;
}) {
  const { feature } = await searchParams;
  const featureName = feature && feature.trim() ? feature : "This feature";

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          {featureName} is coming soon
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          We're still building this. Check back later.
        </p>
      </div>
    </div>
  );
}
