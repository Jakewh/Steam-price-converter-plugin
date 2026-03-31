# EUR Price Converter for Millennium

A custom Millennium plugin that converts prices shown in EUR on Steam game pages to your selected currency.

This implementation is original and only uses the linked SteamDB plugin as a reference for how Millennium plugins integrate with the client.

## Features

- Converts EUR prices on Steam game pages (`/app/<id>`) to a selected currency.
- Supports preset currencies: `EUR`, `CZK`, `HUF`, `BGN`, `RON`, `DKK`, `SEK`, `RSD`, `ISK`, `ALL`, `BAM`, `MKD`.
- Supports manual custom 3-letter currency codes (for example `NOK`).
- Caches exchange rates locally for 6 hours.
- Watches dynamic page updates and recalculates prices automatically.

## Build

1. Install dependencies:
   `npm install`
2. Build frontend output:
   `npm run build`

The build outputs the runtime file into `frontend/index.js`.

## Install in Millennium

1. Build the plugin (`npm run build`).
2. Copy this whole folder into your Millennium plugins directory.
3. Restart Steam client and enable the plugin in Millennium settings.

## Notes

- Exchange rates are fetched from `https://api.frankfurter.app`.
- If the API is unavailable, conversion will not update until a valid rate is fetched.
- A minimal `backend/main.py` is included because Millennium attempts to load a backend entrypoint for plugins.
