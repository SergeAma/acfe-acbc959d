import { Navbar } from '@/components/Navbar';

export const Jobs = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-8 text-foreground">
          Job Opportunities
        </h1>
        <p className="text-lg text-center text-muted-foreground max-w-2xl mx-auto">
          Coming soon - Job listings and career opportunities for our graduates.
        </p>
      </div>
    </div>
  );
};
