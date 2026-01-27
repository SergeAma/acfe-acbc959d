import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Loader2, XCircle, Gift } from 'lucide-react';

export const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your payment...');
  const [isTrial, setIsTrial] = useState(false);

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');
      const courseId = searchParams.get('course_id');

      if (!sessionId || !courseId) {
        setStatus('error');
        setMessage('Invalid payment link');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-course-payment', {
          body: { sessionId, courseId }
        });

        if (error) throw error;

        if (data.success) {
          setStatus('success');
          setIsTrial(data.isTrial || false);
          setMessage(data.message || 'Payment successful! You are now enrolled.');
        } else {
          throw new Error(data.error || 'Verification failed');
        }
      } catch (error: any) {
        console.error('Payment verification error:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to verify payment');
      }
    };

    verifyPayment();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            {status === 'verifying' && (
              <>
                <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Processing Payment</h1>
                <p className="text-muted-foreground">{message}</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isTrial ? 'bg-purple-100' : 'bg-green-100'}`}>
                  {isTrial ? (
                    <Gift className="h-10 w-10 text-purple-600" />
                  ) : (
                    <CheckCircle className="h-10 w-10 text-green-600" />
                  )}
                </div>
                <h1 className={`text-2xl font-bold mb-2 ${isTrial ? 'text-purple-600' : 'text-green-600'}`}>
                  {isTrial ? 'Trial Started!' : 'Payment Successful!'}
                </h1>
                <p className="text-muted-foreground mb-6">{message}</p>
                {isTrial && (
                  <p className="text-sm text-muted-foreground mb-4 bg-purple-50 p-3 rounded-lg">
                    Your free trial has started. You'll be charged after the trial period ends unless you cancel.
                  </p>
                )}
                <div className="space-y-3">
                  <Button onClick={() => navigate('/courses')} className="w-full">
                    Start Learning
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/dashboard')} className="w-full">
                    Go to Dashboard
                  </Button>
                </div>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold mb-2 text-red-600">Payment Issue</h1>
                <p className="text-muted-foreground mb-6">{message}</p>
                <div className="space-y-3">
                  <Button onClick={() => navigate('/courses')} className="w-full">
                    Browse Courses
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/pricing')} className="w-full">
                    View Pricing
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
