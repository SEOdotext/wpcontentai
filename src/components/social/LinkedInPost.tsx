import React, { useState, useEffect } from 'react';
import { MoreHorizontal, ThumbsUp, MessageSquare, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import '@/styles/linkedin.css';
import '@/styles/phone-frame.css';

interface LinkedInPostProps {
  content: string;
  websiteUrl?: string;
  websiteName?: string;
}

export const LinkedInPost: React.FC<LinkedInPostProps> = ({ content, websiteUrl, websiteName = 'hirely.dk' }) => {
  const [favicon, setFavicon] = useState<string | null>(null);

  useEffect(() => {
    if (websiteUrl) {
      try {
        const url = new URL(websiteUrl);
        const faviconUrl = `${url.protocol}//${url.hostname}/favicon.ico`;
        setFavicon(faviconUrl);
      } catch (e) {
        console.error('Invalid URL:', websiteUrl);
      }
    }
  }, [websiteUrl]);

  // Function to process hashtags and make them blue
  const processHashtags = (text: string) => {
    return text.split(/\s+/).map((word, i) => {
      if (word.startsWith('#')) {
        return `<span class="text-[#0a66c2] font-medium hover:underline cursor-pointer">${word}</span>`;
      }
      if (word.startsWith('http')) {
        return `<a href="${word}" class="text-[#0a66c2] hover:underline" target="_blank" rel="noopener noreferrer">${word}</a>`;
      }
      return word;
    }).join(' ');
  };

  return (
    <div className="social-phone-frame linkedin">
      {/* LinkedIn Header */}
      <div className="social-header">
        <div className="flex items-center">
          <span className="text-[#0a66c2] text-lg font-semibold">LinkedIn</span>
        </div>
        <div className="flex gap-4">
          <button className="social-action-button">
            <MoreHorizontal className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Post Container */}
      <div className="social-post-container">
        <div className="py-3 border-b border-gray-100">
          {/* Post Header */}
          <div className="flex justify-between items-start px-4 pb-3">
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded-full bg-[#0a66c2] flex items-center justify-center flex-shrink-0 overflow-hidden">
                {favicon ? (
                  <img 
                    src={favicon} 
                    alt={websiteName}
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      // If favicon fails to load, show the first letter
                      setFavicon(null);
                    }}
                  />
                ) : (
                  <span className="text-white text-xl font-semibold">
                    {websiteName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[14px] font-semibold text-gray-900">{websiteName}</span>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span>1d</span>
                  <span>•</span>
                  <span>🌐</span>
                </div>
              </div>
            </div>
            <button className="social-action-button">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          {/* Post Content */}
          <div className="px-4 pb-3">
            <div 
              className="text-[14px] leading-[1.4] text-gray-900 whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ 
                __html: processHashtags(content)
              }}
            />
          </div>

          {/* Engagement Stats */}
          <div className="flex justify-between items-center px-4 py-1 border-t border-gray-100">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-[#0a66c2] flex items-center justify-center">
                <ThumbsUp className="w-2.5 h-2.5 text-white" />
              </div>
              <span className="text-xs text-gray-500">42</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>8 comments</span>
              <span>•</span>
              <span>3 shares</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-around px-4 pt-1 border-t border-gray-100">
            <button className="social-action-button flex items-center gap-2">
              <ThumbsUp className="social-action-icon" />
              <span className="text-sm font-semibold text-gray-600">Like</span>
            </button>
            <button className="social-action-button flex items-center gap-2">
              <MessageSquare className="social-action-icon" />
              <span className="text-sm font-semibold text-gray-600">Comment</span>
            </button>
            <button className="social-action-button flex items-center gap-2">
              <Share2 className="social-action-icon" />
              <span className="text-sm font-semibold text-gray-600">Share</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 