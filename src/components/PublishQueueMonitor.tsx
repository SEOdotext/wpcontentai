import { useState, useEffect } from 'react';
import { subscribeToAllUpdates } from '../api/aiEndpoints';

interface PublishQueueMonitorProps {
  postThemeId: string;
  onProgressUpdate?: (progress: number, status: string, data: any) => void;
}

const PublishQueueMonitor: React.FC<PublishQueueMonitorProps> = ({ postThemeId, onProgressUpdate }) => {
  const [queueStatus, setQueueStatus] = useState<string>('unknown');
  const [progress, setProgress] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [postThemeDetails, setPostThemeDetails] = useState<any>(null);
  const [imageQueueDetails, setImageQueueDetails] = useState<any>(null);

  useEffect(() => {
    console.log(`[PublishQueueMonitor] Setting up subscriptions for postThemeId: ${postThemeId}`);
    
    const unsubscribe = subscribeToAllUpdates(postThemeId, {
      onPublishQueueUpdate: (data) => {
        console.log('[PublishQueueMonitor] Received publish queue update:', data);
        if (data) {
          setQueueStatus(data.status);
          
          if (data.result) {
            // Extract log messages if they exist
            if (data.result.log && Array.isArray(data.result.log)) {
              setLogs(data.result.log);
            }
            
            // Extract progress if it exists
            if (data.result.progress !== undefined) {
              setProgress(data.result.progress);
            }
            
            // Extract error if it exists
            if (data.result.error) {
              setError(data.result.error);
            }
            
            // Call onProgressUpdate callback if provided
            if (onProgressUpdate) {
              onProgressUpdate(
                data.result.progress || 0, 
                data.status, 
                data.result
              );
            }
          }
        }
      },
      
      onImageQueueUpdate: (data) => {
        console.log('[PublishQueueMonitor] Received image queue update:', data);
        setImageQueueDetails(data);
      },
      
      onPostThemeUpdate: (data) => {
        console.log('[PublishQueueMonitor] Received post theme update:', data);
        setPostThemeDetails(data);
      }
    });
    
    // Clean up subscriptions when component unmounts
    return () => {
      console.log(`[PublishQueueMonitor] Cleaning up subscriptions for postThemeId: ${postThemeId}`);
      unsubscribe();
    };
  }, [postThemeId, onProgressUpdate]);

  // Only render if there's something to show
  return (
    <div className="publish-queue-monitor">
      {queueStatus !== 'unknown' && (
        <div className="queue-status">
          <h3>Queue Status: {queueStatus}</h3>
          
          {progress > 0 && (
            <div className="progress-bar-container">
              <div 
                className="progress-bar" 
                style={{ width: `${progress}%` }}
              />
              <div className="progress-text">{progress}%</div>
            </div>
          )}
          
          {error && (
            <div className="error-message">
              <p>Error: {error}</p>
            </div>
          )}
          
          {logs.length > 0 && (
            <div className="logs-container">
              <h4>Processing Logs:</h4>
              <ul className="logs-list">
                {logs.map((log, index) => (
                  <li key={index} className="log-entry">{log}</li>
                ))}
              </ul>
            </div>
          )}
          
          {postThemeDetails && (
            <div className="post-theme-details">
              <h4>Post Theme Status: {postThemeDetails.status}</h4>
              {postThemeDetails.image && (
                <div className="image-preview">
                  <img 
                    src={postThemeDetails.image} 
                    alt="Generated" 
                    style={{ maxWidth: '300px' }} 
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PublishQueueMonitor; 