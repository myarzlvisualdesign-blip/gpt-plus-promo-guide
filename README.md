# GPT Plus Promo Link

Static Cloudflare Pages site for a safe Indonesian GPT Plus promo-style link generator.

This project intentionally does not collect ChatGPT session JSON, cookies, tokens, passwords, OTP codes, or payment credentials. It generates local share links and points users to official ChatGPT pages only.

## Local preview

```sh
python3 -m http.server 8788 -d public
```

## Deploy

```sh
wrangler pages deploy public --project-name gpt-plus-promo-guide --branch main
```
