import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast({
          title: "Welcome back",
          description: "Successfully logged in",
        });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        toast({
          title: "Account created",
          description: "You can now start tracking inventory",
        });
      }
    } catch (error: any) {
      toast({
        title: "Authentication error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md p-8 sm:p-10 bg-gradient-to-br from-card to-accent/5 border-border/50 shadow-xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
          MyStock
        </h1>
        <h2 className="text-xl font-semibold text-foreground">
          {isLogin ? "Welcome Back" : "Get Started"}
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          {isLogin ? "Sign in to your account" : "Create your account to track inventory"}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="name@example.com"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            minLength={6}
            className="h-11"
          />
        </div>
        <Button type="submit" className="w-full h-11 shadow-sm" disabled={loading}>
          {loading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
        </Button>
      </form>
      <button
        onClick={() => setIsLogin(!isLogin)}
        className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </Card>
  );
};
