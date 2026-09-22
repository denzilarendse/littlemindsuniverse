# Native wrappers
The production web app is PWA-first. Recommended next packaging paths without duplicating learning logic:
- Android/iOS: Capacitor or Expo wrapper around the hosted web/PWA where native APIs are required.
- Windows: Tauri wrapper pointing to the production frontend bundle.
Keep authentication, mastery, teacher approvals and child-safety rules in shared backend services so native shells do not create divergent policy logic.
