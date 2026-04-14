"use client";

import {
  AppSurface,
  BodyText,
  Button,
  Card,
  CardContent,
  CardTitle,
} from "@canopy/ui";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <AppSurface className="w-full max-w-xl px-6 py-6 sm:px-8 sm:py-8">
        <Card>
          <CardContent className="px-6 py-10 text-center sm:px-8">
            <CardTitle className="text-xl">
              Something went wrong loading this data.
            </CardTitle>
            <BodyText muted className="mt-3">
              The page hit an unexpected problem. Try again and we&apos;ll reload
              the latest workspace state.
            </BodyText>
            <div className="mt-6 flex justify-center">
              <Button type="button" onClick={() => reset()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </AppSurface>
    </div>
  );
}
