"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User, Sliders, Palette, BookText, Bell, Shield, Database, LogOut, Download, Trash2, Monitor, ExternalLink, CreditCard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase/client";
import { seedDemoDataForCurrentUser } from "@/lib/supabase/seed-demo";
import { tradesToCsv, downloadCsv } from "@/lib/csv";
import { INSTRUMENT_LIST } from "@/lib/instruments";
import { isPremium, tradesThisMonth } from "@/lib/premium";
import { useBilling } from "@/lib/use-billing";
import { cn, initials, todayLocalDateStr } from "@/lib/utils";
import { FREE_TIER_LIMITS, type AccentColor, type Session } from "@/lib/types";

const SECTIONS = [
  { key: "profile", label: "Profile", icon: User },
  { key: "billing", label: "Billing", icon: CreditCard },
  { key: "trading", label: "Trading", icon: Sliders },
  { key: "appearance", label: "Appearance", icon: Palette },
  { key: "journal", label: "Journal", icon: BookText },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "security", label: "Security", icon: Shield },
  { key: "data", label: "Data", icon: Database },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

const ACCENTS: { value: AccentColor; label: string; color: string }[] = [
  { value: "purple", label: "Ultraviolet", color: "#8b5cf6" },
  { value: "green", label: "Electric Green", color: "#22e5a0" },
  { value: "blue", label: "Electric Blue", color: "#3b9eff" },
  { value: "white", label: "White", color: "#f4f5f7" },
];

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout } = useAuth();
  const { push } = useToast();
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const accounts = useAppStore((s) => s.accounts);
  const trades = useAppStore((s) => s.trades);
  const tags = useAppStore((s) => s.tags);
  const subscription = useAppStore((s) => s.subscription);
  const refreshSubscription = useAppStore((s) => s.refreshSubscription);
  const { startCheckout, openPortal, loading: billingLoading, error: billingError } = useBilling();

  const initialSection = (SECTIONS.find((s) => s.key === searchParams.get("section"))?.key ?? "profile") as SectionKey;
  const [section, setSection] = useState<SectionKey>(initialSection);
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [lastSignInAt, setLastSignInAt] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLastSignInAt(data.user?.last_sign_in_at ?? null));
  }, []);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      push({ title: "Welcome to Premium", tone: "success", description: "Your subscription is now active." });
      refreshSubscription();
    } else if (checkout === "cancelled") {
      push({ title: "Checkout cancelled", tone: "info" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveProfile() {
    if (!user) return;
    setUser({ ...user, firstName, lastName });
    push({ title: "Profile updated", tone: "success" });
  }

  function handleExportData() {
    downloadCsv(`journal-by-noel-export-${todayLocalDateStr()}.csv`, tradesToCsv(trades));
    push({ title: "Data exported", tone: "success", description: `${trades.length} trades exported to CSV.` });
  }

  async function handleLoadSampleData() {
    if (!user) return;
    setSeeding(true);
    try {
      await seedDemoDataForCurrentUser(user);
      push({ title: "Sample data loaded", tone: "success", description: "Refresh the dashboard to see it." });
    } catch (err) {
      push({ title: "Couldn't load sample data", tone: "error", description: err instanceof Error ? err.message : undefined });
    } finally {
      setSeeding(false);
    }
  }

  async function handleChangePassword() {
    if (!user) return;
    setChangingPassword(true);
    await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setChangingPassword(false);
    push({ title: "Password reset email sent", tone: "success", description: `Check ${user.email}.` });
  }

  async function handleDeleteAccount() {
    if (!confirm("Permanently delete your account and all journal data? This cannot be undone.")) return;
    setDeleting(true);
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    const res = await fetch("/api/delete-account", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    setDeleting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      push({ title: "Couldn't delete account", tone: "error", description: body.error });
      return;
    }
    await logout();
    push({ title: "Account deleted", tone: "info" });
    router.push("/login");
  }

  async function handleLogoutAllDevices() {
    await supabase.auth.signOut({ scope: "global" });
    push({ title: "Logged out of all devices", tone: "success" });
    router.push("/login");
  }

  if (!user) return null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[19px] font-semibold text-text-primary">Settings</h2>
        <p className="text-[13px] text-text-secondary">Manage your profile, trading defaults, and account preferences.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-1.5 overflow-x-auto lg:flex-col lg:overflow-visible">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors whitespace-nowrap",
                  section === s.key ? "bg-accent-soft text-accent" : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                )}
              >
                <Icon size={15} /> {s.label}
              </button>
            );
          })}
        </nav>

        <div className="space-y-5">
          {section === "profile" && (
            <Card>
              <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-[20px] font-semibold text-accent">
                    {initials(firstName, lastName)}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-text-primary">Avatar</p>
                    <p className="text-[12px] text-text-tertiary">Generated automatically from your name.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>First name</Label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Last name</Label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={user.email} disabled />
                </div>
                <div>
                  <Label>Timezone</Label>
                  <Select value={settings.timezone} onChange={(e) => updateSettings({ timezone: e.target.value })}>
                    <option value="America/New_York">Eastern Time (New York)</option>
                    <option value="America/Chicago">Central Time (Chicago)</option>
                    <option value="America/Denver">Mountain Time (Denver)</option>
                    <option value="America/Los_Angeles">Pacific Time (Los Angeles)</option>
                    <option value="Europe/London">London</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                  </Select>
                </div>
                <Button variant="primary" onClick={saveProfile}>Save changes</Button>
              </CardContent>
            </Card>
          )}

          {section === "billing" && (
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>Plan</CardTitle>
                  <Badge tone={isPremium(subscription) ? "accent" : "neutral"}>
                    {isPremium(subscription) ? "Premium" : "Free"}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isPremium(subscription) ? (
                    <>
                      <p className="text-[13px] text-text-secondary">
                        $15/month — unlimited trades and accounts.
                        {subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
                          <> Cancels on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.</>
                        )}
                        {!subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
                          <> Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.</>
                        )}
                      </p>
                      <Button variant="secondary" onClick={openPortal} loading={billingLoading === "portal"}>
                        Manage billing
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <UsageBar label="Trades this month" used={tradesThisMonth(trades)} limit={FREE_TIER_LIMITS.maxTradesPerMonth} />
                        <UsageBar label="Accounts" used={accounts.length} limit={FREE_TIER_LIMITS.maxAccounts} />
                      </div>
                      <p className="text-[13px] text-text-secondary">
                        Upgrade to Premium for $15/month — unlimited trades, unlimited accounts, everything unlocked.
                      </p>
                      <Button variant="primary" onClick={startCheckout} loading={billingLoading === "checkout"}>
                        Upgrade to Premium
                      </Button>
                    </>
                  )}
                  {billingError && <p className="text-[12.5px] text-neg">{billingError}</p>}
                </CardContent>
              </Card>
            </div>
          )}

          {section === "trading" && (
            <Card>
              <CardHeader><CardTitle>Trading Defaults</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Default account</Label>
                  <Select value={settings.defaultAccountId ?? ""} onChange={(e) => updateSettings({ defaultAccountId: e.target.value })}>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Default instrument</Label>
                    <Select value={settings.defaultInstrument ?? "NQ"} onChange={(e) => updateSettings({ defaultInstrument: e.target.value as typeof settings.defaultInstrument })}>
                      {INSTRUMENT_LIST.map((i) => <option key={i.symbol} value={i.symbol}>{i.symbol}</option>)}
                    </Select>
                  </div>
                  <div>
                    <Label>Default session</Label>
                    <Select value={settings.defaultSession} onChange={(e) => updateSettings({ defaultSession: e.target.value as Session })}>
                      <option>Asian</option>
                      <option>London</option>
                      <option>New York</option>
                      <option>Custom</option>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Default risk per trade (%)</Label>
                  <Input type="number" step="0.1" value={settings.defaultRiskPct} onChange={(e) => updateSettings({ defaultRiskPct: Number(e.target.value) })} />
                </div>
              </CardContent>
            </Card>
          )}

          {section === "appearance" && (
            <Card>
              <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label>Theme</Label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateSettings({ theme: "dark" })}
                      className={cn("flex-1 rounded-md border px-3 py-2.5 text-[13px] font-medium", settings.theme === "dark" ? "border-accent/40 bg-accent-soft text-accent" : "border-border text-text-secondary")}
                    >
                      Dark
                    </button>
                    <button
                      onClick={() => updateSettings({ theme: "light" })}
                      className={cn("flex-1 rounded-md border px-3 py-2.5 text-[13px] font-medium", settings.theme === "light" ? "border-accent/40 bg-accent-soft text-accent" : "border-border text-text-secondary")}
                    >
                      Light
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Accent color</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {ACCENTS.map((a) => (
                      <button
                        key={a.value}
                        onClick={() => updateSettings({ accentColor: a.value })}
                        className={cn("flex flex-col items-center gap-2 rounded-md border px-3 py-3", settings.accentColor === a.value ? "border-accent/40 bg-accent-soft" : "border-border")}
                      >
                        <span className="h-6 w-6 rounded-full" style={{ background: a.color }} />
                        <span className="text-[11.5px] text-text-secondary">{a.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {section === "journal" && (
            <Card>
              <CardHeader><CardTitle>Journal Preferences</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Default tags</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t) => <Badge key={t} tone="neutral">{t}</Badge>)}
                  </div>
                </div>
                <p className="text-[12.5px] text-text-tertiary">
                  New tags are automatically added to this list when you create them while logging a trade.
                </p>
              </CardContent>
            </Card>
          )}

          {section === "notifications" && (
            <Card>
              <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <ToggleRow label="Email notifications" checked={settings.emailNotifications} onChange={(v) => updateSettings({ emailNotifications: v })} />
                <ToggleRow label="Push notifications" checked={settings.pushNotifications} onChange={(v) => updateSettings({ pushNotifications: v })} />
                <ToggleRow label="Daily summary" checked={settings.dailySummary} onChange={(v) => updateSettings({ dailySummary: v })} />
                <ToggleRow label="Weekly summary" checked={settings.weeklySummary} onChange={(v) => updateSettings({ weeklySummary: v })} />
              </CardContent>
            </Card>
          )}

          {section === "security" && (
            <div className="space-y-5">
              <Card>
                <CardHeader><CardTitle>Password</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-[13px] text-text-secondary">We&apos;ll email you a link to set a new password.</p>
                  <Button variant="secondary" onClick={handleChangePassword} loading={changingPassword}>Send password reset email</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Two-Factor Authentication</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-[13px] text-text-secondary">
                    Not set up yet. Supabase supports TOTP-based 2FA (
                    <a href="https://supabase.com/docs/guides/auth/auth-mfa" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                      enrollment guide <ExternalLink size={11} />
                    </a>
                    ) if you want to add it later.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Sessions</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between rounded-md border border-border bg-bg-elevated px-3.5 py-3">
                    <div className="flex items-center gap-3">
                      <Monitor size={16} className="text-text-secondary" />
                      <div>
                        <p className="text-[13px] font-medium text-text-primary">This device</p>
                        <p className="text-[11.5px] text-text-tertiary">
                          Last signed in {lastSignInAt ? new Date(lastSignInAt).toLocaleString() : "recently"}
                        </p>
                      </div>
                    </div>
                    <Badge tone="pos">Current</Badge>
                  </div>
                  <Button variant="danger" onClick={handleLogoutAllDevices}><LogOut size={14} /> Log out of all devices</Button>
                </CardContent>
              </Card>
            </div>
          )}

          {section === "data" && (
            <div className="space-y-5">
              <Card>
                <CardHeader><CardTitle>Export Data</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-[13px] text-text-secondary">Download all {trades.length} trades across every account as a CSV file.</p>
                  <Button variant="secondary" onClick={handleExportData}><Download size={14} /> Export all data</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Sample Data</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-[13px] text-text-secondary">
                    New here? Load ~65 days of realistic fictional trades across a few accounts so you can explore
                    the analytics, calendar, and playbook before journaling your own.
                  </p>
                  <Button variant="secondary" onClick={handleLoadSampleData} loading={seeding}>Load sample data</Button>
                </CardContent>
              </Card>
              <Card className="border-neg/25">
                <CardHeader><CardTitle className="text-neg">Danger Zone</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-[13px] text-text-secondary">Permanently delete your account and all associated journal data. This cannot be undone.</p>
                  <Button variant="danger" onClick={handleDeleteAccount} loading={deleting}><Trash2 size={14} /> Delete account</Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-text-secondary">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[12.5px]">
        <span className="text-text-secondary">{label}</span>
        <span className="font-medium text-text-primary">{used} / {limit}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-2">
        <div className={cn("h-full rounded-full transition-all", pct >= 100 ? "bg-neg" : pct >= 70 ? "bg-warning" : "bg-accent")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
