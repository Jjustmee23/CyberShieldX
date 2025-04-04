import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// Define a constant for input styling to use throughout the form
const INPUT_STYLES = "bg-white border-dark-light text-black placeholder:text-gray-500";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const { login, isLoggingIn } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Error",
        description: "Username and password are required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await login(username, password);
    } catch (error) {
      toast({
        title: "Authentication Failed",
        description: "Invalid username or password. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark p-4">
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center">
              <i className="fas fa-shield-alt text-white text-2xl"></i>
            </div>
            <h1 className="text-3xl font-bold text-white">CyberShieldX</h1>
          </div>
        </div>
        
        <Card className="bg-dark-lighter border-dark-light">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
            <CardDescription className="text-center text-gray-400">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter your username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={INPUT_STYLES}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-xs text-primary hover:text-blue-400">
                    Forgot password?
                  </a>
                </div>
                <Input
                  id="password"
                  placeholder="Enter your password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={INPUT_STYLES}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-gray-600 text-primary focus:ring-primary"
                />
                <Label htmlFor="remember" className="text-sm text-gray-300">
                  Remember me
                </Label>
              </div>
              
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-blue-600 text-white"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <i className="fas fa-spinner animate-spin mr-2"></i>
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-dark-light pt-5">
            <p className="text-sm text-gray-400">
              Need assistance? Contact{" "}
              <a href="mailto:support@cybershieldx.com" className="text-primary hover:text-blue-400">
                support@cybershieldx.com
              </a>
            </p>
          </CardFooter>
        </Card>
        
        <p className="text-center text-xs text-gray-400 mt-4">
          CyberShieldX version 1.0.0 | &copy; 2023 CyberShield Security
        </p>
      </div>
    </div>
  );
}
