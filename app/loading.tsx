import {
  AppSurface,
  BodyText,
  Card,
  CardContent,
  CardTitle,
} from "@canopy/ui";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <AppSurface className="w-full max-w-xl px-6 py-6 sm:px-8 sm:py-8">
        <Card>
          <CardContent className="flex flex-col items-center px-6 py-10 text-center sm:px-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)]">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--ring)] border-t-transparent" />
            </div>
            <CardTitle className="mt-5 text-xl">Loading Canopy Create</CardTitle>
            <BodyText muted className="mt-2 max-w-md">
              Pulling in the latest workspace data and getting this view ready.
            </BodyText>
          </CardContent>
        </Card>
      </AppSurface>
    </div>
  );
}
