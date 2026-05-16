# GPT Plus Promo Guide

Static Cloudflare Pages site for a safe Indonesian GPT Plus promo and upgrade guide.

This project intentionally does not collect ChatGPT session JSON, cookies, tokens, passwords, or payment credentials. It only provides a local readiness checklist and links users to official ChatGPT pages.

## Local preview

```sh
python3 -m http.server 8788 -d public
```

## Deploy

```sh
wrangler pages deploy public --project-name gpt-plus-promo-guide --branch main
```
