import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import KundaliMark from "@/components/KundaliMark";
import TwinkleText from "@/components/TwinkleText";
import HeroSection from "@/components/landing/HeroSection";
import TryItNow from "@/components/landing/TryItNow";
import HowItWorks from "@/components/landing/HowItWorks";
import CosmicEnergies from "@/components/landing/CosmicEnergies";
import FeatureShowcase from "@/components/landing/FeatureShowcase";
import WhyDifferent from "@/components/landing/WhyDifferent";
import KundaliExplainer from "@/components/landing/KundaliExplainer";
import LiveExample from "@/components/landing/LiveExample";
import Testimonials from "@/components/landing/Testimonials";
import StatsBar from "@/components/landing/StatsBar";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(var(--ink))" }}>
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: "hsl(var(--gold))" }} />
    </div>
  );
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen relative">
      {/* Navbar — Veil tier so the night sky drifts behind the brand */}
      <nav className="glass-veil fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <KundaliMark size={28} />
          <span className="brand-wordmark text-base">KUNDALI</span>
        </Link>
        <Link to="/login" className="text-sm transition-colors px-4 py-1.5 rounded-full border" style={{ color: 'hsl(var(--gold) / 0.85)', borderColor: 'hsl(var(--gold) / 0.30)', fontFamily: 'var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '11px' }}>
          Sign In
        </Link>
      </nav>

      {/* Content */}
      <div className="relative z-10">
        <HeroSection />
        <TryItNow />
        <HowItWorks />
        <CosmicEnergies />
        <FeatureShowcase />
        <WhyDifferent />
        <KundaliExplainer />
        <LiveExample />
        <Testimonials />
        <StatsBar />
        <FinalCTA />
        <Footer />
      </div>
    </div>
  );
}
