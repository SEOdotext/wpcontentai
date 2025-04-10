                <h2 className="text-2xl font-bold mb-4">
                  🔌 Connect to WordPress



                <p className="text-muted-foreground mb-8">
                  Connect your WordPress website to automatically publish content. We'll guide you through the process.


                <div className="space-y-6">
                  <div className="rounded-lg border bg-card p-4">
                    <h4 className="font-medium mb-2">Before you start:</h4>
                    <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                      <li>Make sure you're logged into your WordPress admin</li>
                      <li>You'll create a secure connection key that only ContentGardener.ai can use</li>
                      <li>This is more secure than using your admin password</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Create a Secure Connection</Label>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => {
                          if (!state.websiteUrl) {
                            sonnerToast("Error", {
                              description: 'Website URL is not configured'
                            });
                            return;
                          }
                          // Remove protocol if present and add https
                          const cleanUrl = state.websiteUrl.replace(/^https?:\/\//, '');
                          // Check if URL ends with /wp-admin or similar
                          const baseUrl = cleanUrl.replace(/\/(wp-admin|wp-login|wp-content).*$/, '');
                          window.open(`https://${baseUrl}/wp-admin/profile.php#application-passwords-section`, '_blank');
                        }}
                      >
                        <Key className="h-4 w-4 mr-2" />
                        Generate Connection Key in WordPress
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        This will open your WordPress admin in a new tab where you can generate a secure connection key.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={handleStartWordPressAuth}
                      >
                        <Link className="h-4 w-4 mr-2" />
                        Connect & Test
                      </Button>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon">
                              <HelpCircle className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-80">
                            <p>Connect to your WordPress site and test the connection immediately.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                      <p className="text-sm font-medium">What is a Connection Key?</p>



                        A connection key (or application password) is a secure way to let ContentGardener.ai connect to your WordPress site. 
                        Unlike your admin password, it has limited access and can be revoked at any time.



                    <div className="flex justify-end gap-4 mt-8">
                      <Button
                        variant="outline"
                        onClick={handleSkipWordPress}
                      >
                        Skip for now
                      </Button>


              </div>

              {/* WordPress Authentication Dialog */}
              <Dialog open={state.showWpAuthDialog} onOpenChange={(open) => setState(prev => ({ ...prev, showWpAuthDialog: open }))}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Connect to WordPress</DialogTitle>
                    <DialogDescription>
                      Enter your WordPress credentials to connect your site
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    {/* Add Generate Key Button at the top */}
                    <div className="rounded-lg border bg-muted/50 p-3 space-y-3">
                      <p className="text-sm font-medium">Need a connection key?</p>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => {
                          if (!state.websiteUrl) {
                            sonnerToast("Error", {
                              description: 'Website URL is not configured'
                            });
                            return;
                          }
                          // Remove protocol if present and add https
                          const cleanUrl = state.websiteUrl.replace(/^https?:\/\//, '');
                          // Check if URL ends with /wp-admin or similar
                          const baseUrl = cleanUrl.replace(/\/(wp-admin|wp-login|wp-content).*$/, '');
                          window.open(`https://${baseUrl}/wp-admin/profile.php#application-passwords-section`, '_blank');
                        }}
                      >
                        <Key className="h-4 w-4 mr-2" />
                        Generate Connection Key in WordPress
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        This will open your WordPress admin in a new tab where you can generate a secure connection key.
                      </p>



                    <div className="grid gap-2">
                      <Label htmlFor="wpUsername">WordPress Username</Label>
                      <Input
                        id="wpUsername"
                        value={state.wpUsername}
                        onChange={(e) => setState(prev => ({ ...prev, wpUsername: e.target.value }))}
                        placeholder="Enter your WordPress username"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="wpPassword">Application Password</Label>
                      <Input
                        id="wpPassword"
                        type="text"
                        className="font-mono"
                        value={state.wpPassword}
                        onChange={(e) => setState(prev => ({ ...prev, wpPassword: e.target.value }))}
                        placeholder="xxxx xxxx xxxx xxxx"
                      />
                      <p className="text-xs text-muted-foreground">
                        Paste the connection key exactly as shown in WordPress, including spaces


                      Cancel

                    {state.wpConnectionError && (
                      <div className="text-sm text-red-500 bg-red-50 p-3 rounded border border-red-200">
                        {state.wpConnectionError}
                      </div>
                    )}
                  </div>
                  
                  <DialogFooter>
                      onClick={handleCompleteWordPressAuth}
                      disabled={state.isAuthenticating}
                    >
                      {state.isAuthenticating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        'Connect'
                      )}


                  </DialogFooter>
                </DialogContent>
              </Dialog>
