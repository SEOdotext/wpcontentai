export interface Database {
  public: {
    Tables: {
      websites: {
        Row: {
          id: string;
          enable_ai_image_generation: boolean;
        };
        Insert: {
          id: string;
          enable_ai_image_generation?: boolean;
        };
        Update: {
          id?: string;
          enable_ai_image_generation?: boolean;
        };
      };
      posts: {
        Row: {
          id: string;
          preview_image_url: string | null;
        };
        Insert: {
          id: string;
          preview_image_url?: string | null;
        };
        Update: {
          id?: string;
          preview_image_url?: string | null;
        };
      };
    };
  };
}

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  OPENAI_API_KEY: string;
}

export interface PagesFunctionContext {
  request: Request;
  env: Env;
} 