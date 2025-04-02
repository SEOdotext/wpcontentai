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
    

