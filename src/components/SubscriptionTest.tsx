import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

const SubscriptionTest: React.FC = () => {
  const { user, profile } = useAuth();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testQueries = async () => {
    setLoading(true);
    const results: any = {};

    try {
      // Test 1: Basic select
      console.log('Testing basic subscriptions select...');
      const { data: subs1, error: error1 } = await supabase
        .from('subscriptions')
        .select('id, user_id, plan, status')
        .limit(5);
      
      results.basicSelect = {
        success: !error1,
        error: error1 ? {
          code: error1.code,
          message: error1.message,
          details: error1.details
        } : null,
        data: subs1,
        count: subs1?.length || 0
      };

      // Test 2: Count query
      console.log('Testing count query...');
      const { count, error: error2 } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true });
      
      results.countQuery = {
        success: !error2,
        error: error2 ? {
          code: error2.code,
          message: error2.message,
          details: error2.details
        } : null,
        count: count
      };

      // Test 3: Check current user info
      results.userInfo = {
        userId: user?.id,
        userEmail: user?.email,
        profileRole: profile?.role,
        isAdmin: profile?.role === 'admin'
      };

      // Test 4: Test profiles access
      console.log('Testing profiles access...');
      const { data: profiles, error: error3 } = await supabase
        .from('profiles')
        .select('id, email, role')
        .limit(3);
      
      results.profilesAccess = {
        success: !error3,
        error: error3 ? {
          code: error3.code,
          message: error3.message,
          details: error3.details
        } : null,
        data: profiles
      };

      // Test 5: Raw SQL test
      console.log('Testing enum values...');
      const { data: enumData, error: error4 } = await supabase
        .rpc('get_enum_values', { enum_name: 'subscription_plan' });
      
      results.enumTest = {
        success: !error4,
        error: error4 ? {
          code: error4.code,
          message: error4.message,
          details: error4.details
        } : null,
        data: enumData
      };

    } catch (error) {
      results.generalError = {
        message: (error as Error).message,
        stack: (error as Error).stack
      };
    }

    setResult(results);
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Subscription Database Test</CardTitle>
        <Button onClick={testQueries} disabled={loading}>
          {loading ? 'Testing...' : 'Run Database Tests'}
        </Button>
      </CardHeader>
      <CardContent>
        {result && (
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionTest;