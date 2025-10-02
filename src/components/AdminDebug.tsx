import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

const AdminDebug: React.FC = () => {
  const { user, profile } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runDebugChecks = async () => {
    setLoading(true);
    const info: any = {
      timestamp: new Date().toISOString(),
      auth: {
        user: user ? { id: user.id, email: user.email } : null,
        profile: profile ? { id: profile.id, email: profile.email, role: profile.role } : null,
      },
      tests: {}
    };

    try {
      // Test 1: Check current session
      const { data: session } = await supabase.auth.getSession();
      info.tests.session = {
        status: 'success',
        hasSession: !!session?.session,
        userId: session?.session?.user?.id || null,
      };

      // Test 2: Try to access profiles table
      try {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, role')
          .limit(5);
        
        info.tests.profiles = {
          status: profilesError ? 'error' : 'success',
          error: profilesError?.message,
          count: profiles?.length || 0,
          data: profiles || []
        };
      } catch (e) {
        info.tests.profiles = {
          status: 'error',
          error: (e as Error).message
        };
      }

      // Test 3: Try to access subscriptions table
      try {
        const { data: subscriptions, error: subsError } = await supabase
          .from('subscriptions')
          .select('*')
          .limit(5);
        
        info.tests.subscriptions = {
          status: subsError ? 'error' : 'success',
          error: subsError?.message,
          count: subscriptions?.length || 0,
          data: subscriptions || []
        };
      } catch (e) {
        info.tests.subscriptions = {
          status: 'error',
          error: (e as Error).message
        };
      }

      // Test 4: Check if subscriptions table exists
      try {
        const { data, error } = await supabase
          .rpc('check_table_exists', { table_name: 'subscriptions' });
        
        info.tests.tableExists = {
          status: error ? 'error' : 'success',
          exists: data,
          error: error?.message
        };
      } catch (e) {
        info.tests.tableExists = {
          status: 'error',
          error: 'RPC function not available'
        };
      }

      // Test 5: Try raw query to see what happens
      try {
        const { data, error } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_name', 'subscriptions');
        
        info.tests.schemaCheck = {
          status: error ? 'error' : 'success',
          found: data && data.length > 0,
          error: error?.message
        };
      } catch (e) {
        info.tests.schemaCheck = {
          status: 'error',
          error: (e as Error).message
        };
      }

    } catch (error) {
      info.error = (error as Error).message;
    }

    setDebugInfo(info);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      runDebugChecks();
    }
  }, [user]);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Admin Debug Information</CardTitle>
        <Button onClick={runDebugChecks} disabled={loading}>
          {loading ? 'Running Tests...' : 'Run Debug Tests'}
        </Button>
      </CardHeader>
      <CardContent>
        <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
};

export default AdminDebug;