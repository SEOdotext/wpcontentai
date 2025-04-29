export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      some_settings: {
        Row: {
          id: string
          website_id: string
          platform: 'linkedin' | 'instagram' | 'tiktok' | 'facebook'
          tone: string | null
          format_preference: Json | null
          other_settings: Json | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          website_id: string
          platform: 'linkedin' | 'instagram' | 'tiktok' | 'facebook'
          tone?: string | null
          format_preference?: Json | null
          other_settings?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          website_id?: string
          platform?: 'linkedin' | 'instagram' | 'tiktok' | 'facebook'
          tone?: string | null
          format_preference?: Json | null
          other_settings?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      some_posts: {
        Row: {
          id: string
          website_id: string
          post_theme_id: string
          title: string
          content: string
          platform: 'linkedin' | 'instagram' | 'tiktok' | 'facebook'
          scheduled_time: string | null
          published_time: string | null
          status: 'draft' | 'scheduled' | 'published' | 'failed'
          media_urls: string[] | null
          platform_post_id: string | null
          error_message: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          website_id: string
          post_theme_id: string
          title: string
          content: string
          platform: 'linkedin' | 'instagram' | 'tiktok' | 'facebook'
          scheduled_time?: string | null
          published_time?: string | null
          status?: 'draft' | 'scheduled' | 'published' | 'failed'
          media_urls?: string[] | null
          platform_post_id?: string | null
          error_message?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          website_id?: string
          post_theme_id?: string
          title?: string
          content?: string
          platform?: 'linkedin' | 'instagram' | 'tiktok' | 'facebook'
          scheduled_time?: string | null
          published_time?: string | null
          status?: 'draft' | 'scheduled' | 'published' | 'failed'
          media_urls?: string[] | null
          platform_post_id?: string | null
          error_message?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      websites: {
        Row: {
          id: string
          name: string
          url: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          url: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          url?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export type Tables = {
  organisations: {
    Row: {
      id: string;
      name: string;
      created_at: string;
    };
  };
  post_themes: {
    Row: {
      id: string;
      website_id: string;
      subject_matter: string;
      keywords: string[];
      status: string;
      scheduled_date: string;
      created_at: string;
      updated_at: string;
      post_content: string | null;
      image: string | null;
      wp_post_id: string | null;
      wp_post_url: string | null;
      wp_sent_date: string | null;
      image_generation_error?: string | null;
    };
  };
  post_theme_categories: {
    Row: {
      id: string;
      post_theme_id: string;
      wordpress_category_id: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      post_theme_id: string;
      wordpress_category_id: string;
      created_at?: string;
    };
  };
  wordpress_categories: {
    Row: {
      id: string;
      website_id: string;
      wp_category_id: number;
      name: string;
      slug: string;
      description: string;
      parent_id: number;
      count: number;
      created_at: string;
      updated_at: string;
    };
  };
}; 