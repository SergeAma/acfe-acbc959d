import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import spectrogramLogo from '@/assets/spectrogram-logo.png';
import eastAfricanUniversityLogo from '@/assets/east-african-university-logo.png';
import johannesburgLogo from '@/assets/johannesburg-logo.png';

export const Partners = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageBreadcrumb items={[{ label: "Partners" }]} />
      
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-16 text-foreground">
          Our Partners
        </h1>

        <div className="max-w-5xl mx-auto space-y-20">
          {/* Spectrogram Consulting - Featured Partner */}
          <div className="bg-card rounded-lg p-8 shadow-lg border-2 border-primary/20">
            <div className="flex flex-col items-center mb-6">
              <span className="text-xs uppercase tracking-wider text-primary font-semibold mb-4">Featured Partner</span>
              <a 
                href="https://spectrogramconsulting.com/home" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover-scale transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
              >
                <img 
                  src={spectrogramLogo} 
                  alt="Spectrogram Consulting" 
                  className="h-20 w-auto mb-6"
                />
              </a>
            </div>
            <p className="text-lg text-foreground/90 leading-relaxed text-center">
              Spectrogram Consulting is the founding partner behind A Cloud for Everyone. Their mission is to provide 
              discreet, expert counsel that enables leaders to navigate complexity and achieve sustainable, scalable 
              growth in an ever-changing business landscape. Through this partnership, Spectrogram Consulting supports 
              ACFE's vision of empowering African youth with job-ready digital skills.
            </p>
          </div>

          {/* East African University Partnership */}
          <div className="bg-card rounded-lg p-8 shadow-lg">
            <div className="flex flex-col items-center mb-6">
              <a href="https://teau.ac.ke" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                <img 
                  src={eastAfricanUniversityLogo} 
                  alt="The East African University" 
                  className="h-32 w-auto mb-6"
                />
              </a>
            </div>
            <p className="text-lg text-foreground/90 leading-relaxed text-center">
              We're proud to announce our new partnership with The East African University (TEAU) in Kenya. 
              Through this collaboration, we'll work together to accelerate digital skills training and modernize 
              curriculum development, with a focus on scalable tech mentorship. Our shared goal is clear: to ensure 
              students graduate with the skills, confidence, and industry exposure needed to thrive in today's digital economy.
            </p>
          </div>

          {/* Johustleburg Partnership */}
          <div className="bg-card rounded-lg p-8 shadow-lg">
            <div className="flex flex-col items-center mb-6">
              <a href="https://www.facebook.com/Thehonestgroupfundation/" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                <img 
                  src={johannesburgLogo} 
                  alt="Johustleburg Foundation" 
                  className="h-32 w-auto mb-6"
                />
              </a>
              <h2 className="text-2xl font-bold text-foreground mb-4">JOHUSTLEBURG</h2>
            </div>
            <p className="text-lg text-foreground/90 leading-relaxed text-center">
              A Cloud for Everyone (ACFE) has partnered with community builders at Honest Travel's ohustleburg 
              Foundation to revolutionize the perception of travel and tourism in Africa. Their joint ambition is to transform 
              their Johannesburg hub into a powerhouse of digital education and entrepreneurship in the heart of 
              Maboneng. Over the next five years, they aim to equip 10,000 students with the skills needed to succeed in the 
              global job market, transforming Maboneng into a center for youth education. Join us on this transformative journey!
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};
