-- Create the image generation queue table
create table "public"."image_generation_queue" (
    "id" uuid not null default gen_random_uuid(),
    "post_theme_id" uuid not null,
    "website_id" uuid not null,
    "status" text not null default 'pending',
    "error" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "completed_at" timestamp with time zone,
    "image_url" text,
    "user_token" text not null,
    constraint "image_generation_queue_pkey" primary key ("id"),
    constraint "image_generation_queue_post_theme_id_fkey" foreign key ("post_theme_id") references "public"."post_themes"("id") on delete cascade,
    constraint "image_generation_queue_website_id_fkey" foreign key ("website_id") references "public"."websites"("id") on delete cascade,
    constraint "image_generation_queue_status_check" check (status in ('pending', 'processing', 'completed', 'failed'))
);

-- Enable Row Level Security
alter table "public"."image_generation_queue" enable row level security;

-- Create RLS policies
create policy "Enable read access for authenticated users"
    on "public"."image_generation_queue"
    for select
    to authenticated
    using (true);

create policy "Enable insert access for authenticated users"
    on "public"."image_generation_queue"
    for insert
    to authenticated
    with check (true);

create policy "Enable update access for authenticated users"
    on "public"."image_generation_queue"
    for update
    to authenticated
    using (true);

-- Create an index on post_theme_id for faster lookups
create index "image_generation_queue_post_theme_id_idx" on "public"."image_generation_queue" ("post_theme_id");

-- Create a function to update updated_at timestamp
create or replace function "public"."handle_updated_at"()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create a trigger to automatically update updated_at
create trigger "set_updated_at"
    before update on "public"."image_generation_queue"
    for each row
    execute function "public"."handle_updated_at"();

-- Enable realtime for this table
alter publication supabase_realtime add table "public"."image_generation_queue";
