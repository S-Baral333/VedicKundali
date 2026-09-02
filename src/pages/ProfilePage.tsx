import { useState, useEffect } from "react";
import CosmicBackground from "@/components/CosmicBackground";
import TwinkleText from "@/components/TwinkleText";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, User, Star, Shield, LogOut, Sparkles, Moon, Flame, Globe, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/LanguageSelector";
import { LANGUAGES } from "@/i18n/languages";
import { format } from "date-fns";
import { LIFE_PRIORITIES, EMOTIONAL_STATES, GUIDANCE_STYLES } from "@/lib/onboarding-constants";
import SacredPageShell from "@/components/layout/SacredPageShell";
import PageNavRail from "@/components/layout/PageNavRail";
import CosmicFieldCard from "@/components/layout/CosmicFieldCard";
import RishiGuruEngagedPanel from "@/components/profile/RishiGuruEngagedPanel";
import { AnimatePresence, motion } from "framer-motion";
import { setRishiGuruCache } from "@/hooks/useRishiGuru";

interface ProfileData {
  full_name: string | null;
  date_of_birth: string | null;
  birth_time: string | null;
  birthplace: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  onboarding_preferences: any;
  rishi_guru_enabled?: boolean | null;
}

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  // Personal info state
  const [fullName, setFullName] = useState("");
  const [savingPersonal, setSavingPersonal] = useState(false);

  // Birth details state
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthplace, setBirthplace] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [savingBirth, setSavingBirth] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Preferences state
  const [lifePriorities, setLifePriorities] = useState<string[]>([]);
  const [currentState, setCurrentState] = useState("");
  const [guidanceStyle, setGuidanceStyle] = useState("balanced");
  const [dreamOptIn, setDreamOptIn] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Rishi Guru Protocol toggle
  const [rishiGuruEnabled, setRishiGuruEnabled] = useState(false);
  const [savingGuru, setSavingGuru] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, date_of_birth, birth_time, birthplace, latitude, longitude, created_at, onboarding_preferences, rishi_guru_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        toast({ title: "Error loading profile", description: error.message, variant: "destructive" });
      } else if (data) {
        setProfile(data);
        setFullName(data.full_name ?? "");
        setDateOfBirth(data.date_of_birth ?? "");
        setBirthTime(data.birth_time ?? "");
        setBirthplace(data.birthplace ?? "");
        setLatitude(data.latitude?.toString() ?? "");
        setLongitude(data.longitude?.toString() ?? "");
        setRishiGuruEnabled(!!data.rishi_guru_enabled);

        const prefs = data.onboarding_preferences as any;
        if (prefs) {
          setLifePriorities(prefs.life_priorities || []);
          setCurrentState(prefs.current_state || "");
          setGuidanceStyle(prefs.guidance_style || "balanced");
          setDreamOptIn(prefs.dream_opt_in ?? true);
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleToggleRishiGuru = async (next: boolean) => {
    if (!user) return;
    setRishiGuruEnabled(next); // optimistic
    setSavingGuru(true);
    const { error } = await supabase
      .from("profiles")
      .update({ rishi_guru_enabled: next })
      .eq("user_id", user.id);
    setSavingGuru(false);
    if (error) {
      setRishiGuruEnabled(!next); // revert
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      setRishiGuruCache(user.id, next);
      sessionStorage.removeItem("dashboard-data");
      toast({
        title: next ? "Rishi Guru Protocol activated" : "Rishi Guru Protocol disabled",
        description: next
          ? "The classical Vedic master now reads your chart directly."
          : "Manual guidance preferences are active again.",
      });
    }
  };


  const handleSavePersonal = async () => {
    if (!user) return;
    const trimmed = fullName.trim().slice(0, 100);
    setSavingPersonal(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: trimmed || null })
      .eq("user_id", user.id);
    setSavingPersonal(false);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      sessionStorage.removeItem("dashboard-data");
      toast({ title: "Personal info updated" });
    }
  };

  const handleSaveBirth = async () => {
    if (!user) return;
    setSavingBirth(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        date_of_birth: dateOfBirth || null,
        birth_time: birthTime || null,
        birthplace: birthplace.trim() || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      })
      .eq("user_id", user.id);
    setSavingBirth(false);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      sessionStorage.removeItem("dashboard-data");
      toast({ title: "Birth details updated" });
    }
  };

  const handleSavePreferences = async () => {
    if (!user) return;
    setSavingPrefs(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        onboarding_preferences: {
          life_priorities: lifePriorities,
          current_state: currentState,
          guidance_style: guidanceStyle,
          dream_opt_in: dreamOptIn,
        },
      })
      .eq("user_id", user.id);
    setSavingPrefs(false);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      sessionStorage.removeItem("dashboard-data");
      toast({ title: "Preferences updated" });
    }
  };

  const togglePriority = (id: string) => {
    setLifePriorities((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast({ title: "Failed to update password", description: error.message, variant: "destructive" });
    } else {
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password updated successfully" });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "?";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <CosmicBackground />
      <SacredPageShell
        leftRail={<PageNavRail title="Profile" hint="Your sacred identity and preferences." sections={[{ id: "identity", label: "Identity" }, { id: "prefs", label: "Preferences" }, { id: "sub", label: "Subscription" }]} />}
        rightRail={<CosmicFieldCard />}
        className="space-y-8"
      >
      {/* Header */}
      <div className="flex items-center gap-4 animate-[fade-in-up_0.6s_ease-out]">
        <Avatar className="h-16 w-16 border-2 border-primary/30">
          <AvatarFallback className="bg-primary/10 text-primary font-serif text-xl">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <TwinkleText as="h1" intensity="aura" className="text-3xl font-serif font-bold text-foreground">
            Profile
          </TwinkleText>
          <p className="text-muted-foreground text-sm">{user?.email}</p>
        </div>
      </div>

      {/* Personal Information */}
      <Card className="animate-[fade-in-up_0.6s_ease-out_0.1s_both]">
        <CardHeader>
          <CardTitle className="font-serif flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Personal Information
          </CardTitle>
          <CardDescription>Your display name and account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Display Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Email</Label>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          {profile?.created_at && (
            <p className="text-xs text-muted-foreground">
              Member since {format(new Date(profile.created_at), "MMMM d, yyyy")}
            </p>
          )}
          <Button onClick={handleSavePersonal} disabled={savingPersonal} className="w-full sm:w-auto">
            {savingPersonal && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
        </CardContent>
      </Card>

      {/* Birth Details */}
      <Card className="animate-[fade-in-up_0.6s_ease-out_0.2s_both]">
        <CardHeader>
          <CardTitle className="font-serif flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" /> Birth Details
          </CardTitle>
          <CardDescription>Used for chart generation and readings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input id="dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthTime">Birth Time</Label>
              <Input id="birthTime" type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthplace">Birthplace</Label>
            <Input id="birthplace" value={birthplace} onChange={(e) => setBirthplace(e.target.value)} placeholder="City, Country" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lat">Latitude</Label>
              <Input id="lat" type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="e.g. 28.6139" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lng">Longitude</Label>
              <Input id="lng" type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="e.g. 77.2090" />
            </div>
          </div>
          <Button onClick={handleSaveBirth} disabled={savingBirth} className="w-full sm:w-auto">
            {savingBirth && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Birth Details
          </Button>
        </CardContent>
      </Card>

      {/* Rishi Guru Protocol */}
      <Card
        className="animate-[fade-in-up_0.6s_ease-out_0.22s_both] relative overflow-hidden border-primary/30"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--background) / 0.6))",
        }}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="font-serif flex items-center gap-2">
                <Flame className="h-5 w-5 text-primary" /> Rishi Guru Protocol
                <span className="text-[10px] uppercase tracking-wider text-primary/80 border border-primary/40 rounded-full px-2 py-0.5 ml-1">
                  God-Tier
                </span>
              </CardTitle>
              <CardDescription className="mt-1.5">
                Reads your chart as a classical Vedic master would — cited
                placements (graha · degree · house), no hedge words, dharmic
                close. Overrides the manual preferences below.
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Switch
                checked={rishiGuruEnabled}
                disabled={savingGuru}
                onCheckedChange={handleToggleRishiGuru}
              />
              <span
                className={`text-[10px] font-mono uppercase tracking-wider ${
                  rishiGuruEnabled ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {rishiGuruEnabled ? "Active" : "Off"}
              </span>
            </div>
          </div>
        </CardHeader>
        {rishiGuruEnabled && (
          <CardContent className="pt-0">
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs text-foreground/80 leading-relaxed">
              <span className="text-primary font-medium">✦ Engaged.</span> The
              Guru will speak directly from your computed chart — Lagna, dashas,
              divisional confirmation. Manual preferences below are paused until
              this is turned off.
            </div>
          </CardContent>
        )}
      </Card>

      {/* Language & Region */}
      <Card className="animate-[fade-in-up_0.6s_ease-out_0.15s_both]">
        <CardHeader>
          <CardTitle className="font-serif flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> {t("profile:languageCardTitle", "Language & Region")}
          </CardTitle>
          <CardDescription>
            {t("profile:languageCardSubtitle", "Pick the language you'd like to read in.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LanguageSelector
            onChange={(code) => {
              const def = LANGUAGES.find((l) => l.code === code);
              toast({
                title: t("profile:languageUpdated", "Language updated"),
                description: t("profile:languageUpdatedDesc", "The app will now speak {{language}}.", {
                  language: def?.nativeName ?? code,
                }),
              });
            }}
          />
          <div
            className="flex items-start gap-2 rounded-xl border p-3 text-xs leading-relaxed"
            style={{
              background: "hsl(var(--gold) / 0.04)",
              borderColor: "hsl(var(--gold) / 0.18)",
              color: "hsl(var(--text-secondary))",
            }}
          >
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "hsl(var(--gold))" }} />
            <span>{t("profile:languageHelper")}</span>
          </div>
        </CardContent>
      </Card>


      {/* Guidance Preferences (or God-Mode Reveal) */}
      <AnimatePresence mode="wait" initial={false}>
        {rishiGuruEnabled ? (
          <motion.div
            key="engaged"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <RishiGuruEngagedPanel
              onDisengage={() => handleToggleRishiGuru(false)}
              saving={savingGuru}
            />
          </motion.div>
        ) : (
      <Card
        key="prefs"
        className="animate-[fade-in-up_0.6s_ease-out_0.25s_both]"
      >
        <CardHeader>
          <CardTitle className="font-serif flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Guidance Preferences
          </CardTitle>
          <CardDescription>
            Customize how your cosmic guidance is delivered
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Life priorities */}
          <div className="space-y-2">
            <Label>Life Priorities (up to 3)</Label>
            <div className="grid grid-cols-2 gap-2">
              {LIFE_PRIORITIES.map((p) => {
                const selected = lifePriorities.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePriority(p.id)}
                    className={`p-2.5 rounded-lg border text-left text-sm transition-all ${
                      selected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/50 bg-card/50 text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <span className="mr-1.5">{p.emoji}</span>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Emotional state */}
          <div className="space-y-2">
            <Label>Current Emotional State</Label>
            <div className="grid grid-cols-2 gap-2">
              {EMOTIONAL_STATES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentState(s.id)}
                  className={`p-2 rounded-lg border text-sm transition-all ${
                    currentState === s.id
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/50 bg-card/50 text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Guidance style */}
          <div className="space-y-2">
            <Label>Guidance Style</Label>
            <div className="space-y-2">
              {GUIDANCE_STYLES.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGuidanceStyle(g.id)}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    guidanceStyle === g.id
                      ? "border-primary bg-primary/10"
                      : "border-border/50 bg-card/50 hover:border-primary/30"
                  }`}
                >
                  <p className={`font-medium text-sm ${guidanceStyle === g.id ? "text-foreground" : "text-muted-foreground"}`}>
                    {g.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{g.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Dream opt-in */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-card/50">
            <div className="flex items-center gap-3">
              <Moon className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Dream Interpretation</p>
                <p className="text-xs text-muted-foreground">Receive Swapna Shastra insights</p>
              </div>
            </div>
            <Switch checked={dreamOptIn} onCheckedChange={setDreamOptIn} />
          </div>

          <Button onClick={handleSavePreferences} disabled={savingPrefs} className="w-full sm:w-auto">
            {savingPrefs && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Preferences
          </Button>
        </CardContent>
      </Card>
        )}
      </AnimatePresence>

      {/* Account Settings */}
      <Card className="animate-[fade-in-up_0.6s_ease-out_0.3s_both]">
        <CardHeader>
          <CardTitle className="font-serif flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Account Settings
          </CardTitle>
          <CardDescription>Manage your password and account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPw">New Password</Label>
            <Input id="newPw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPw">Confirm Password</Label>
            <Input id="confirmPw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" />
          </div>
          <Button onClick={handleChangePassword} disabled={savingPassword} className="w-full sm:w-auto">
            {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
            Update Password
          </Button>

          <Separator className="my-4" />

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Account created {user?.created_at ? format(new Date(user.created_at), "MMMM d, yyyy") : ""}
            </p>
            <Button variant="destructive" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
      </SacredPageShell>
    </>
  );
};

export default ProfilePage;
