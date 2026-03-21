---
name: deploy-check
description: Pre-deploy verification — build, lint, CSP hash, sitemap count
disable-model-invocation: true
---

# Deploy Check

Run all verification checks before pushing to deploy on Netlify.

## Steps

1. **Lint check**
   ```bash
   npm run lint
   ```
   Expected: only the known pre-existing error in `interactive-headshot.tsx`. Any NEW errors = fix before deploy.

2. **Production build**
   ```bash
   npm run build
   ```
   Expected: clean compilation, all routes generated. Check output for route count.

3. **CSP hash verification** — ensure the inline dark-mode script hash in `netlify.toml` matches the actual script in `app/layout.tsx`:
   - Extract the inline script content from `layout.tsx`
   - Compute SHA-256: `echo -n "<script-content>" | openssl dgst -sha256 -binary | openssl base64`
   - Compare with the hash in `netlify.toml` CSP header
   - If they don't match, update `netlify.toml`

4. **Sitemap count** — verify sitemap has the expected number of entries:
   - Homepage + gallery + learn index + N artifact pages
   - Check `lib/learn/artifacts.ts` ARTIFACTS array length matches sitemap artifact count

5. **Report results** — summarize pass/fail for each check.
