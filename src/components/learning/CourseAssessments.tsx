import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  CheckCircle2,
  ClipboardCheck,
  Briefcase
} from 'lucide-react';
import { CourseQuiz } from '@/components/learning/CourseQuiz';
import { CourseAssignment } from '@/components/learning/CourseAssignment';

interface CourseAssessmentsProps {
  courseId: string;
  enrollmentId: string;
  hasQuiz: boolean;
  hasAssignment: boolean;
  quizPassed: boolean;
  assignmentApproved: boolean;
  onBack: () => void;
  onQuizComplete: (passed: boolean) => void;
  onAssignmentComplete: (status: 'submitted' | 'approved') => void;
}

export const CourseAssessments = ({
  courseId,
  enrollmentId,
  hasQuiz,
  hasAssignment,
  quizPassed,
  assignmentApproved,
  onBack,
  onQuizComplete,
  onAssignmentComplete,
}: CourseAssessmentsProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Course Assessments</h2>
          <p className="text-muted-foreground">Complete these assessments to earn your certificate</p>
        </div>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Lessons
        </Button>
      </div>

      {/* Quiz Section */}
      {hasQuiz && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Quiz</h3>
            {quizPassed && <CheckCircle2 className="h-5 w-5 text-green-600" />}
          </div>
          <CourseQuiz 
            courseId={courseId}
            enrollmentId={enrollmentId}
            onComplete={onQuizComplete}
          />
        </div>
      )}

      {/* Assignment Section */}
      {hasAssignment && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Assignment</h3>
            {assignmentApproved && <CheckCircle2 className="h-5 w-5 text-green-600" />}
          </div>
          <CourseAssignment
            courseId={courseId}
            enrollmentId={enrollmentId}
            onComplete={onAssignmentComplete}
          />
        </div>
      )}
    </div>
  );
};
