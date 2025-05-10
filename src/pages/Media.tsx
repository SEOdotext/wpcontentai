import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWebsites } from '@/context/WebsitesContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Upload, Image as ImageIcon, Info, Download, Wand2, Globe2, Bot, Library, Globe, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { SidebarProvider } from '@/components/ui/sidebar';
import Header from '@/components/Header';
import AppSidebar from '@/components/Sidebar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ImageSource = 'upload' | 'ai_generated' | 'external_url' | 'scraped' | 'stock_library' | 'other';

interface ImageItem {
  id: string;
  name: string;
  url: string;
  created_at: string;
  size: number;
  type: string;
  source: ImageSource;
  website_id: string;
  description?: string;
  metadata?: {
    width?: number;
    height?: number;
    alt?: string;
    caption?: string;
    originalName?: string;
    fileType?: string;
    fileSize?: number;
    [key: string]: any;
  };
}

const sourceIcons = {
  upload: Upload,
  ai_generated: Wand2,
  external_url: Globe2,
  scraped: Bot,
  stock_library: Library,
  other: Download,
};

const sourceLabels = {
  upload: 'Uploaded',
  ai_generated: 'AI Generated',
  scraped: 'Scraped',
  stock_library: 'Stock Library',
  other: 'Other',
};

export default function Media() {
  const { currentWebsite } = useWebsites();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [description, setDescription] = useState('');
  const [selectedSource, setSelectedSource] = useState<ImageSource | 'all'>('all');
  const [isScraping, setIsScraping] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<ImageItem | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (currentWebsite) {
      fetchImages();
    }
  }, [currentWebsite]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      console.log('Fetching images for website:', currentWebsite?.id);

      // Fetch all images from the images table
      const { data: images, error } = await supabase
        .from('images')
        .select('*')
        .eq('website_id', currentWebsite?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Fetched images:', images?.length || 0);

      setImages(images || []);
    } catch (error) {
      console.error('Error fetching images:', error);
      toast.error('Failed to load image library');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentWebsite) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    const uploadToast = toast.loading('Uploading image...');

    try {
      // Generate a unique filename
      const timestamp = new Date().getTime();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const fileName = `${timestamp}_${randomString}_${sanitizedOriginalName}`;
      const filePath = `${currentWebsite.id}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error('Failed to upload image to storage');
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      // Get image dimensions
      const metadata: ImageItem['metadata'] = {
        originalName: file.name,
        fileType: file.type,
        fileSize: file.size,
      };

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = () => {
          metadata.width = img.width;
          metadata.height = img.height;
          URL.revokeObjectURL(img.src);
          resolve(null);
        };
        img.onerror = () => {
          URL.revokeObjectURL(img.src);
          reject(new Error('Failed to load image for dimension calculation'));
        };
        img.src = URL.createObjectURL(file);
      });

      // Save image record to database
      const { error: dbError } = await supabase
        .from('images')
        .insert({
          website_id: currentWebsite.id,
          name: file.name,
          url: publicUrl,
          size: file.size,
          type: file.type,
          source: 'upload',
          metadata
        });

      if (dbError) {
        // If database insert fails, clean up the uploaded file
        await supabase.storage
          .from('images')
          .remove([filePath]);
        throw dbError;
      }

      toast.dismiss(uploadToast);
      toast.success('Image uploaded successfully');
      await fetchImages(); // Refresh the image list
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.dismiss(uploadToast);
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
    }
  };

  const handleUpdateDescription = async () => {
    if (!selectedImage) return;

    try {
      const { error } = await supabase
        .from('images')
        .update({ description })
        .eq('id', selectedImage.id);

      if (error) throw error;

      toast.success('Description updated successfully');
      fetchImages();
      setSelectedImage(null);
    } catch (error) {
      console.error('Error updating description:', error);
      toast.error('Failed to update description');
    }
  };

  const handleScrapeImages = async () => {
    if (!currentWebsite?.url) {
      toast.error('No website URL configured');
      return;
    }

    setIsScraping(true);
    const scrapeToast = toast.loading('Scraping images from website...');

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-website-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          website_url: currentWebsite.url,
          user_id: currentWebsite.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scrape images');
      }

      toast.dismiss(scrapeToast);
      toast.success(`Successfully imported ${data.imported_count} images`);
      await fetchImages(); // Refresh the image list
    } catch (error) {
      console.error('Error scraping images:', error);
      toast.dismiss(scrapeToast);
      toast.error(error instanceof Error ? error.message : 'Failed to scrape images');
    } finally {
      setIsScraping(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!imageToDelete || !currentWebsite) return;

    const deleteToast = toast.loading('Deleting image...');

    try {
      // Extract the file path from the URL
      const url = new URL(imageToDelete.url);
      const filePath = url.pathname.split('/').slice(-2).join('/'); // Gets the last two parts of the path

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('images')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        throw new Error('Failed to delete image from storage');
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('images')
        .delete()
        .eq('id', imageToDelete.id);

      if (dbError) {
        console.error('Database delete error:', dbError);
        throw new Error('Failed to delete image record');
      }

      toast.dismiss(deleteToast);
      toast.success('Image deleted successfully');
      await fetchImages(); // Refresh the image list
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.dismiss(deleteToast);
      toast.error(error instanceof Error ? error.message : 'Failed to delete image');
    } finally {
      setImageToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedImages.size === 0 || !currentWebsite) return;

    const deleteToast = toast.loading(`Deleting ${selectedImages.size} images...`);

    try {
      // Get the images to delete
      const imagesToDelete = images.filter(img => selectedImages.has(img.id));
      
      // Delete from storage
      const filePaths = imagesToDelete.map(img => {
        const url = new URL(img.url);
        return url.pathname.split('/').slice(-2).join('/');
      });

      const { error: storageError } = await supabase.storage
        .from('images')
        .remove(filePaths);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        throw new Error('Failed to delete some images from storage');
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('images')
        .delete()
        .in('id', Array.from(selectedImages));

      if (dbError) {
        console.error('Database delete error:', dbError);
        throw new Error('Failed to delete some image records');
      }

      toast.dismiss(deleteToast);
      toast.success(`Successfully deleted ${selectedImages.size} images`);
      setSelectedImages(new Set());
      await fetchImages(); // Refresh the image list
    } catch (error) {
      console.error('Error deleting images:', error);
      toast.dismiss(deleteToast);
      toast.error(error instanceof Error ? error.message : 'Failed to delete images');
    }
  };

  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  const handleAnalyzeImages = async () => {
    if (selectedImages.size === 0 || !currentWebsite) return;

    setIsAnalyzing(true);
    const analyzeToast = toast.loading(`Analyzing ${selectedImages.size} images...`);

    try {
      // Log the current state
      console.log('Current state:', {
        selectedImages: Array.from(selectedImages),
        currentWebsite: {
          id: currentWebsite.id,
          name: currentWebsite.name
        },
        images: images.map(img => ({
          id: img.id,
          name: img.name,
          website_id: img.website_id
        }))
      });

      // Verify that selected images exist and belong to the current website
      const validImageIds = Array.from(selectedImages).filter(id => 
        images.some(img => img.id === id && img.website_id === currentWebsite.id)
      );

      if (validImageIds.length === 0) {
        throw new Error('No valid images selected for the current website');
      }

      console.log('Analyzing images:', {
        image_ids: validImageIds,
        website_id: currentWebsite.id
      });

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          image_ids: validImageIds,
          website_id: currentWebsite.id
        })
      });

      const data = await response.json();
      console.log('Analysis response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze images');
      }

      toast.dismiss(analyzeToast);
      const successCount = data.results?.filter(r => r.success).length || 0;
      console.log('Analysis results:', {
        total: data.results?.length || 0,
        success: successCount,
        failed: (data.results?.length || 0) - successCount
      });
      
      if (successCount === 0) {
        toast.error('No images were successfully analyzed. Please try again.');
      } else {
        toast.success(`Successfully analyzed ${successCount} images`);
      }
      
      await fetchImages(); // Refresh the image list
    } catch (error) {
      console.error('Error analyzing images:', error);
      toast.dismiss(analyzeToast);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze images');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredImages = images.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = selectedSource === 'all' || item.source === selectedSource;
    return matchesSearch && matchesSource;
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 px-4 py-6 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <h1 className="text-2xl font-bold">Image library</h1>
                  {selectedImages.size > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {selectedImages.size} selected
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAnalyzeImages}
                        disabled={isAnalyzing}
                      >
                        <Wand2 className="h-4 w-4 mr-2" />
                        {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete selected
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  <Select
                    value={selectedSource}
                    onValueChange={(value) => setSelectedSource(value as ImageSource | 'all')}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Filter by source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sources</SelectItem>
                      {Object.entries(sourceLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search images..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-[200px]"
                    />
                  </div>
                  <Button 
                    variant="outline"
                    onClick={handleScrapeImages}
                    disabled={isScraping || !currentWebsite?.url}
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    {isScraping ? 'Scraping...' : 'Scrape website'}
                  </Button>
                  <Button asChild>
                    <label className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload images
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="aspect-video bg-muted rounded-md" />
                        <div className="h-4 bg-muted rounded mt-2 w-3/4" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredImages.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No images found</h3>
                  <p className="text-muted-foreground mt-2">
                    {searchQuery ? 'Try a different search term' : 'Upload your first image'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredImages.map((item) => (
                    <Dialog key={item.id}>
                      <Card className={`overflow-hidden group relative ${selectedImages.has(item.id) ? 'ring-2 ring-primary' : ''}`}>
                        <CardContent className="p-0">
                          <div className="aspect-video relative">
                            <img
                              src={item.url}
                              alt={item.description || item.name}
                              className="object-cover w-full h-full"
                            />
                            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedImage(item);
                                    setDescription(item.description || '');
                                  }}
                                  className="bg-black/50 hover:bg-black/70 text-white"
                                >
                                  <Info className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="bg-black/50 hover:bg-black/70 text-white hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setImageToDelete(item);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div 
                              className="absolute inset-0 cursor-pointer"
                              style={{ top: '40px' }}
                              onClick={() => toggleImageSelection(item.id)}
                            />
                            {selectedImages.has(item.id) && (
                              <div className="absolute top-2 left-2">
                                <div className="bg-primary text-primary-foreground rounded-full p-1">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4"
                                  >
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <div className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              <p className="font-medium truncate">{item.name}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {React.createElement(sourceIcons[item.source], { className: "h-3 w-3 text-muted-foreground" })}
                              <p className="text-xs text-muted-foreground">{sourceLabels[item.source]}</p>
                            </div>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1 truncate">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>Image details</DialogTitle>
                          <DialogDescription>
                            Add a description and view image details
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <img
                              src={item.url}
                              alt={item.description || item.name}
                              className="w-full rounded-lg"
                            />
                          </div>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Description</label>
                              <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add a description..."
                                className="min-h-[100px]"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="font-medium">Source</p>
                                <p className="text-muted-foreground">{sourceLabels[item.source]}</p>
                              </div>
                              {item.metadata?.width && item.metadata?.height && (
                                <div>
                                  <p className="font-medium">Dimensions</p>
                                  <p className="text-muted-foreground">
                                    {item.metadata.width} × {item.metadata.height}
                                  </p>
                                </div>
                              )}
                              <div>
                                <p className="font-medium">Size</p>
                                <p className="text-muted-foreground">
                                  {(item.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              <div>
                                <p className="font-medium">Type</p>
                                <p className="text-muted-foreground">{item.type}</p>
                              </div>
                            </div>
                            <Button onClick={handleUpdateDescription} className="w-full">
                              Save changes
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      <AlertDialog open={!!imageToDelete} onOpenChange={() => setImageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteImage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
} 