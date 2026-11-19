import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { OAuthAuthorizationDetails } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { oauthText } from "@/i18n/oauthText";
import { Button } from "@/components/ui/button";
import LanguageSelector from "@/components/features/LanguageSelector";
import { signOutUser } from "@/services/authService";

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const copy = oauthText[lang];
  const id = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthAuthorizationDetails | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setDetails(null); setFailed(false);
    if (!id) return;
    void (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!active) return;
        if (error) throw error;
        if (!data.session) {
          const next = window.location.pathname + window.location.search + window.location.hash;
          navigate("/login?next=" + encodeURIComponent(next), { replace: true }); return;
        }
        const result = await supabase.auth.oauth.getAuthorizationDetails(id);
        if (!active) return;
        if (result.error || !result.data) throw result.error ?? new Error("Missing request");
        if ("redirect_url" in result.data) { window.location.assign(result.data.redirect_url); return; }
        setDetails(result.data);
      } catch { if (active) setFailed(true); }
    })();
    return () => { active = false; };
  }, [id, navigate]);
  async function decide(approve: boolean) {
    if (busy || !details) return;
    setBusy(true); setFailed(false);
    try {
      const result = approve ? await supabase.auth.oauth.approveAuthorization(id) : await supabase.auth.oauth.denyAuthorization(id);
      if (result.error || !result.data?.redirect_url) throw result.error ?? new Error("Missing redirect");
      window.location.assign(result.data.redirect_url);
    } catch { setFailed(true); setBusy(false); }
  }
  return <main className="min-h-screen bg-background px-4 py-12 text-foreground">
    <div className="mx-auto max-w-lg space-y-6">
      <LanguageSelector />
      <h1 className="text-2xl font-semibold break-words">{details?.client.name ? `${details.client.name} — ` : ""}{copy.title}</h1>
      {!id ? <p role="alert">{copy.invalid}</p> : <>
        {failed && <p role="alert" className="text-destructive">{copy.failed}</p>}
        {!details && !failed && <p>{copy.loading}</p>}
        {details && <>
          <p className="break-words">{details.user.email}</p>
          <p className="break-all text-sm text-muted-foreground">{details.redirect_uri}</p>
          <p>{copy.summary}</p>
          <ul className="list-disc pl-5">{details.scope.split(/\s+/).filter(Boolean).map(scope => <li key={scope}>{scope === "email" ? copy.email : scope === "profile" || scope === "openid" ? copy.profile : `${copy.additional}: ${scope}`}</li>)}</ul>
          <p className="text-sm text-muted-foreground">{copy.boundary}</p>
          <div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={() => void decide(true)}>{copy.approve}</Button><Button variant="outline" disabled={busy} onClick={() => void decide(false)}>{copy.deny}</Button></div>
          <Button variant="ghost" disabled={busy} onClick={() => { void signOutUser().then(() => navigate("/login?next=" + encodeURIComponent(window.location.pathname + window.location.search))).catch(() => setFailed(true)); }}>{copy.switchAccount}</Button>
        </>}
      </>}
    </div>
  </main>;
}
