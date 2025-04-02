import React, { useState, useEffect } from 'react';
import { subscribeToPublishQueue, checkPublishQueueStatus } from '../api/aiEndpoints';
import { supabase } from '../api/supabaseClient';

const RealtimeTest: React.FC = () => {
  const [postThemeId, setPostThemeId] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [accessTestResult, setAccessTestResult] = useState<any>(null);
  
  // Function to add a log entry
  const addLog = (message: string) => {
    setLogs(prevLogs => [...prevLogs, `${new Date().toISOString()} - ${message}`]);
  };
  
  // Function to test database access
  const testAccess = async () => {
    if (!postThemeId) {
      addLog('Please enter a post theme ID first');
      return;
    }
    
    try {
      addLog(`Testing database access for post theme: ${postThemeId}`);
      
      // Test direct database access
      const { data, error } = await supabase
        .from('publish_queue')
        .select('*')
        .eq('post_theme_id', postThemeId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        addLog(`ERROR: Database access failed: ${error.message}`);
        setAccessTestResult({ success: false, error });
      } else {
        addLog(`SUCCESS: Database access successful. Found ${data?.length || 0} records.`);
        setAccessTestResult({ success: true, data });
        
        // Also check using the helper function
        const queueStatus = await checkPublishQueueStatus(postThemeId);
        addLog(`Queue status from helper function: ${JSON.stringify(queueStatus)}`);
      }
    } catch (error) {
      addLog(`ERROR: Unexpected error: ${error}`);
      setAccessTestResult({ success: false, error });
    }
  };
  
  // Function to subscribe to realtime updates
  const subscribe = () => {
    if (!postThemeId) {
      addLog('Please enter a post theme ID first');
      return;
    }
    
    try {
      addLog(`Setting up realtime subscription for post theme: ${postThemeId}`);
      
      const unsubscribe = subscribeToPublishQueue(postThemeId, (data) => {
        addLog(`Realtime update received: ${JSON.stringify(data)}`);
      });
      
      setIsSubscribed(true);
      addLog('Subscription active. Waiting for updates...');
      
      // Store the unsubscribe function
      window.__realtimeUnsubscribe = unsubscribe;
    } catch (error) {
      addLog(`ERROR: Failed to set up subscription: ${error}`);
    }
  };
  
  // Function to unsubscribe
  const unsubscribe = () => {
    if (window.__realtimeUnsubscribe) {
      window.__realtimeUnsubscribe();
      window.__realtimeUnsubscribe = null;
      setIsSubscribed(false);
      addLog('Unsubscribed from realtime updates');
    } else {
      addLog('No active subscription to unsubscribe from');
    }
  };
  
  // Clean up subscription when component unmounts
  useEffect(() => {
    return () => {
      if (window.__realtimeUnsubscribe) {
        window.__realtimeUnsubscribe();
        window.__realtimeUnsubscribe = null;
      }
    };
  }, []);
  
  return (
    <div className="realtime-test" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Realtime Subscription Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="post-theme-id" style={{ display: 'block', marginBottom: '5px' }}>
          Post Theme ID:
        </label>
        <input
          id="post-theme-id"
          type="text"
          value={postThemeId}
          onChange={(e) => setPostThemeId(e.target.value)}
          style={{ width: '100%', padding: '8px', fontSize: '16px' }}
          placeholder="Enter a post theme ID to test"
        />
      </div>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={testAccess}
          style={{
            padding: '8px 16px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test Database Access
        </button>
        
        {!isSubscribed ? (
          <button 
            onClick={subscribe}
            style={{
              padding: '8px 16px',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Subscribe to Updates
          </button>
        ) : (
          <button 
            onClick={unsubscribe}
            style={{
              padding: '8px 16px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px', 
              cursor: 'pointer'
            }}
          >
            Unsubscribe
          </button>
        )}
      </div>
      
      {accessTestResult && (
        <div 
          style={{ 
            marginBottom: '20px',
            padding: '10px',
            background: accessTestResult.success ? '#E8F5E9' : '#FFEBEE',
            border: `1px solid ${accessTestResult.success ? '#4CAF50' : '#f44336'}`,
            borderRadius: '4px'
          }}
        >
          <h3>Access Test Result</h3>
          <pre style={{ overflow: 'auto', maxHeight: '200px' }}>
            {JSON.stringify(accessTestResult, null, 2)}
          </pre>
        </div>
      )}
      
      <div>
        <h3>Logs</h3>
        <div 
          style={{ 
            height: '300px', 
            overflowY: 'auto', 
            border: '1px solid #ccc',
            padding: '10px',
            fontFamily: 'monospace',
            background: '#f5f5f5',
            borderRadius: '4px'
          }}
        >
          {logs.length === 0 ? (
            <p style={{ color: '#777' }}>No logs yet. Start a test to see logs here.</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} style={{ marginBottom: '5px' }}>{log}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Add the unsubscribe function to the window object for cleanup
declare global {
  interface Window {
    __realtimeUnsubscribe: (() => void) | null;
  }
}

window.__realtimeUnsubscribe = null;

export default RealtimeTest; 