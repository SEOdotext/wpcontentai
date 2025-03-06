
import React from 'react';
import ContentStructureView from '@/components/ContentStructureView';

const ContentCreation = () => {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Content Creation</h1>
      </div>
      <ContentStructureView className="min-h-[600px]" />
    </div>
  );
};

export default ContentCreation;
