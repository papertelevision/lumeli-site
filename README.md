# Lumeli marketing site

Static single-page site — plain HTML/CSS/JS, no build step. Brand tokens mirror
the app's Sage & Clay system (`signalbox/src/renderer/src/app.css`).

## Local preview

Open `index.html` in a browser, or:

```sh
python3 -m http.server 8080
```

## Deploy to a DigitalOcean droplet (nginx)

```sh
scp index.html styles.css script.js user@your-droplet:/var/www/lumeli/
```

Minimal nginx server block (`/etc/nginx/sites-available/lumeli`):

```nginx
server {
  listen 80;
  server_name lumeli.com www.lumeli.com;
  root /var/www/lumeli;
  index index.html;
  try_files $uri $uri/ =404;

  gzip on;
  gzip_types text/css application/javascript text/html;
}
```

```sh
ln -s /etc/nginx/sites-available/lumeli /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

HTTPS: `certbot --nginx -d lumeli.com -d www.lumeli.com`

## Before launch

- Wire the early-access form (`.cta-form` in index.html — see its `data-note`)
  to a mailing-list endpoint; it is currently a placeholder.
- Replace the footer Pricing/Privacy placeholder links.
