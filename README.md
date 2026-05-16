# GPT Plus Promo Link

Static Cloudflare Pages site for a safe Indonesian GPT Plus promo-style link generator.

This project accepts free-form text or JSON locally, but it does not send, store, or include ChatGPT cookies, tokens, passwords, OTP codes, or payment credentials in generated links. It generates local share links and points users to official ChatGPT pages only.

## Local preview

```sh
python3 -m http.server 8788 -d public
```

## Deploy

```sh
wrangler pages deploy public --project-name gpt-plus-promo-guide --branch main
```
