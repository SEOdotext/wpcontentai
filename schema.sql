[
  {
    "schemaname": "public",
    "tablename": "user_profiles",
    "policyname": "Users can view profiles in their organisation",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "((organisation_id IS NOT NULL) AND (organisation_id = ( SELECT user_profiles_1.organisation_id\n   FROM user_profiles user_profiles_1\n  WHERE (user_profiles_1.id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "user_profiles",
    "policyname": "Users can view their own profiles",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "user_profiles",
    "policyname": "Users can update own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "user_profiles",
    "policyname": "Users can view own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "user_profiles",
    "policyname": "Users can access own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "user_profiles",
    "policyname": "Users can view profiles in the same company",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(organisation_id IN ( SELECT user_profiles_1.organisation_id AS company_id\n   FROM user_profiles user_profiles_1\n  WHERE (user_profiles_1.id = auth.uid())))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "user_profiles",
    "policyname": "Users can view their own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(id = auth.uid())",
    "with_check": null
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
    "policyname": "Users can access publication settings",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": null,
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "publication_settings",
    "policyname": "Users can update publication settings for their company",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(organisation_id IN ( SELECT user_profiles.organisation_id AS company_id\n   FROM user_profiles\n  WHERE (user_profiles.id = auth.uid())))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "publication_settings",
    "policyname": "Users can view publication settings for their company",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(organisation_id IN ( SELECT user_profiles.organisation_id AS company_id\n   FROM user_profiles\n  WHERE (user_profiles.id = auth.uid())))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "organisations",
    "policyname": "Allow users to view companies they belong to",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(id IN ( SELECT user_profiles.organisation_id AS company_id\n   FROM user_profiles\n  WHERE (user_profiles.id = auth.uid())))",
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
    "policyname": "Users can access websites",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
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
    "tablename": "websites",
    "policyname": "Allow users to view websites",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": null,
    "with_check": null
  }
]