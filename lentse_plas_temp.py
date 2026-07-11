"""Haal de watertemperatuur van De Lentse Plas op van waterkaart.net.

Dezelfde logica draait elk uur in .github/workflows/update-water-temp.yml;
dit script is voor lokaal testen.
"""
import re
import urllib.request

URL = "https://waterkaart.net/gids/zwemplek.php?naam=De%20Lentse%20Plas"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    ),
    "Accept-Language": "nl-NL,nl;q=0.9",
}

# Voorbeeld in de pagina:
# <span class="meet-label">Watertemperatuur</span><span class="meet-waarde">~23.2</span>
TEMP_RE = re.compile(
    r'Watertemperatuur</span>\s*<span class="meet-waarde">\s*~?\s*([0-9]+(?:[.,][0-9]+)?)'
)


def get_temperature():
    req = urllib.request.Request(URL, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as r:
        html = r.read().decode("utf-8", errors="replace")

    m = TEMP_RE.search(html)
    if m:
        return round(float(m.group(1).replace(",", ".")), 1)
    return None


if __name__ == "__main__":
    temp = get_temperature()
    if temp is not None:
        print(f"Watertemperatuur De Lentse Plas: {temp}°C")
    else:
        print("Temperatuur niet gevonden.")
