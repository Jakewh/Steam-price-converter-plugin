# EUR Price Converter for Millennium

A custom Millennium plugin that converts prices shown in EUR on Steam game pages to your selected currency.

## Features

- Converts EUR prices on Steam game pages (`/app/<id>`) to a selected currency.
- Supports preset currencies: `EUR`, `CZK`, `HUF`, `BGN`, `RON`, `DKK`, `SEK`, `RSD`, `ISK`, `ALL`, `BAM`, `MKD`.
- Supports manual custom 3-letter currency codes (for example `NOK`).
- Caches exchange rates locally for 6 hours.
- Watches dynamic page updates and recalculates prices automatically.

| Title page |
| --------- |
| <img width="2872" height="1650" alt="Snímek obrazovky_20260331_075800" src="https://github.com/user-attachments/assets/0d96a30b-c186-4065-af4e-b768462688d0" />|

| Game page  |
| --------- |
|<img width="1272" height="1156" alt="Snímek obrazovky_20260331_075845" src="https://github.com/user-attachments/assets/b2170c34-9fff-4ff0-865d-ebda2cca6a26" />|

| Setup |
| --------- |
|<img width="571" height="599" alt="Snímek obrazovky_20260331_075823" src="https://github.com/user-attachments/assets/3f857caf-30b4-4b4b-bd70-fa39148fd197" />|


## Install in Millennium

- Ensure you have Millennium installed on your Steam client
- Download the latest release of this plugin or from the Steambrew website
- Place the plugin files in your Millennium plugins directory (should be a plugins folder in your Steam client directory)
- Restart your Steam client
- Enable plugin in the Millennium plugin menu
- Right click steam on your taskbar and Click "Exit Steam" to make sure the plugin is fully loaded (no it does NOT automatically restart, that is a reload)
- Startup steam

## Notes

- Exchange rates are fetched from `https://api.frankfurter.app`.
- If the API is unavailable, conversion will not update until a valid rate is fetched.

## Known Issues
- Millennium displays an error message in the logo indicating that a Python file cannot be found. This error does not interfere with or prevent the use of the program. It is merely a reference to a previous version and will be fixed in the future.

## Credits
[Millennium](https://github.com/shdwmtr/millennium)

