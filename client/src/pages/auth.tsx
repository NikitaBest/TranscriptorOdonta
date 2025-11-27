import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setLocation('/dashboard');
    }, 1000);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-in slide-in-from-bottom-4 duration-700">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-display font-bold tracking-tighter">Transcriptor</h1>
          <p className="text-muted-foreground">AI-powered dental consultation assistant</p>
        </div>

        <Card className="border-border/50 shadow-xl rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 h-12 p-1 bg-secondary/50 rounded-2xl">
                <TabsTrigger value="email" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Email</TabsTrigger>
                <TabsTrigger value="telegram" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Telegram</TabsTrigger>
              </TabsList>
              
              <TabsContent value="email">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" placeholder="doctor@clinic.com" type="email" required className="h-12 rounded-xl bg-secondary/30 border-transparent focus:border-primary focus:bg-background transition-all" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" required className="h-12 rounded-xl bg-secondary/30 border-transparent focus:border-primary focus:bg-background transition-all" />
                  </div>
                  <Button className="w-full h-12 rounded-xl text-base font-medium mt-4" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="telegram">
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" role="img" xmlns="http://www.w3.org/2000/svg"><title>Telegram</title><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  </div>
                  <Button variant="outline" className="w-full h-12 rounded-xl" onClick={() => setLocation('/dashboard')}>
                    Continue with Telegram
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <div className="text-center text-sm">
          <span className="text-muted-foreground">Don't have an account? </span>
          <a href="#" className="font-medium hover:underline">Register</a>
        </div>
      </div>
    </div>
  );
}