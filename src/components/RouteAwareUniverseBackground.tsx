import { useLocation } from "react-router-dom";
import UniverseBackground from "@/components/UniverseBackground";

/** Routes that paint their own sky, and would only hide this one behind it. */
const OWN_SKY = ["/onboarding", "/preview/onboarding"];

/**
 * Wraps UniverseBackground with the current router pathname so the
 * appearance config matches actual client-side navigation (not just
 * the initial window.location at mount time).
 *
 * Onboarding covers the screen with its own canvas, so mounting the three.js
 * scene underneath would spend a GPU's worth of frames on something nobody
 * can see — on the very first screen a new user ever loads.
 */
export default function RouteAwareUniverseBackground() {
  const { pathname } = useLocation();
  if (OWN_SKY.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  return <UniverseBackground pathnameOverride={pathname} />;
}
