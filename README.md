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
  server_name lumeli.ai www.lumeli.ai;
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

HTTPS: `certbot --nginx -d lumeli.ai -d www.lumeli.ai`

## Backend (signups + analytics + admin)

The form and analytics beacon POST to the signalbox-server Rails app
(`/api/v1/signups`, `/api/v1/visits`), and the superadmin lives at `/admin`.
Run that app on the droplet (Docker, port 3020) and add to the nginx server
block — note `X-Forwarded-Proto` is mandatory (Rails force_ssl loops without it):

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:3020;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
location /admin {
  proxy_pass http://127.0.0.1:3020;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

Admin credentials come from the server's env: `ADMIN_USERNAME` and
`ADMIN_PASSWORD_DIGEST` (bcrypt — generate via
`bin/rails runner 'puts BCrypt::Password.create("...")'`; single-quote the
digest, it contains `$`).

## Before launch

- Replace the footer Pricing/Privacy placeholder links.
