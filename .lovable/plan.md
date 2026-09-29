# Қолган фойдали ишлар — қадамма-қадам режа

| # | Иш | Нима беради | Хавф |
|---|----|-------------|------|
| 1 | `coalesce_recent_lab_values` га кириш текшируви (`auth.uid()` + `can_access_patient`) | Бегона бемор таҳлилларини ўқишни ёпади | Юқори хавфсизлик тешиги |
| 2 | `log_audit_event` ҳимояси: `auth.uid()` мажбурий, `user_id` доим чақирувчининг ўзи | Сохта audit ёзувларини ёпади | Юқори |
| 3 | 3 та триггер функцияга REVOKE EXECUTE (`ensure_patient_has_active_schedule`, `auto_resolve_missing_lab_alerts`, `enforce_patient_alert_update_scope`, `trg_ensure_active_schedule`) | Кераксиз очиқ эшикларни ёпади | Паст (триггерлар ишлашда давом этади) |
| 4 | `recalculate-risk` серверини қайта ёзиш: ўз формуласи ўчирилади, ҳар бир лаб учун `calculate_risk_score_sql` чақирилади; бемор эгалиги текширилади | Учинчи хавф ҳисоблагич йўқолади, битта audited engine қолади, критик override сақланади | Юқори (клиник) |
| 5 | Бемор саҳифасида шифокор учун "Tasdiqlash" тугмаси — snapshot `verified_by_clinician=true`, `patients.risk_level` янгиланади (сервер функцияси орқали, фақат бириктирилган шифокор/админ) | "Tasdiqlash kutilmoqda" рўйхати ёпиладиган бўлади | Ўрта |
| 6 | Текширувлар: typecheck, lint, тестлар, build, backend checker; натижалар аниқ рақамлар билан | Ишончлилик | — |
| 7 | roadmap.md янгиланади | Кузатув | — |

Кейинги босқичга қолади (катта, алоҳида): офлайн "эски маълумот" белгиси, лаб қораламалари навбати, пагинация, AbortController, `clinical_thresholds` seed.

## Техник тафсилотлар
- 1–3 битта миграцияда; аввал фронтендда `log_audit_event` чақирувлари текширилади (ҳозирги чақирувлар бузилмаслиги учун).
- 4: edge function `recalculate-risk` → `record_lab_risk_snapshot`/`calculate_risk_score_sql` RPC, фойдаланувчи JWT билан (RLS ва `can_access_patient` ишлайди); тарихий snapshot'лар `is_historical` сақланади.
- 5: янги `verify_risk_snapshot(uuid)` SECURITY DEFINER, `search_path = public, pg_temp`, audit log ёзади. RiskScoreCard ва Trend карталарига тегилмайди.
- Publish қилинмайди.
