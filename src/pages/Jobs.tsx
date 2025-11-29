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
      <section className="relative bg-muted py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/50 to-muted" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-foreground border-b-4 border-foreground inline-block pb-2">
              Jobs Board
            </h1>
            <p className="text-2xl md:text-3xl text-foreground/90 mb-6 mt-12 font-light">
              Learning new skills is only the first step, now let's put them to work!
            </p>
            <p className="text-xl text-foreground/80 italic">
              Browse <span className="font-semibold">internal</span> roles at ACFE and <span className="font-semibold underline">external</span> roles with our Partners!
            </p>
          </div>
        </div>
      </section>

      {/* Job Listings */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {jobs.map((job) => (
              <Card key={job.id} className="border-none shadow-lg bg-card overflow-hidden">
                <div className="bg-foreground p-8 flex justify-center">
                  <img 
                    src={acfeLogo} 
                    alt="ACFE Logo" 
                    className="h-32 w-auto brightness-0 invert"
                  />
                </div>
                <CardContent className="p-8 space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2">
                      {job.title}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      {job.organization}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-foreground">{job.location}:</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="text-foreground">{job.type}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-foreground mb-2">Description:</h3>
                    <p className="text-foreground/90 leading-relaxed">
                      {job.description}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-foreground mb-3">Requirements:</h3>
                    <ul className="space-y-3">
                      {job.requirements.map((req, idx) => (
                        <li key={idx} className="text-foreground/90">
                          <span className="font-semibold">{req.label}</span> {req.value}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-foreground mb-2">Responsibilities:</h3>
                    <p className="text-foreground/90 leading-relaxed">
                      {job.responsibilities}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-foreground mb-2">Remuneration:</h3>
                    <p className="text-foreground/90 leading-relaxed">
                      {job.remuneration}
                    </p>
                  </div>

                  <Button 
                    className="w-full bg-foreground text-background hover:bg-foreground/90 font-bold text-lg py-6 rounded-full"
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