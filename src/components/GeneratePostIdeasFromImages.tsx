import React, { useState } from 'react';
import { Image as ImageIcon, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePostThemes } from '@/context/PostThemesContext';

interface ImageItem {
  id: string;
  url: string;
  name: string;
  description?: string;
}

interface GeneratePostIdeasFromImagesProps {
  currentWebsite: {
    id: string;
    language: string;
  } | null;
  writingStyle: string | null;
  subjectMatters: string[];
  onContentGenerated: () => void;
}

const GeneratePostIdeasFromImages: React.FC<GeneratePostIdeasFromImagesProps> = ({
  currentWebsite,
  writingStyle,
  subjectMatters,
  onContentGenerated
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaLibraryImages, setMediaLibraryImages] = useState<ImageItem[]>([]);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [selectedLibraryImage, setSelectedLibraryImage] = useState<ImageItem | null>(null);
  const [uploadedImageName, setUploadedImageName] = useState<string>('');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const { fetchPostThemes } = usePostThemes();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadedImageName(file.name);
    }
  };

  const fetchMediaLibraryImages = async () => {
    if (!currentWebsite?.id) return;
    
    try {
      const { data: images, error } = await supabase
        .from('images')
        .select('id, url, name, description')
        .eq('website_id', currentWebsite.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMediaLibraryImages(images || []);
    } catch (error) {
      console.error('Error fetching media library:', error);
      toast.error('Failed to load media library');
    }
  };

  const handleGenerateFromMedia = async () => {
    if ((!selectedFile && !selectedLibraryImage) || !currentWebsite?.id) return;
    
    setIsUploading(true);
    try {
      // Get current session for authentication
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        throw new Error('No access token found');
      }

      let imageUrl: string;
      let imageId: string | null = null;
      let imageName: string;
      let imageDescription: string | undefined;

      if (selectedFile) {
        // 1. Upload to storage
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${currentWebsite.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('content-images')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        // 2. Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('content-images')
          .getPublicUrl(filePath);
        imageUrl = publicUrl;
        imageName = uploadedImageName;

        // 3. Insert into images table
        const { data: imageInsert, error: imageInsertError } = await supabase
          .from('images')
          .insert({
            website_id: currentWebsite.id,
            name: uploadedImageName,
            url: imageUrl,
            // Optionally add description, size, type, etc.
          })
          .select('id')
          .single();
        if (imageInsertError) throw imageInsertError;
        imageId = imageInsert.id;
      } else if (selectedLibraryImage) {
        imageUrl = selectedLibraryImage.url;
        imageId = selectedLibraryImage.id;
        imageName = selectedLibraryImage.name;
        imageDescription = selectedLibraryImage.description;
      }

      // Call the edge function to generate content from the image
      const response = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/generate-post-ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`
        },
        body: JSON.stringify({
          website_id: currentWebsite.id,
          image_url: imageUrl,
          image_id: imageId,
          image_name: imageName,
          image_description: imageDescription || aiAnalysis,
          writing_style: writingStyle || 'default',
          subject_matters: subjectMatters || [],
          language: currentWebsite.language || 'en'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate content from image');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate content from image');
      }

      // Instead of inserting post themes, just refresh the list
      await fetchPostThemes();
      onContentGenerated();
      toast.success('Content generated successfully from image');
      setSelectedFile(null);
      setSelectedLibraryImage(null);
      setUploadedImageName('');
    } catch (error) {
      console.error('Error generating content from image:', error);
      toast.error('Failed to generate content from image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyzeImage = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAiAnalysis(null);
    try {
      if (!currentWebsite?.id) throw new Error('No website selected');
      const imageId = selectedLibraryImage?.id;
      if (!imageId) throw new Error('No image selected from library');

      // Use the same structure as Media.tsx
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          image_ids: [imageId],
          website_id: currentWebsite.id
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze image');
      }
      if (data.success && data.results && data.results[0]?.description) {
        setAiAnalysis(data.results[0].description);
      } else {
        setAiAnalysis('No analysis result returned.');
      }
    } catch (error: any) {
      setAnalysisError(error.message || 'Failed to analyze image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label>Select an image</Label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              fetchMediaLibraryImages();
              setIsMediaLibraryOpen(true);
            }}
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Choose from Media Library
          </Button>
          <div className="relative">
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
              className="hidden"
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => document.getElementById('image')?.click()}
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload New Image
            </Button>
          </div>
        </div>
      </div>

      {(selectedFile || selectedLibraryImage) && (
        <div className="flex items-start gap-4 mt-4">
          {/* Image preview */}
          <img
            src={selectedFile ? URL.createObjectURL(selectedFile) : selectedLibraryImage?.url}
            alt={selectedFile ? selectedFile.name : selectedLibraryImage?.name}
            className="w-64 h-48 object-cover rounded border"
            style={{ minWidth: 256, minHeight: 192 }}
          />
          {/* Image details */}
          <div className="flex flex-col gap-2">
            <div><strong>File name:</strong> {selectedFile ? selectedFile.name : selectedLibraryImage?.name}</div>
            {selectedLibraryImage?.description && (
              <div><strong>Description:</strong> {selectedLibraryImage.description}</div>
            )}
            {selectedLibraryImage?.id && (
              <div><strong>Image ID:</strong> {selectedLibraryImage.id}</div>
            )}
            {/* Analyze with AI button - only for library images */}
            {selectedLibraryImage?.id && (
              <Button onClick={handleAnalyzeImage} disabled={isAnalyzing} variant="secondary" className="mt-2 w-fit">
                {isAnalyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-2" />}
                Analyze image with AI
              </Button>
            )}
            {aiAnalysis && (
              <div className="mt-2 p-2 bg-muted rounded border text-sm">
                <strong>AI Analysis:</strong>
                <div>{aiAnalysis}</div>
              </div>
            )}
            {analysisError && (
              <div className="mt-2 text-red-600 text-sm">{analysisError}</div>
            )}
          </div>
        </div>
      )}

      <Button 
        onClick={handleGenerateFromMedia}
        disabled={isUploading}
        className="w-full"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <ImageIcon className="h-4 w-4 mr-2" />
            Generate from Image
          </>
        )}
      </Button>

      <Dialog open={isMediaLibraryOpen} onOpenChange={setIsMediaLibraryOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Select an image from your media library</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
              {mediaLibraryImages.map((image) => (
                <div
                  key={image.id}
                  className={`relative aspect-video rounded-lg overflow-hidden cursor-pointer group ${
                    selectedLibraryImage?.id === image.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedLibraryImage(image)}
                >
                  <img
                    src={image.url}
                    alt={image.name}
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                    <h4 className="text-white text-sm font-medium truncate">
                      {image.name}
                    </h4>
                    {image.description && (
                      <p className="text-white/80 text-xs truncate">
                        {image.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsMediaLibraryOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setIsMediaLibraryOpen(false);
              }}
              disabled={!selectedLibraryImage}
            >
              Use Selected Image
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GeneratePostIdeasFromImages; 