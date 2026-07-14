# Agritech / Agronomy Job Scraper

Daily scanner for [AgriSupport Online jobs](https://www.israel.agrisupportonline.com/drushim/csv/csvread.pl?mytemplate=tp1). Filters for **agronomy** and **agritech** roles and emails new matches to **tymaayan@gmail.com** via **EmailJS**.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Set up EmailJS ([emailjs.com](https://www.emailjs.com)):
   - Add an **Email Service** (e.g. Gmail) for `tymaayan@gmail.com`
   - Create an **Email Template** with these variables:
     - `{{to_email}}` — put this in the To field
     - `{{subject}}` — put this in the Subject field
     - `{{message}}` — put this in the body
     - `{{job_count}}` — optional
   - Under **Account → Security**, allow API requests from non-browser environments if prompted
   - Copy **Service ID**, **Template ID**, **Public Key**, and (recommended) **Private Key**

3. Copy env file and fill in EmailJS values:

```bash
copy .env.example .env
```

```
EMAILJS_SERVICE_ID=service_xxx
EMAILJS_TEMPLATE_ID=template_xxx
EMAILJS_PUBLIC_KEY=xxxxxxxx
EMAILJS_PRIVATE_KEY=xxxxxxxx
NOTIFY_EMAIL=tymaayan@gmail.com
CRON_SCHEDULE=0 9 * * *
```

## Usage

**Seed baseline (recommended first run — no email):**

```bash
npm run seed
```

**Scan once:**

```bash
npm run once
```

**Run daily scheduler** (default 09:00 local time; keep the terminal open):

```bash
npm start
```

Scan immediately, then keep the daily schedule:

```bash
node src/index.js --now
```

## What gets matched

Jobs whose title/description mention agronomy or agritech signals, for example:

- אגרונום / agronomist
- אגרוטק / agritech
- בקרת השקיה, חיישנים, precision agriculture
- ביוטכנולוגיה, מו״פ, מדעי הצמח

Pure gardening / general labor posts are usually skipped unless they also look tech-related.

## Run daily on GitHub (free)

The repo includes a GitHub Actions workflow (`.github/workflows/daily-scrape.yml`) that runs `npm run once` every day around **09:00 Israel time** and commits updates to `data/seen-jobs.json`.

1. Push this project to a GitHub repository.
2. In the repo: **Settings → Secrets and variables → Actions → New repository secret**. Add:
   - `EMAILJS_SERVICE_ID`
   - `EMAILJS_TEMPLATE_ID`
   - `EMAILJS_PUBLIC_KEY`
   - `EMAILJS_PRIVATE_KEY`
   - `NOTIFY_EMAIL`
3. Open **Actions → Daily job scrape → Run workflow** once to verify.
4. After that it runs on the schedule automatically.

Do **not** commit your `.env` file (it is gitignored).

## Notes

- Seen job IDs are stored in `data/seen-jobs.json` so you only get emailed about **new** matches.
- EmailJS free plans have a monthly send limit — one alert email per day with new jobs is typically fine.
- For always-on daily runs on Windows, you can also use Task Scheduler to run `npm run once` each morning instead of leaving `npm start` open.
