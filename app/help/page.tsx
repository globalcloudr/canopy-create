import Link from "next/link";
import { BodyText, Button, Card, CardTitle } from "@globalcloudr/canopy-ui";
import SchoolShell from "@/app/_components/school-shell";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-[1.4rem] font-bold tracking-[-0.02em] text-[var(--foreground)]">{title}</h2>
      {children}
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[13px] font-bold text-white">
        {number}
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="font-semibold text-[var(--foreground)]">{title}</p>
        <BodyText muted className="mt-1 text-[14px]">{description}</BodyText>
      </div>
    </div>
  );
}

function Faq({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="py-4">
      <p className="font-semibold text-[var(--foreground)]">{question}</p>
      <BodyText muted className="mt-1.5 text-[14px]">{answer}</BodyText>
    </div>
  );
}

export default function HelpPage() {
  return (
    <SchoolShell activeNav="help">
      <div className="mx-auto max-w-3xl space-y-10">

        <div className="border-b border-[var(--border)] pb-6">
          <p className="text-[0.8rem] font-semibold uppercase tracking-widest text-[var(--accent)]">Help</p>
          <h1 className="mt-1 text-[2rem] font-bold tracking-[-0.02em] text-[var(--foreground)]">User guide</h1>
          <p className="mt-2 text-[var(--muted-foreground)]">Learn how to request, track, and approve creative and digital work</p>
        </div>

        <Section title="How Canopy Create works">
          <Card padding="md" className="border border-[var(--rule)] bg-transparent shadow-none sm:p-8">
            <BodyText className="mb-6 text-[15px]">
              Canopy Create is your school's creative services hub. Submit design, web, or content requests
              and track them from intake through final delivery — all without email chains or spreadsheets.
            </BodyText>
            <div className="space-y-5">
              <Step number={1} title="Submit a request" description="Choose a request type — design project, website update, newsletter, or social content — and fill in the structured intake form. The more detail you provide, the faster production can begin." />
              <Step number={2} title="Internal review" description="The Canopy creative team reviews your request, asks any clarifying questions, and converts it into a production project with milestones and deliverables." />
              <Step number={3} title="Production" description="Work moves through milestones — research, concept, design, development, or content creation — depending on the project type. You can track progress from the project detail page." />
              <Step number={4} title="Review proofs" description="When a deliverable is ready for review, you'll be notified. Open the deliverable to view the proof, then approve it or request changes with notes." />
              <Step number={5} title="Final delivery" description="Once all deliverables are approved, final files are made available for download from the project page." />
            </div>
          </Card>
        </Section>

        <Section title="Getting started">
          <Card padding="md" className="border border-[var(--rule)] bg-transparent shadow-none sm:p-8">
            <div className="space-y-6">
              <div>
                <CardTitle className="text-base">1. Submit your first request</CardTitle>
                <BodyText muted className="mt-2 text-[14px]">
                  Go to <Link href="/requests/new" className="underline underline-offset-2">New Request</Link> and
                  choose the type that best fits your need. Fill out the intake form with as much detail as
                  possible — target audience, deadline, format, and any reference files.
                </BodyText>
              </div>
              <div>
                <CardTitle className="text-base">2. Attach reference files</CardTitle>
                <BodyText muted className="mt-2 text-[14px]">
                  On the request detail page, upload any supporting files — brand assets, past examples,
                  content drafts, or specifications. These go directly to the production team.
                </BodyText>
              </div>
              <div>
                <CardTitle className="text-base">3. Track your project</CardTitle>
                <BodyText muted className="mt-2 text-[14px]">
                  Once your request is converted to a project, find it in{" "}
                  <Link href="/" className="underline underline-offset-2">My Work</Link>. You can see the
                  current milestone, open deliverables, and any items waiting for your review.
                </BodyText>
              </div>
              <div>
                <CardTitle className="text-base">4. Review and approve proofs</CardTitle>
                <BodyText muted className="mt-2 text-[14px]">
                  When a proof is ready, open the deliverable and review it. Choose <strong>Approve</strong>,{" "}
                  <strong>Approve with changes</strong>, or <strong>Request changes</strong>. Add notes to
                  explain any revision requests clearly.
                </BodyText>
              </div>
            </div>
          </Card>
        </Section>

        <Section title="Frequently asked questions">
          <Card padding="md" className="border border-[var(--rule)] bg-transparent shadow-none sm:p-8">
            <div className="divide-y divide-[var(--border)]">
              <Faq
                question="What types of requests can I submit?"
                answer="Design projects (catalogs, brochures, flyers, signage, brand refresh), website updates, managed newsletter campaigns, and social media content. Choose the type that best fits when submitting — each has a tailored intake form."
              />
              <Faq
                question="How long does production take?"
                answer="Timelines vary by project type and scope. Your Canopy team will confirm a realistic timeline when the request is converted to a project. Including a target deadline in your request helps the team plan accordingly."
              />
              <Faq
                question="How do I request changes on a proof?"
                answer="Open the deliverable, select 'Request changes', and add detailed notes describing what you'd like adjusted. The more specific your notes, the faster the revision cycle. The production team will upload a new version when changes are complete."
              />
              <Faq
                question="Can I upload a new version of a file myself?"
                answer="No — proof versions are uploaded by the production team. You can upload reference and source files to your request at any time, but versioned proofs are managed by the Canopy team."
              />
              <Faq
                question="Where do I find my final delivered files?"
                answer="Final files are available for download from the project detail page once all deliverables are approved and the project is marked as delivered."
              />
              <Faq
                question="Can I submit a custom or one-off request?"
                answer="Yes. Choose 'Custom request' from the request type picker and describe what you need. The Canopy team will review it and follow up if more detail is needed before starting."
              />
            </div>
          </Card>
        </Section>

        <Section title="Quick links">
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary"><Link href="/">My Work</Link></Button>
            <Button asChild variant="secondary"><Link href="/requests/new">New Request</Link></Button>
            <Button asChild variant="secondary">
              <a href="mailto:info@akkedisdigital.com?subject=Canopy%20Create%20Support">Contact support</a>
            </Button>
          </div>
        </Section>

      </div>
    </SchoolShell>
  );
}
