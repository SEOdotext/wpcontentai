[
  {
    "schemaname": "public",
    "tablename": "user_profiles",
    "policyname": "Users can view profiles in their organization",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM (organisation_memberships om1\n     JOIN organisation_memberships om2 ON ((om1.organisation_id = om2.organisation_id)))\n  WHERE ((om1.member_id = auth.uid()) AND (om2.member_id = user_profiles.id))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "user_profiles",
    "policyname": "Admins can manage users in their organization",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM (organisation_memberships om1\n     JOIN organisation_memberships om2 ON ((om1.organisation_id = om2.organisation_id)))\n  WHERE ((om1.member_id = auth.uid()) AND (om1.role = 'admin'::text) AND (om2.member_id = user_profiles.id))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "websites",
    "policyname": "Users can view websites in their organization",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM organisation_memberships\n  WHERE ((organisation_memberships.member_id = auth.uid()) AND (organisation_memberships.organisation_id = websites.organisation_id))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "websites",
    "policyname": "Users can manage websites in their organization",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM organisation_memberships\n  WHERE ((organisation_memberships.member_id = auth.uid()) AND (organisation_memberships.organisation_id = websites.organisation_id))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "publication_settings",
    "policyname": "Users can manage publication settings for their organization",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM organisation_memberships\n  WHERE ((organisation_memberships.member_id = auth.uid()) AND (organisation_memberships.organisation_id = publication_settings.organisation_id))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "websites",
    "policyname": "Allow users to view websites",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": null,
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "websites",
    "policyname": "Allow users to insert websites",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "wordpress_settings",
    "policyname": "Users can manage WordPress settings for their websites",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM (organisation_memberships om\n     JOIN websites w ON ((w.organisation_id = om.organisation_id)))\n  WHERE ((om.member_id = auth.uid()) AND (w.id = wordpress_settings.website_id))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "website_content",
    "policyname": "Users can manage website content",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM (organisation_memberships om\n     JOIN websites w ON ((w.organisation_id = om.organisation_id)))\n  WHERE ((om.member_id = auth.uid()) AND (w.id = website_content.website_id))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "websites",
    "policyname": "Users can access websites",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": null,
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "publication_settings",
    "policyname": "Users can access publication settings",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": null,
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "websites",
    "policyname": "Users can view websites",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "websites",
    "policyname": "Users can create websites",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "websites",
    "policyname": "Users can update own websites",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "websites",
    "policyname": "Users can delete own websites",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "publication_settings",
    "policyname": "Users can view all publication settings",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "publication_settings",
    "policyname": "Users can update publication settings",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "publication_settings",
    "policyname": "Users can create publication settings",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "publication_settings",
    "policyname": "Users can delete publication settings",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "organisations",
    "policyname": "Users can create organisations",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "user_profiles",
    "policyname": "Users can manage their own profile",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(auth.uid() = id)",
    "with_check": "(auth.uid() = id)"
  },
  {
    "schemaname": "public",
    "tablename": "post_themes",
    "policyname": "Users can manage post themes",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM (organisation_memberships om\n     JOIN websites w ON ((w.organisation_id = om.organisation_id)))\n  WHERE ((om.member_id = auth.uid()) AND (w.id = post_themes.website_id))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "website_access",
    "policyname": "Users can manage website access",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM ((organisation_memberships om1\n     JOIN organisation_memberships om2 ON ((om1.organisation_id = om2.organisation_id)))\n     JOIN websites w ON ((w.organisation_id = om1.organisation_id)))\n  WHERE ((om1.member_id = auth.uid()) AND (om1.role = 'admin'::text) AND (om2.member_id = website_access.user_id) AND (w.id = website_access.website_id))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "organisations",
    "policyname": "Allow insert organisations",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "organisations",
    "policyname": "Allow select organisations",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "user_profiles",
    "policyname": "Allow manage own profile",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(id = auth.uid())",
    "with_check": "(id = auth.uid())"
  },
  {
    "schemaname": "public",
    "tablename": "organisations",
    "policyname": "Users can manage their own organisation",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM organisation_memberships\n  WHERE ((organisation_memberships.member_id = auth.uid()) AND (organisation_memberships.organisation_id = organisations.id))))",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Authenticated users can update their images",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "((bucket_id = 'post-images'::text) AND (auth.role() = 'authenticated'::text))",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Authenticated users can delete their images",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "((bucket_id = 'post-images'::text) AND (auth.role() = 'authenticated'::text))",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Allow service role to upload images",
    "permissive": "PERMISSIVE",
    "roles": "{service_role}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(bucket_id = 'blog-images'::text)"
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Allow public to read images",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(bucket_id = 'blog-images'::text)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "organisation_memberships",
    "policyname": "Users can view their own memberships",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(member_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "organisation_memberships",
    "policyname": "Users can insert themselves into organisations",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(member_id = auth.uid())"
  },
  {
    "schemaname": "public",
    "tablename": "organisation_memberships",
    "policyname": "Admins can manage memberships in their organisations",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "((member_id = auth.uid()) AND (role = 'admin'::text))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "organisation_memberships",
    "policyname": "Only admins can invite users",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM organisation_memberships organisation_memberships_1\n  WHERE ((organisation_memberships_1.member_id = auth.uid()) AND (organisation_memberships_1.organisation_id = organisation_memberships_1.organisation_id) AND (organisation_memberships_1.role = 'admin'::text))))"
  },
  {
    "schemaname": "public",
    "tablename": "website_access",
    "policyname": "Only admins can manage website access",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM (organisation_memberships om\n     JOIN websites w ON ((w.organisation_id = om.organisation_id)))\n  WHERE ((om.member_id = auth.uid()) AND (om.role = 'admin'::text) AND (w.id = website_access.website_id))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "post_theme_categories",
    "policyname": "Users can view post theme categories",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM (post_themes pt\n     JOIN website_access wa ON ((wa.website_id = pt.website_id)))\n  WHERE ((wa.user_id = auth.uid()) AND (pt.id = post_theme_categories.post_theme_id))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "post_theme_categories",
    "policyname": "Users can insert post theme categories",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM (post_themes pt\n     JOIN website_access wa ON ((wa.website_id = pt.website_id)))\n  WHERE ((wa.user_id = auth.uid()) AND (pt.id = post_theme_categories.post_theme_id))))"
  },
  {
    "schemaname": "public",
    "tablename": "post_theme_categories",
    "policyname": "Users can delete post theme categories",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "(EXISTS ( SELECT 1\n   FROM (post_themes pt\n     JOIN website_access wa ON ((wa.website_id = pt.website_id)))\n  WHERE ((wa.user_id = auth.uid()) AND (pt.id = post_theme_categories.post_theme_id))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "publish_queue",
    "policyname": "Allow authenticated users to read publish_queue",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "publish_queue",
    "policyname": "Allow service role to manage publish_queue",
    "permissive": "PERMISSIVE",
    "roles": "{service_role}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": "true"
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Authenticated users can upload images",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((bucket_id = 'post-images'::text) AND (auth.role() = 'authenticated'::text))"
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Public Access",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(bucket_id = 'post-images'::text)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "image_generation_queue",
    "policyname": "Enable read access for authenticated users",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "image_generation_queue",
    "policyname": "Enable insert access for authenticated users",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "image_generation_queue",
    "policyname": "Enable update access for authenticated users",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "post_themes",
    "policyname": "Users can view their own post themes",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(website_id IN ( SELECT website_access.website_id\n   FROM website_access\n  WHERE (website_access.user_id = auth.uid())))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "post_themes",
    "policyname": "Users can insert their own post themes",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(website_id IN ( SELECT website_access.website_id\n   FROM website_access\n  WHERE (website_access.user_id = auth.uid())))"
  },
  {
    "schemaname": "public",
    "tablename": "post_themes",
    "policyname": "Users can update their own post themes",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(website_id IN ( SELECT website_access.website_id\n   FROM website_access\n  WHERE (website_access.user_id = auth.uid())))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "post_themes",
    "policyname": "Users can delete their own post themes",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "(website_id IN ( SELECT website_access.website_id\n   FROM website_access\n  WHERE (website_access.user_id = auth.uid())))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "user_profiles",
    "policyname": "Users can update their own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "publish_queue",
    "policyname": "Service role can do everything",
    "permissive": "PERMISSIVE",
    "roles": "{service_role}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "publish_queue",
    "policyname": "Users can view their own queue items",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(post_theme_id IN ( SELECT post_themes.id\n   FROM post_themes\n  WHERE (post_themes.website_id IN ( SELECT website_access.website_id\n           FROM website_access\n          WHERE (website_access.user_id = auth.uid())))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "publish_queue",
    "policyname": "Users can insert their own queue items",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(post_theme_id IN ( SELECT post_themes.id\n   FROM post_themes\n  WHERE (post_themes.website_id IN ( SELECT website_access.website_id\n           FROM website_access\n          WHERE (website_access.user_id = auth.uid())))))"
  },
  {
    "schemaname": "public",
    "tablename": "user_profiles",
    "policyname": "Users can view all profiles",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  }
]