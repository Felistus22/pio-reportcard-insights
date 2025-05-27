
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/contexts/AppContext";
import { toast } from "sonner";
import { Image } from "@/components/ui/image";


const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login } = useAppContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }
    
    setIsLoggingIn(true);
    
    try {
      const success = await login(email, password);
      if (!success) {
        toast.error("Invalid email or password");
      }
    } catch (error) {
      toast.error("An error occurred during login");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-education-light">
      <Card className="w-[350px] shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-education-primary flex items-center justify-center">
              <img 
            src="/lovable-uploads/40c13983-fd2d-4a30-b15f-2fde2ace8f2f.png" 
            alt="Dashboard Icon" 
            className="w-14 h-14"
        />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Padre Pio School Report System</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="teacher@school.edu" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  disabled={isLoggingIn}
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoggingIn}
                  autoComplete="current-password"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-education-primary hover:bg-education-dark" 
                disabled={isLoggingIn}
              >
                {isLoggingIn ? "Logging in..." : "Log in"}
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="text-xs text-center text-gray-500 flex justify-center">
          <div>
            <p className="mb-2">Demo credentials:</p>
            <p>Teacher: t.anderson@school.edu / password123</p>
            <p>Admin: principal@school.edu / admin123</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
