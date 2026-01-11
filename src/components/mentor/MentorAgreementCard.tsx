import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSignature, Download, Eye, CheckCircle2, XCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import html2canvas from "html2canvas";

interface MentorAgreementCardProps {
  signatureName: string;
  signatureDate: string;
  showViewButton?: boolean;
}

export const MentorAgreementCard = ({ signatureName, signatureDate, showViewButton = true }: MentorAgreementCardProps) => {
  const { t } = useLanguage();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Contract conditions using translation keys
  const CONTRACT_CONDITIONS = [
    { id: "condition_respect_students", title: t('mentor.term1_title'), description: t('mentor.term1_desc') },
    { id: "condition_free_courses", title: t('mentor.term2_title'), description: t('mentor.term2_desc') },
    { id: "condition_session_pricing", title: t('mentor.term3_title'), description: t('mentor.term3_desc').replace('${price}', '30') },
    { id: "condition_minimum_courses", title: t('mentor.term4_title'), description: t('mentor.term4_desc') },
    { id: "condition_quarterly_events", title: t('mentor.term5_title'), description: t('mentor.term5_desc') },
    { id: "condition_data_privacy", title: t('mentor.term6_title'), description: t('mentor.term6_desc') },
    { id: "condition_monthly_meetings", title: t('mentor.term7_title'), description: t('mentor.term7_desc') },
    { id: "condition_support_youth", title: t('mentor.term8_title'), description: t('mentor.term8_desc') },
    { id: "condition_no_profanity", title: t('mentor.term9_title'), description: t('mentor.term9_desc') },
    { id: "condition_platform_engagement", title: t('mentor.term10_title'), description: t('mentor.term10_desc') },
    { id: "condition_promotional_rights", title: t('mentor.term11_title'), description: t('mentor.term11_desc') },
  ];

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
              {t('mentor.agreement_title')}
            </CardTitle>
            <Badge variant="default" className="bg-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {t('sign_in') === 'Se Connecter' ? 'Signé' : 'Signed'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            <p className="text-muted-foreground">{t('sign_in') === 'Se Connecter' ? 'Signé par' : 'Signed by'}</p>
            <p className="font-medium">{signatureName}</p>
          </div>
          <div className="text-sm">
            <p className="text-muted-foreground">{t('sign_in') === 'Se Connecter' ? 'Date de signature' : 'Date signed'}</p>
            <p className="font-medium">{formattedDate}</p>
          </div>
          <div className="flex gap-2 pt-2">
            {showViewButton && (
              <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                <Eye className="h-4 w-4 mr-2" />
                {t('sign_in') === 'Se Connecter' ? 'Voir' : 'View'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
              <Download className="h-4 w-4 mr-2" />
              {downloading ? (t('sign_in') === 'Se Connecter' ? 'Génération...' : 'Generating...') : (t('sign_in') === 'Se Connecter' ? 'Télécharger' : 'Download')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{t('mentor.agreement_title')}</DialogTitle>
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
                <h1 className="text-2xl font-bold text-gray-900">{t('mentor.agreement_title')}</h1>
                <p className="text-gray-600 mt-2">A Cloud for Everyone</p>
              </div>

              {/* Agreement Terms */}
              <div className="space-y-4">
                <h2 className="font-semibold text-gray-900">{t('sign_in') === 'Se Connecter' ? 'Termes du Contrat' : 'Agreement Terms'}</h2>
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
                    <p className="text-sm text-gray-500">{t('sign_in') === 'Se Connecter' ? 'Signé Numériquement Par' : 'Digitally Signed By'}</p>
                    <p className="text-xl font-signature italic text-gray-900">{signatureName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium text-gray-900">{formattedDate}</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-gray-400 pt-4 border-t space-y-1">
                <p>{t('sign_in') === 'Se Connecter' ? 'Ce document est un accord juridiquement contraignant entre le signataire et A Cloud for Everyone (ACFE).' : 'This document is a legally binding agreement between the signatory and A Cloud for Everyone (ACFE).'}</p>
                <p>{t('sign_in') === 'Se Connecter' ? 'Soumis aux Conditions d\'Utilisation et Politique de Confidentialité ACFE. Régi par les lois de l\'Angleterre et du Pays de Galles.' : 'Subject to ACFE Terms of Service and Privacy Policy. Governed by the laws of England and Wales.'}</p>
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
  const { t } = useLanguage();
  const isFrench = t('sign_in') === 'Se Connecter';
  
  if (hasSigned && signatureName && signatureDate) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="default" className="bg-green-600 text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {isFrench ? 'Signé' : 'Signed'}
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
      {isFrench ? 'Non Signé' : 'Not Signed'}
    </Badge>
  );
};
