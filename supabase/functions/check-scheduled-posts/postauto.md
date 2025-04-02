Now let's make sure we can create a cron system that will allow us to use the queue and the generate-and-publish on a daily basis. The function should start by just triggering the posts to the queue and ensure that we have the correct permissions for the operation.

Also the function checks if the 
  {
    "table_name": "wordpress_settings",
    "column_name": "is_connected",
    "data_type": "boolean" is set to TRUE
  },

  Then it checks if the statuses are in any of these statuses before handling them. 
  post_themes status = (ARRAY 'approved'::text, 'generated'::text,  'textgenerated'::text])

  if the status is generated skip text and image creation. 
  if textgenerated, skip the text creation.
  if approved, create text and image and send it


---

flowchart TD
    A[check-scheduled-posts] -->|"Checks scheduled date <= today"| AA{WP Connected?}
    AA -->|"No"| AAA[Skip website]
    AA -->|"Yes"| AB{Post Status?}
    AB -->|"approved"| AC[Queue for full processing]
    AB -->|"generated"| AD[Queue for publishing only]
    AB -->|"textgenerated"| AE[Queue for image + publishing]
    
    AC -->|Add to| B[publish_queue table]
    AD -->|Add to| B
    AE -->|Add to| B
    
    B -->|Queue item| C[process-publish-queue]
    C -->|"X-Queue-Processing: true"| D[generate-and-publish]
    
    D -->|Check status| DA{Need content?}
    DA -->|"Yes (approved)"| E[generate-content-v3]
    DA -->|"No (generated/textgenerated)"| DB{Need image?}
    
    E -->|Updates| F[post_themes table]
    E -->|Content done| DB
    
    DB -->|"Yes (approved/textgenerated)"| G[image_generation_queue table]
    DB -->|"No (generated)"| DC[Skip to WordPress]
    
    G -->|Queue item| H[process-image-queue]
    H -->|Generates image| I[image-trigger]
    I -->|Updates| F
    I -->|Image done| DC
    
    DC -->|Uses system token| J[wordpress-posts]
    J -->|"Checks WP settings"| JA[Format content]
    JA -->|"Basic Auth"| K[WordPress API]
    
    L[Frontend] -->|Manual publish| J
    L -->|Manual image gen| I
    
---



Update check-scheduled-posts function:
Add checks for WordPress connection status (is_connected = true)
Add filtering based on post status (approved, generated, textgenerated)
Add appropriate status flags to queue entries so the downstream functions know what processing to perform
Modify generate-and-publish function:
Add handling for the status flags from the queue
Skip content generation for generated and textgenerated posts
Skip image generation for generated posts
Update to use generate-content-v3 instead of v2
This approach requires only two files to be modified and preserves all the existing queue infrastructure while adding the conditional processing logic.
Implementation steps:
In check-scheduled-posts, when querying for scheduled posts, join with wordpress_settings and filter for is_connected = true
Add a processing_type field to the publish_queue table with values like "full", "publish_only", or "with_image"
In generate-and-publish, check the processing_type and conditionally skip content or image generation steps
