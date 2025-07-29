import { useEffect } from "react";
import { router, usePathname } from "expo-router";
import { useAuth } from "../../context/AuthContext";

const RouteGuard = ({ children }) => {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      // Redirect unauthenticated users to welcome screen
      if (!user && pathname !== "/") {
        router.replace("/");
        return;
      }

      // Redirect authenticated users away from welcome screen
      if (user && pathname === "/") {
        router.replace("/dashboard-screen");
        return;
      }
    }
  }, [user, loading, pathname]);

  // Show loading or render children
  if (loading) {
    return null; // Your loading component could go here
  }

  return children;
};

export default RouteGuard;
