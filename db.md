[
  {
    "table_name": "image_generation_queue",
    "column_name": "id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "image_generation_queue",
    "column_name": "post_theme_id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "image_generation_queue",
    "column_name": "website_id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "image_generation_queue",
    "column_name": "status",
    "data_type": "text",
    "check_clause": "((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])))"
  },
  {
    "table_name": "image_generation_queue",
    "column_name": "error",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "image_generation_queue",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "check_clause": null
  },
  {
    "table_name": "image_generation_queue",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "check_clause": null
  },
  {
    "table_name": "image_generation_queue",
    "column_name": "completed_at",
    "data_type": "timestamp with time zone",
    "check_clause": null
  },
  {
    "table_name": "image_generation_queue",
    "column_name": "image_url",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "image_generation_queue",
    "column_name": "user_token",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "organisation_memberships",
    "column_name": "id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "organisation_memberships",
    "column_name": "member_id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "organisation_memberships",
    "column_name": "organisation_id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "organisation_memberships",
    "column_name": "role",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "organisation_memberships",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "check_clause": null
  },
  {
    "table_name": "organisation_memberships",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "check_clause": null
  },
  {
    "table_name": "organisations",
    "column_name": "id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "organisations",
    "column_name": "id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "organisations",
    "column_name": "name",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "organisations",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "check_clause": null
  },
  {
    "table_name": "post_theme_categories",
    "column_name": "id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "post_theme_categories",
    "column_name": "post_theme_id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "post_theme_categories",
    "column_name": "wordpress_category_id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "post_theme_categories",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "check_clause": null
  },
  {
    "table_name": "post_themes",
    "column_name": "id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "post_themes",
    "column_name": "id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "post_themes",
    "column_name": "id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "post_themes",
    "column_name": "id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "post_themes",
    "column_name": "website_id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "post_themes",
    "column_name": "subject_matter",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "post_themes",
    "column_name": "keywords",
    "data_type": "ARRAY",
    "check_clause": null
  },
  {
    "table_name": "post_themes",
    "column_name": "status",
    "data_type": "text",
    "check_clause": "((status = ANY (ARRAY['pending'::text, 'approved'::text, 'published'::text, 'textgenerated'::text, 'generated'::text, 'declined'::text, 'generatingidea'::text])))"
  },
  {
    "table_name": "post_themes",
    "column_name": "status",
    "data_type": "text",
    "check_clause": "((status = ANY (ARRAY['pending'::text, 'approved'::text, 'generated'::text, 'published'::text, 'declined'::text, 'generatingidea'::text, 'textgenerated'::text])))"
  },
  {
    "table_name": "post_themes",
    "column_name": "status",
    "data_type": "text",
    "check_clause": "((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])))"
  },
  {
    "table_name": "post_themes",
    "column_name": "scheduled_date",
    "data_type": "timestamp with time zone",
    "check_clause": null
  },
  {
    "table_name": "post_themes",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "check_clause": null
  },
  {
    "table_name": "post_themes",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "check_clause": null
  },
  {
    "table_name": "post_themes",
    "column_name": "image",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "post_themes",
    "column_name": "post_content",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "post_themes",
    "column_name": "wp_post_id",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "post_themes",
    "column_name": "wp_post_url",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "post_themes",
    "column_name": "wp_sent_date",
    "data_type": "date",
    "check_clause": null
  },
  {
    "table_name": "post_themes",
    "column_name": "wp_image_url",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "publication_settings",
    "column_name": "id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "publication_settings",
    "column_name": "organisation_id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "publication_settings",
    "column_name": "publication_frequency",
    "data_type": "integer",
    "check_clause": null
  },
  {
    "table_name": "publication_settings",
    "column_name": "writing_style",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "publication_settings",
    "column_name": "subject_matters",
    "data_type": "jsonb",
    "check_clause": null
  },
  {
    "table_name": "publication_settings",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "check_clause": null
  },
  {
    "table_name": "publication_settings",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "check_clause": null
  },
  {
    "table_name": "publication_settings",
    "column_name": "website_id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "publication_settings",
    "column_name": "wordpress_template",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "publication_settings",
    "column_name": "image_prompt",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "publication_settings",
    "column_name": "image_model",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "publication_settings",
    "column_name": "negative_prompt",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "publish_queue",
    "column_name": "id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "publish_queue",
    "column_name": "post_theme_id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "publish_queue",
    "column_name": "status",
    "data_type": "text",
    "check_clause": "((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])))"
  },
  {
    "table_name": "publish_queue",
    "column_name": "status",
    "data_type": "text",
    "check_clause": "((status = ANY (ARRAY['pending'::text, 'approved'::text, 'published'::text, 'textgenerated'::text, 'generated'::text, 'declined'::text, 'generatingidea'::text])))"
  },
  {
    "table_name": "publish_queue",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "check_clause": null
  },
  {
    "table_name": "publish_queue",
    "column_name": "started_at",
    "data_type": "timestamp with time zone",
    "check_clause": null
  },
  {
    "table_name": "publish_queue",
    "column_name": "completed_at",
    "data_type": "timestamp with time zone",
    "check_clause": null
  },
  {
    "table_name": "publish_queue",
    "column_name": "result",
    "data_type": "jsonb",
    "check_clause": null
  },
  {
    "table_name": "publish_queue",
    "column_name": "error",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "publish_queue",
    "column_name": "user_token",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "website_access",
    "column_name": "id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "website_access",
    "column_name": "user_id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "website_access",
    "column_name": "website_id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "website_access",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "check_clause": null
  },
  {
    "table_name": "website_content",
    "column_name": "id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "website_content",
    "column_name": "website_id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "website_content",
    "column_name": "url",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "website_content",
    "column_name": "title",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "website_content",
    "column_name": "content",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "website_content",
    "column_name": "content_type",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "website_content",
    "column_name": "last_fetched",
    "data_type": "timestamp with time zone",
    "check_clause": null
  },
  {
    "table_name": "website_content",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "check_clause": null
  },
  {
    "table_name": "website_content",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "check_clause": null
  },
  {
    "table_name": "website_content",
    "column_name": "metadata",
    "data_type": "jsonb",
    "check_clause": null
  },
  {
    "table_name": "website_content",
    "column_name": "is_cornerstone",
    "data_type": "boolean",
    "check_clause": null
  },
  {
    "table_name": "websites",
    "column_name": "id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "websites",
    "column_name": "id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "websites",
    "column_name": "id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "websites",
    "column_name": "id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "websites",
    "column_name": "id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "websites",
    "column_name": "id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "websites",
    "column_name": "id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "websites",
    "column_name": "id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "websites",
    "column_name": "name",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "websites",
    "column_name": "url",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "websites",
    "column_name": "organisation_id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "websites",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "check_clause": null
  },
  {
    "table_name": "websites",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "check_clause": null
  },
  {
    "table_name": "websites",
    "column_name": "language",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "websites",
    "column_name": "enable_ai_image_generation",
    "data_type": "boolean",
    "check_clause": null
  },
  {
    "table_name": "websites",
    "column_name": "image_prompt",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "websites",
    "column_name": "page_import_limit",
    "data_type": "integer",
    "check_clause": null
  },
  {
    "table_name": "websites",
    "column_name": "key_content_limit",
    "data_type": "integer",
    "check_clause": null
  },
  {
    "table_name": "wordpress_categories",
    "column_name": "id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "wordpress_categories",
    "column_name": "id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "wordpress_categories",
    "column_name": "website_id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "wordpress_categories",
    "column_name": "wp_category_id",
    "data_type": "integer",
    "check_clause": null
  },
  {
    "table_name": "wordpress_categories",
    "column_name": "name",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "wordpress_categories",
    "column_name": "slug",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "wordpress_categories",
    "column_name": "description",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "wordpress_categories",
    "column_name": "parent_id",
    "data_type": "integer",
    "check_clause": null
  },
  {
    "table_name": "wordpress_categories",
    "column_name": "count",
    "data_type": "integer",
    "check_clause": null
  },
  {
    "table_name": "wordpress_categories",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "check_clause": null
  },
  {
    "table_name": "wordpress_categories",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "check_clause": null
  },
  {
    "table_name": "wordpress_settings",
    "column_name": "id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "wordpress_settings",
    "column_name": "website_id",
    "data_type": "uuid",
    "check_clause": null
  },
  {
    "table_name": "wordpress_settings",
    "column_name": "wp_url",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "wordpress_settings",
    "column_name": "wp_username",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "wordpress_settings",
    "column_name": "wp_application_password",
    "data_type": "text",
    "check_clause": null
  },
  {
    "table_name": "wordpress_settings",
    "column_name": "is_connected",
    "data_type": "boolean",
    "check_clause": null
  },
  {
    "table_name": "wordpress_settings",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "check_clause": null
  },
  {
    "table_name": "wordpress_settings",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "check_clause": null
  },
  {
    "table_name": "wordpress_settings",
    "column_name": "publish_status",
    "data_type": "text",
    "check_clause": null
  }
]