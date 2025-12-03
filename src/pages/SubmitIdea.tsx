import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { IdeaSubmissionForm } from "@/components/IdeaSubmissionForm";

export function SubmitIdea() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <PageBreadcrumb items={[{ label: "Submit Idea" }]} />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative py-16 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Submit Your Startup Idea
              </h1>
              <p className="text-lg text-muted-foreground">
                Got a vision that could transform Africa? We want to hear from you.
              </p>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <IdeaSubmissionForm />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
