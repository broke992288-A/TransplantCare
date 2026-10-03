# Patient portal safety and clarity fixes

## Changes
1. Add complete Uzbek alert labels and supporting patient-facing alert text.
2. Hide the doctor-notes card from the patient dashboard; keep it unchanged for clinicians.
3. Make patient alerts collapsed by default, with the alert count in the clickable header.
4. Remove critical-alert resolution controls from the patient view and retain clinician controls.
5. Remove push test and VAPID re-registration tools from patient notification settings.
6. Treat any active high-risk alert as high risk in the patient health card and warning banner.
7. Replace alert titles/messages with a plain patient-safe recommendation and date; preserve full clinician detail.

## Technical details
- Add a patient-view mode to the shared alert card so clinician behavior remains unchanged.
- Derive the patient display risk from the latest risk snapshot plus active critical/high-risk alerts.
- Keep alert fetching, storage, and clinician pages unchanged.
- Add focused regression tests, then run the relevant tests and inspect the preview build result.
