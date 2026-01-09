import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSignature, Download, Eye, CheckCircle2, XCircle } from "lucide-react";
import html2canvas from "html2canvas";

interface MentorAgreementCardProps {
  signatureName: string;
  signatureDate: string;
  showViewButton?: boolean;
}

const CONTRACT_CONDITIONS = [
  { id: "condition_respect_students", title: "Respect & Data Protection", description: "I commit to respecting all students and always protecting their data and dignity." },
  { id: "condition_free_courses", title: "Free Short Courses", description: "I agree to provide all short courses free of charge on the ACFE platform." },
  { id: "condition_session_pricing", title: "1:1 Mentoring Session Pricing", description: "I agree to the platform's mentoring session pricing terms." },
  { id: "condition_minimum_courses", title: "Course Creation Commitment", description: "I commit to creating at least 4 courses of 30 minutes maximum duration each." },
  { id: "condition_quarterly_events", title: "Live Events Commitment", description: "I commit to hosting at least 1 live event per quarter." },
  { id: "condition_data_privacy", title: "Student Data Privacy", description: "I commit to not discussing student-specific data online." },
  { id: "condition_monthly_meetings", title: "Monthly Mentor Meetings", description: "I commit to joining at least 1 ACFE mentor's general meeting per month." },
  { id: "condition_support_youth", title: "Supporting African Youth", description: "I commit to always help and support African youth on the platform." },
  { id: "condition_no_profanity", title: "Professional Conduct", description: "I commit to not using profanity on the ACFE platform." },
  { id: "condition_platform_engagement", title: "Platform-Only Engagement", description: "I commit to only engaging with mentees within the ACFE ecosystem." },
  { id: "condition_promotional_rights", title: "Promotional Rights", description: "I agree that ACFE may publicly share positive learning outcomes." },
];

export const MentorAgreementCard = ({ signatureName, signatureDate, showViewButton = true }: MentorAgreementCardProps) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const formattedDate = new Date(signatureDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const handleDownload = async () => {
    setDownloading(true);
    setPreviewOpen(true);
    
    // Wait for dialog to render
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const element = document.getElementById('agreement-content');
    if (!element) {
      setDownloading(false);
      return;
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      
      const link = document.createElement('a');
      link.download = `ACFE_Mentor_Agreement_${signatureName.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-primary" />
              Mentor Agreement
            </CardTitle>
            <Badge variant="default" className="bg-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Signed
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            <p className="text-muted-foreground">Signed by</p>
            <p className="font-medium">{signatureName}</p>
          </div>
          <div className="text-sm">
            <p className="text-muted-foreground">Date signed</p>
            <p className="font-medium">{formattedDate}</p>
          </div>
          <div className="flex gap-2 pt-2">
            {showViewButton && (
              <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                <Eye className="h-4 w-4 mr-2" />
                View
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
              <Download className="h-4 w-4 mr-2" />
              {downloading ? 'Generating...' : 'Download'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>ACFE Mentor Agreement</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[70vh]">
            <div id="agreement-content" className="bg-white p-8 space-y-6">
              {/* Header with Logo */}
              <div className="text-center border-b pb-6">
                <img 
                  src="/acfe-logo.png" 
                  alt="ACFE Logo" 
                  className="h-16 mx-auto mb-4"
                  crossOrigin="anonymous"
                />
                <h1 className="text-2xl font-bold text-gray-900">ACFE Mentor Agreement</h1>
                <p className="text-gray-600 mt-2">A Cloud for Everyone</p>
              </div>

              {/* Agreement Terms */}
              <div className="space-y-4">
                <h2 className="font-semibold text-gray-900">Agreement Terms</h2>
                {CONTRACT_CONDITIONS.map((condition, index) => (
                  <div key={condition.id} className="flex gap-3 text-sm">
                    <span className="text-gray-500 font-medium">{index + 1}.</span>
                    <div>
                      <p className="font-medium text-gray-900">{condition.title}</p>
                      <p className="text-gray-600">{condition.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Signature Section */}
              <div className="border-t pt-6 mt-6">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-gray-500">Digitally Signed By</p>
                    <p className="text-xl font-signature italic text-gray-900">{signatureName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium text-gray-900">{formattedDate}</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-gray-400 pt-4 border-t">
                This document is a legally binding agreement between the signatory and A Cloud for Everyone (ACFE).
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Compact status badge for tables
export const MentorAgreementStatus = ({ 
  hasSigned, 
  signatureName,
  signatureDate,
  onPreview 
}: { 
  hasSigned: boolean;
  signatureName?: string;
  signatureDate?: string;
  onPreview?: () => void;
}) => {
  if (hasSigned && signatureName && signatureDate) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="default" className="bg-green-600 text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Signed
        </Badge>
        {onPreview && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onPreview}>
            <Eye className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }
  
  return (
    <Badge variant="secondary" className="text-xs">
      <XCircle className="h-3 w-3 mr-1" />
      Not Signed
    </Badge>
  );
};