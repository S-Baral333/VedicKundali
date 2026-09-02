import { useLocation } from "react-router-dom";
import UniverseBackground from "@/components/UniverseBackground";

/**
 * Wraps UniverseBackground with the current router pathname so the
 * appearance config matches actual client-side navigation (not just
 * the initial window.location at mount time).
 */
export default function RouteAwareUniverseBackground() {
  const { pathname } = useLocation();
  return <UniverseBackground pathnameOverride={pathname} />;
}
