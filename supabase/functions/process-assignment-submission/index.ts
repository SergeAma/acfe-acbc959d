import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, verifyUser } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user, supabase } = await verifyUser(req);
    const { assignmentId, enrollmentId, videoUrl, submissionType } = await req.json();

    if (!assignmentId || !enrollmentId || !videoUrl) {
      throw new Error('Missing required fields: assignmentId, enrollmentId, videoUrl');
    }

    // Validate URL format
    const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
    const isDrive = videoUrl.includes('drive.google.com');
    
    if (!isYouTube && !isDrive) {
      throw new Error('Please provide a valid YouTube or Google Drive link');
    }

    // Get enrollment details to verify ownership and get course info
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        course_id,
        courses (
          id,
          title,
          mentor_id,
          certificate_enabled,
          profiles!courses_mentor_id_fkey (
            id,
            full_name,
            email
          )
        )
      `)
      .eq('id', enrollmentId)
      .single();

    if (enrollmentError || !enrollment) {
      throw new Error('Enrollment not found');
    }

    if (enrollment.student_id !== user.id) {
      throw new Error('You are not authorized to submit for this enrollment');
    }

    // Get student profile
    const { data: studentProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    // Check if submission already exists for this enrollment
    const { data: existingSubmission } = await supabase
      .from('assignment_submissions')
      .select('id')
      .eq('enrollment_id', enrollmentId)
      .single();

    let submissionResult;
    
    if (existingSubmission) {
      // Update existing submission
      const { data, error } = await supabase
        .from('assignment_submissions')
        .update({
          video_url: videoUrl,
          status: 'pending',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', existingSubmission.id)
        .select()
        .single();
      
      if (error) throw error;
      submissionResult = data;
    } else {
      // Create new submission
      const { data, error } = await supabase
        .from('assignment_submissions')
        .insert({
          assignment_id: assignmentId,
          student_id: user.id,
          enrollment_id: enrollmentId,
          video_url: videoUrl,
          status: 'pending',
        })
        .select()
        .single();
      
      if (error) throw error;
      submissionResult = data;
    }

    // Update enrollment progress to 100%
    await supabase
      .from('enrollments')
      .update({ progress: 100 })
      .eq('id', enrollmentId);

    const course = enrollment.courses as any;
    const mentor = course?.profiles;
    const studentName = studentProfile?.full_name || user.email;
    const studentEmail = studentProfile?.email || user.email;

    // Send notification to mentor if assigned
    if (mentor?.email) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'mentor-assignment-submitted',
          to: mentor.email,
          data: {
            mentorName: mentor.full_name || 'Mentor',
            studentName,
            studentEmail,
            courseName: course.title,
            videoUrl,
            submissionType: isYouTube ? 'YouTube' : 'Google Drive',
          },
        }),
      });
    }

    // Generate certificate if enabled and submission is auto-approved
    // For now, certificates require mentor approval, so we just mark as submitted
    
    // Send confirmation email to student
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'assignment-submission-confirmation',
        to: studentEmail,
        data: {
          studentName,
          courseName: course.title,
          mentorName: mentor?.full_name || 'your mentor',
          videoUrl,
        },
        userId: user.id,
      }),
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        submission: submissionResult,
        message: 'Assignment submitted successfully! Your mentor will review it shortly.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing assignment submission:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
