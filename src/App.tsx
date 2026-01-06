import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AuthProvider } from "@/contexts/AuthContext";
import { CookieConsent } from "@/components/CookieConsent";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoleSwitcher } from "@/components/admin/AdminRoleSwitcher";
import { Landing } from "./pages/Landing";
import { Auth } from "./pages/Auth";
import { Dashboard } from "./pages/Dashboard";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminUsers } from "./pages/AdminUsers";
import { AdminSettings } from "./pages/AdminSettings";
import { Courses } from "./pages/Courses";
import { CourseDetail } from "./pages/CourseDetail";
import { CoursePreview } from "./pages/CoursePreview";
import { CourseLearn } from "./pages/CourseLearn";
import { CreateCourse } from "./pages/CreateCourse";
import { MentorCourses } from "./pages/MentorCourses";
import { AdminCourses } from "./pages/AdminCourses";
import { AdminCourseBuilder } from "./pages/AdminCourseBuilder";
import { AdminIdeaSubmissions } from "./pages/AdminIdeaSubmissions";
import { AdminContacts } from "./pages/AdminContacts";
import { AdminEmailTemplates } from "./pages/AdminEmailTemplates";
import { AdminEmailSequences } from "./pages/AdminEmailSequences";
import { AdminNewsletter } from "./pages/AdminNewsletter";
import { AdminEmailAnalytics } from "./pages/AdminEmailAnalytics";
import { AdminEmailLogs } from "./pages/AdminEmailLogs";
import AdminNewsCuration from "./pages/AdminNewsCuration";
import { Partners } from "./pages/Partners";
import { Jobs } from "./pages/Jobs";
import { ProfileSettings } from "./pages/ProfileSettings";
import { SubmitIdea } from "./pages/SubmitIdea";
import { Mentors } from "./pages/Mentors";
import { MentorProfile } from "./pages/MentorProfile";
import NotFound from "./pages/NotFound";
import { MyCertificates } from "./pages/MyCertificates";
import { MySubscriptions } from "./pages/MySubscriptions";
import { VerifyCertificate } from "./pages/VerifyCertificate";
import { CertificatePublic } from "./pages/CertificatePublic";
import AcceptMentorInvite from "./pages/AcceptMentorInvite";
import AdminMentorInvitations from "./pages/AdminMentorInvitations";
import { AdminLearnerAnalytics } from "./pages/AdminLearnerAnalytics";
import { MentorCohort } from "./pages/MentorCohort";
import { MentorSessions } from "./pages/MentorSessions";
import { CohortCommunity } from "./pages/CohortCommunity";
import { PaymentSuccess } from "./pages/PaymentSuccess";
import { AdminPricing } from "./pages/AdminPricing";
import { AdminRevenue } from "./pages/AdminRevenue";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { TermsOfService } from "./pages/TermsOfService";
import { MentorApplicationStatus } from "./pages/MentorApplicationStatus";
import { SpectrogramConnect } from "./pages/SpectrogramConnect";
import { Pricing } from "./pages/Pricing";
import { InstitutionCareerCentre } from "./pages/InstitutionCareerCentre";
import { AdminInstitutions } from "./pages/AdminInstitutions";
import { CareerCentreLanding } from "./pages/CareerCentreLanding";
import { ModeratorDashboard } from "./pages/ModeratorDashboard";
import MentorContractAgreement from "./pages/MentorContractAgreement";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/home" element={<Landing />} />
            <Route path="/mentors" element={<Mentors />} />
            <Route path="/mentors/:id" element={<MentorProfile />} />
            <Route path="/partners" element={<Partners />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/submit-idea" element={<SubmitIdea />} />
            <Route path="/verify-certificate" element={<VerifyCertificate />} />
            <Route path="/certificate/:certificateId" element={<CertificatePublic />} />
            <Route path="/startups" element={<SubmitIdea />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/connect-acfe" element={<SpectrogramConnect />} />
            <Route path="/spectrogram-connect" element={<SpectrogramConnect />} />
            <Route path="/accept-mentor-invite" element={<AcceptMentorInvite />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/courses/:id/preview" element={<CoursePreview />} />
            <Route path="/courses/:id/learn" element={<ProtectedRoute><CourseLearn /></ProtectedRoute>} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin"><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin"><AdminSettings /></ProtectedRoute>} />
            <Route path="/admin/ideas" element={<ProtectedRoute requiredRole="admin"><AdminIdeaSubmissions /></ProtectedRoute>} />
            <Route path="/admin/newsletter" element={<ProtectedRoute requiredRole="admin"><AdminNewsletter /></ProtectedRoute>} />
            <Route path="/admin/contacts" element={<ProtectedRoute requiredRole="admin"><AdminContacts /></ProtectedRoute>} />
            <Route path="/admin/email-templates" element={<ProtectedRoute requiredRole="admin"><AdminEmailTemplates /></ProtectedRoute>} />
            <Route path="/admin/email-sequences" element={<ProtectedRoute requiredRole="admin"><AdminEmailSequences /></ProtectedRoute>} />
            <Route path="/admin/email-analytics" element={<ProtectedRoute requiredRole="admin"><AdminEmailAnalytics /></ProtectedRoute>} />
            <Route path="/admin/email-logs" element={<ProtectedRoute requiredRole="admin"><AdminEmailLogs /></ProtectedRoute>} />
            <Route path="/admin/news-curation" element={<ProtectedRoute requiredRole="admin"><AdminNewsCuration /></ProtectedRoute>} />
            <Route path="/admin/mentor-invitations" element={<ProtectedRoute requiredRole="admin"><AdminMentorInvitations /></ProtectedRoute>} />
            <Route path="/admin/learner-analytics" element={<ProtectedRoute requiredRole="admin"><AdminLearnerAnalytics /></ProtectedRoute>} />
            <Route path="/admin/pricing" element={<ProtectedRoute requiredRole="admin"><AdminPricing /></ProtectedRoute>} />
            <Route path="/admin/revenue" element={<ProtectedRoute requiredRole="admin"><AdminRevenue /></ProtectedRoute>} />
            <Route path="/admin/institutions" element={<ProtectedRoute requiredRole="admin"><AdminInstitutions /></ProtectedRoute>} />
            <Route path="/admin/courses" element={<ProtectedRoute requiredRole="admin"><AdminCourses /></ProtectedRoute>} />
            <Route path="/admin/courses/:courseId/build" element={<ProtectedRoute requiredRole="admin"><AdminCourseBuilder /></ProtectedRoute>} />
            <Route path="/career-centre" element={<CareerCentreLanding />} />
            <Route path="/career-centre/:slug" element={<InstitutionCareerCentre />} />
            <Route path="/moderator/:slug" element={<ProtectedRoute><ModeratorDashboard /></ProtectedRoute>} />
            <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
            <Route path="/mentor/courses" element={<ProtectedRoute><MentorCourses /></ProtectedRoute>} />
            <Route path="/mentor/courses/new" element={<ProtectedRoute><CreateCourse /></ProtectedRoute>} />
            <Route path="/mentor/courses/:courseId/build" element={<ProtectedRoute><AdminCourseBuilder /></ProtectedRoute>} />
            <Route path="/mentor/cohort" element={<ProtectedRoute><MentorCohort /></ProtectedRoute>} />
            <Route path="/mentor/sessions" element={<ProtectedRoute><MentorSessions /></ProtectedRoute>} />
            <Route path="/mentor/cohort/community" element={<ProtectedRoute><CohortCommunity /></ProtectedRoute>} />
            <Route path="/cohort/community" element={<ProtectedRoute><CohortCommunity /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
            <Route path="/certificates" element={<ProtectedRoute><MyCertificates /></ProtectedRoute>} />
            <Route path="/subscriptions" element={<ProtectedRoute><MySubscriptions /></ProtectedRoute>} />
            <Route path="/mentor-application-status" element={<ProtectedRoute><MentorApplicationStatus /></ProtectedRoute>} />
            <Route path="/mentor-contract" element={<ProtectedRoute><MentorContractAgreement /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <AdminRoleSwitcher />
          <CookieConsent />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
