# ProxiSpeak Static Public Assets Directory (`/public`)

This directory houses all static, publicly accessible client assets served at the application root path `/` by Vite and the production static web server (Vercel / Render / Express).

---

## 📁 Asset Manifest & Inventory

| File Path | MIME Type | Resolution / Spec | Purpose & Description |
|---|---|---|---|
| `/favicon.svg` | `image/svg+xml` | Scalable Vector (64x64 viewBox) | Modern browser tab icon featuring concentric proximity soundwaves and interactive speaker core. |
| `/manifest.json` | `application/manifest+json` | W3C Web App Manifest (PWA) | Enables standalone Progressive Web App installation across Desktop, Android, and iOS. |
| `/robots.txt` | `text/plain` | RFC 9309 Robot Exclusion | Directs search engine web crawlers while shielding private WebRTC room tokens and signaling paths. |
| `/sitemap.xml` | `application/xml` | Sitemaps XML Schema 0.9 | Outlines canonical public routes (`/`, `/login`, `/workspace`) for search engine indexation. |
| `/office-preview.svg` | `image/svg+xml` | 1200 x 630 px (1.91:1) | OpenGraph and Twitter card banner for social sharing, rich link previews, and embeds. |
| `/studio.png` | `image/png` | High-Resolution Texture | 3D room and floor texture asset used in Three.js canvas rendering and workspace backgrounds. |

---

## ⚡ HTTP Caching & Delivery Architecture

When deploying to production edge environments (Vercel / Render / Cloudflare / Nginx), apply the following HTTP header rules:

```http
# 1. Versioned Static Images & Visual Assets (Cache for 1 Year, Immutable)
Cache-Control: public, max-age=31536000, immutable

# 2. Web App Manifest & Dynamic Metadata (Revalidate Regularly)
Cache-Control: public, max-age=86400, stale-while-revalidate=3600

# 3. Robots & Sitemap Protocol Files (Always Fresh)
Cache-Control: public, max-age=3600, must-revalidate
```

---

## 🌐 HTML Template Integration Reference

All public assets are linked with root-relative paths in `client/index.html` and `index.html`:

```html
<!-- Scalable Vector Favicon -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />

<!-- PWA Manifest -->
<link rel="manifest" href="/manifest.json" />

<!-- Open Graph Social Metadata -->
<meta property="og:image" content="/office-preview.svg" />
<meta name="twitter:image" content="/office-preview.svg" />
```

---

## 🔒 Security & Privacy Notice

> [!IMPORTANT]
> The `public/` directory must **never** contain private user data, SSL keys, `.env` secrets, or hardcoded session identifiers. Active WebRTC signaling channels and database credentials must remain strictly protected inside the server environment.
