import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { buildCanonicalEmail, EmailLanguage } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AssignmentGradedNotification {
  studentId: string;
  mentorName: string;
  courseTitle: string;
  assignmentTitle: string;
  status: 'approved' | 'revision_requested';
  feedback: string | null;
}

const translations = {
  en: {
    approved: {
      subject: (title: string) => `Assignment Approved: ${title}`,
      headline: 'Assignment Approved!',
      body: (name: string, mentor: string) => `<p>Hello ${name},</p><p>Great news! Your assignment has been reviewed and approved by <strong>${mentor}</strong>.</p><p>Excellent work! You've successfully completed this assignment. Continue your learning journey!</p>`,
      impact_title: 'Assignment Details:',
      cta: 'Continue Learning',
    },
    revision: {
      subject: (title: string) => `Revision Requested: ${title}`,
      headline: 'Revision Requested',
      body: (name: string, mentor: string) => `<p>Hello ${name},</p><p>Your assignment has been reviewed by <strong>${mentor}</strong> and requires some revisions.</p><p>Please review the feedback below and resubmit your assignment with the requested changes.</p>`,
      impact_title: 'Assignment Details:',
      cta: 'Revise Assignment',
    },
  },
  fr: {
    approved: {
      subject: (title: string) => `Devoir Approuvé: ${title}`,
      headline: 'Devoir Approuvé!',
      body: (name: string, mentor: string) => `<p>Bonjour ${name},</p><p>Bonne nouvelle! Votre devoir a été examiné et approuvé par <strong>${mentor}</strong>.</p><p>Excellent travail! Vous avez réussi ce devoir. Continuez votre parcours d'apprentissage!</p>`,
      impact_title: 'Détails du Devoir:',
      cta: 'Continuer à Apprendre',
    },
    revision: {
      subject: (title: string) => `Révision Demandée: ${title}`,
      headline: 'Révision Demandée',
      body: (name: string, mentor: string) => `<p>Bonjour ${name},</p><p>Votre devoir a été examiné par <strong>${mentor}</strong> et nécessite quelques révisions.</p><p>Veuillez consulter les commentaires ci-dessous et soumettre à nouveau votre devoir avec les modifications demandées.</p>`,
      impact_title: 'Détails du Devoir:',
      cta: 'Réviser le Devoir',
    },
  },
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Send assignment graded notification called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentId, mentorName, courseTitle, assignmentTitle, status, feedback }: AssignmentGradedNotification = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: studentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name, preferred_language')
      .eq('id', studentId)
      .single();

    if (profileError || !studentProfile) {
      console.error("Failed to get student profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Student not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const language: EmailLanguage = (studentProfile.preferred_language === 'fr' ? 'fr' : 'en');
    const isApproved = status === 'approved';
    const t = translations[language][isApproved ? 'approved' : 'revision'];
    const studentName = studentProfile.full_name?.split(' ')[0] || 'Student';

    const items = [
      `<strong>${language === 'fr' ? 'Cours' : 'Course'}:</strong> ${courseTitle}`,
      `<strong>${language === 'fr' ? 'Devoir' : 'Assignment'}:</strong> ${assignmentTitle}`,
      `<strong>${language === 'fr' ? 'Statut' : 'Status'}:</strong> ${isApproved ? (language === 'fr' ? 'Approuvé' : 'Approved') : (language === 'fr' ? 'Révision demandée' : 'Revision Requested')}`,
    ];
    
    if (feedback) {
      items.push(`<strong>${language === 'fr' ? 'Commentaires' : 'Feedback'}:</strong> ${feedback}`);
    }

    const htmlContent = buildCanonicalEmail({
      headline: t.headline,
      body_primary: t.body(studentName, mentorName),
      impact_block: {
        title: t.impact_title,
        items,
      },
      primary_cta: {
        label: t.cta,
        url: 'https://acloudforeveryone.org/dashboard',
      },
    }, language);

    await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [studentProfile.email],
      subject: t.subject(assignmentTitle),
      html: htmlContent,
    });

    console.log("Assignment graded notification sent");

    await supabase.from('email_logs').insert({
      subject: `Assignment ${isApproved ? 'Approved' : 'Revision Requested'} - ${courseTitle}`,
      status: 'sent',
      sent_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
