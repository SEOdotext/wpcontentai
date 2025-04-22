import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const transferDataToDatabase = async (userId: string) => {
  try {
    // Get required data from localStorage
    const websiteInfo = JSON.parse(localStorage.getItem('website_info') || '{}');
    const organisationInfo = JSON.parse(localStorage.getItem('organisation_info') || '{}');
    const publicationSettings = JSON.parse(localStorage.getItem('publication_settings') || '{}');
    const websiteContent = JSON.parse(localStorage.getItem('website_content') || '[]');
    const keyContentPages = JSON.parse(localStorage.getItem('key_content_pages') || '[]');
    const postIdeas = JSON.parse(localStorage.getItem('post_ideas') || '[]');
    const generatedContent = JSON.parse(localStorage.getItem('generated_content') || 'null');
    const scrapedContent = JSON.parse(localStorage.getItem('scraped_content') || '[]');
    const websiteUrl = localStorage.getItem('onboardingWebsite');

    if (!websiteUrl && !websiteInfo.url) {
      throw new Error('Website URL not found in localStorage');
    }

    // Get current session for authentication
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.access_token) {
      throw new Error('No active session found');
    }

    // Check for existing organisation
    const { data: existingOrgs } = await supabase
      .from('organisation_memberships')
      .select('organisation_id')
      .eq('member_id', userId)
      .single();
      
    if (existingOrgs?.organisation_id) {
      // Get organisation name
      const { data: orgData } = await supabase
        .from('organisations')
        .select('name')
        .eq('id', existingOrgs.organisation_id)
        .single();
        
      if (orgData) {
        // Use existing organisation instead of creating new one
        organisationInfo.id = existingOrgs.organisation_id;
        organisationInfo.name = orgData.name;
        
        // Update website info to link to existing org
        websiteInfo.organisation_id = existingOrgs.organisation_id;
        
        toast.info(
          "Adding to existing organisation",
          { description: `Website will be added to your organisation: ${orgData.name}` }
        );
      }
    }

    // Format data according to edge function requirements
    const data = {
      userId,
      websiteInfo: {
        url: websiteInfo.url || websiteUrl, // Ensure URL is always present
        name: websiteInfo.name || organisationInfo.name || 'Default Website',
        organization_id: organisationInfo.id || null,
        created_at: websiteInfo.created_at || new Date().toISOString(),
        id: websiteInfo.id
      },
      organisationInfo: {
        id: organisationInfo.id || null,
        name: organisationInfo.name || websiteInfo.name || 'Default Organisation',
        created_at: organisationInfo.created_at || new Date().toISOString(),
        owner_id: userId,
        status: 'active'
      },
      publicationSettings: {
        ...publicationSettings,
        posting_frequency: publicationSettings.posting_frequency || 3,
        posting_days: publicationSettings.posting_days || [{ day: 'monday', count: 1 }],
        writing_style: publicationSettings.writing_style || 'professional'
      },
      contentData: {
        postIdeas: postIdeas
          .filter(idea => idea.liked && (!generatedContent || idea.title !== generatedContent.title))
          .map(idea => ({
            title: idea.title,
            subject_matter: idea.title,
            post_content: '',
            tags: idea.tags || [],
            liked: true,
            status: 'approved',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            scheduled_date: null
          })),
        generatedContent: generatedContent ? {
          title: generatedContent.title,
          subject_matter: generatedContent.title,
          post_content: generatedContent.content,
          status: 'textgenerated',
          tags: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          scheduled_date: null
        } : null,
        websiteContent: websiteContent.map(content => ({
          url: content.url,
          title: content.title,
          content: content.content || '',
          content_type: content.content_type || 'page',
          metadata: {
            digest: content.digest || null,
            is_cornerstone: false
          },
          last_fetched: content.last_fetched || new Date().toISOString()
        })),
        keyContentPages: keyContentPages.map(page => ({
          id: page.id,
          url: page.url,
          title: page.title,
          reason: page.reason || null
        }))
      }
    };

    // Update websiteContent with scraped content
    if (scrapedContent.length > 0) {
      data.contentData.websiteContent = data.contentData.websiteContent.map(content => {
        const scraped = scrapedContent.find(s => 
          s.url === content.url || 
          s.original_url === content.url ||
          s.page_id === content.id
        );

        if (scraped) {
          return {
            ...content,
            content: scraped.content || content.content,
            metadata: {
              ...content.metadata,
              digest: scraped.digest || content.metadata?.digest
            }
          };
        }
        return content;
      });
    }

    // Mark key content pages as cornerstone
    if (data.contentData.keyContentPages?.length > 0) {
      data.contentData.websiteContent = data.contentData.websiteContent.map(content => {
        const isKeyContent = data.contentData.keyContentPages.some(keyPage => {
          const contentUrl = content.url?.replace(/\/$/, '').toLowerCase();
          const keyUrl = keyPage.url?.replace(/\/$/, '').toLowerCase();
          return contentUrl === keyUrl || content.id === keyPage.id;
        });

        if (isKeyContent) {
          return {
            ...content,
            metadata: {
              ...content.metadata,
              is_cornerstone: true
            }
          };
        }
        return content;
      });
    }

    // For Google auth users, we need to ensure we have website info
    if (!websiteUrl && !websiteInfo.url) {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData?.user?.email;
      if (email) {
        const domain = email.split('@')[1];
        websiteInfo.url = `https://${domain}`;
        websiteInfo.name = domain.split('.')[0];
        localStorage.setItem('website_info', JSON.stringify(websiteInfo));
      }
    }

    // Call the edge function
    console.log('Sending data to edge function:', JSON.stringify(data, null, 2));
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-user-onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    console.log('Edge function response:', result);

    if (!result.success) {
      throw new Error(result.message || 'Transfer failed');
    }

    // Store the organization ID in localStorage for proper initialization
    if (result.data?.organization_id) {
      console.log('Storing organization ID in localStorage:', result.data.organization_id);
      localStorage.setItem('current_organisation_id', result.data.organization_id);
      
      // Also store the full organization object for the OrganisationContext
      const organisationData = {
        id: result.data.organization_id,
        name: result.data.organization_name || organisationInfo.name || 'Default Organisation',
        created_at: new Date().toISOString()
      };
      console.log('Storing full organization data in localStorage:', organisationData);
      localStorage.setItem('currentOrganisation', JSON.stringify(organisationData));
      
      // Also store the website ID if available
      if (result.data.website_id) {
        console.log('Storing website ID in localStorage:', result.data.website_id);
        localStorage.setItem('currentWebsiteId', result.data.website_id);
      }
    }

    // Clear onboarding data from localStorage
    localStorage.removeItem('post_ideas');
    localStorage.removeItem('publication_settings');
    localStorage.removeItem('onboardingWebsite');
    localStorage.removeItem('key_content_pages');
    localStorage.removeItem('scraped_content');
    localStorage.removeItem('website_content');
    localStorage.removeItem('pending_signup');
    localStorage.removeItem('pending_user_id');
    
    toast.success('Data transfer completed successfully');
    
    // Return result without reloading the page
    return result;
  } catch (error) {
    console.error('Data transfer error:', error);
    toast.error(`Data transfer failed: ${error.message}`);
    throw error;
  }
}; 