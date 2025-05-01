1. Create an alternative function to do the scraping that uses Browserless.
My API should be set in secrets Use this API key to authenticate with all Browserless services. Include this token as a ?token=YOUR_TOKEN parameter in all API requests. is SELXtOuBuGAJTnf50aa81704b35371180f0c545964

2. This function should be activated if the first function comes back with no results.

3. So the logic is scrape-content comes back with "No digest could be generated ..." for a page, then we send it to the scrape-content-client-side function and this function returns the data from browserless.

4. The function scrape-content-client-side is almost like a copy of the scrape-content in the way it handles content.