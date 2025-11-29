import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import acfeLogo from '@/assets/acfe-logo.png';
import { MapPin, Clock } from 'lucide-react';

export const Jobs = () => {
  const jobs = [
    {
      id: 1,
      title: "PROJECT COORDINATOR ROLE",
      organization: "acloudforeveryone.org",
      location: "Central Africa",
      type: "Part-time",
      description: "We are seeking a highly organized Project Coordinator to join our team at acloudforeveryone.org. The role involves coordinating local learner community activities, ensuring smooth execution of projects, and supporting our mission to provide cloud education for all.",
      requirements: [
        {
          label: "Location:",
          value: "Based in Central Africa"
        },
        {
          label: "Language:",
          value: "Primarily French, Arabic and English (Portuguese and Spanish also strongly desired); good command of the most spoken vernaculars (e.g., Fula, Hausa, Wolof, Lingala, Swahili, Kikongo)"
        },
        {
          label: "Skills:",
          value: "Strong organizational skills, proficiency in Excel and PowerPoint"
        }
      ],
      responsibilities: "Coordinating local learner community activities, project management, reporting, and collaboration with the team.",
      remuneration: "Please note we are a charity and as such we rely on voluntaries. However all costs of running your region on a part-time basis will be covered monthly. Your experience will be considered as well."
    },
    {
      id: 2,
      title: "PROJECT COORDINATOR ROLE",
      organization: "acloudforeveryone.org",
      location: "Western Africa",
      type: "Part-time",
      description: "We are seeking a highly organized Project Coordinator to join our team at acloudforeveryone.org. The role involves coordinating local learner community activities, ensuring smooth execution of projects, and supporting our mission to provide cloud education for all.",
      requirements: [
        {
          label: "Location:",
          value: "Based in Western Africa"
        },
        {
          label: "Language:",
          value: "Good command of French, English & Arabic, good command of the most spoken vernaculars (e.g., Yoruba, Hausa, Igbo, Wolof)"
        },
        {
          label: "Skills:",
          value: "Strong organizational skills, proficiency in Excel and PowerPoint"
        }
      ],
      responsibilities: "Coordinating local learner community activities, project management, reporting, and collaboration with the team.",
      remuneration: "Please note we are a charity and as such we rely on voluntaries. However all costs of running your region on a part-time basis will be covered monthly. Your experience will be considered as well."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative bg-muted py-12 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground border-b-2 border-foreground inline-block pb-1">
              Jobs Board
            </h1>
            <p className="text-lg md:text-xl text-foreground/80 mb-3 mt-8">
              Learning new skills is only the first step, now let's put them to work!
            </p>
            <p className="text-base text-foreground/70">
              Browse <span className="font-semibold">internal</span> roles at ACFE and <span className="font-semibold underline">external</span> roles with our Partners!
            </p>
          </div>
        </div>
      </section>

      {/* Job Listings */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {jobs.map((job) => (
              <Card key={job.id} className="border border-border hover:border-primary transition-colors shadow-sm bg-card overflow-hidden">
                <div className="bg-muted/50 p-4 flex justify-center border-b border-border">
                  <img 
                    src={acfeLogo} 
                    alt="ACFE Logo" 
                    className="h-16 w-auto"
                  />
                </div>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-foreground mb-1">
                      {job.title}
                    </h2>
                    <p className="text-xs text-muted-foreground mb-3">
                      {job.organization}
                    </p>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-primary" />
                        <span className="font-medium text-foreground">{job.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-primary" />
                        <span className="text-foreground">{job.type}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">Description:</h3>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {job.description}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">Requirements:</h3>
                    <ul className="space-y-2">
                      {job.requirements.map((req, idx) => (
                        <li key={idx} className="text-sm text-foreground/80">
                          <span className="font-medium">{req.label}</span> {req.value}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">Responsibilities:</h3>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {job.responsibilities}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">Remuneration:</h3>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {job.remuneration}
                    </p>
                  </div>

                  <Button 
                    className="w-full bg-foreground text-background hover:bg-foreground/90 font-semibold text-sm py-5 rounded-full"
                    asChild
                  >
                    <a href="mailto:info@acloudforeveryone.org?subject=Application for Project Coordinator Role">
                      APPLY HERE
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};