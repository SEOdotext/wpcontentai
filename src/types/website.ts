export interface Website {
  id: string;
  name: string;
  url: string;
  organisation_id: string;
  created_at: string;
  updated_at?: string;
  language?: string;
  enable_ai_image_generation?: boolean;
  image_prompt?: string;
  page_import_limit?: number;
  key_content_limit?: number;
} 