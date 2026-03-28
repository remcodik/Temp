import requests
from bs4 import BeautifulSoup
import re

URL = "https://waterkaart.net/gids/zwemplek.php?naam=De%20Lentse%20Plas"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "nl-NL,nl;q=0.9",
}


def get_temperature():
    response = requests.get(URL, headers=HEADERS, timeout=10)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    # Zoek naar temperatuur-gerelateerde tekst (bijv. "18°C" of "18 °C" of "18 graden")
    temp_pattern = re.compile(r"(\d+[\.,]?\d*)\s*[°º]?\s*[Cc]")

    # Probeer eerst specifieke elementen (pas aan op basis van de pagina-structuur)
    for tag in soup.find_all(string=temp_pattern):
        match = temp_pattern.search(tag)
        if match:
            temp = match.group(0).strip()
            parent = tag.parent
            print(f"Temperatuur gevonden: {temp}")
            print(f"  In element: <{parent.name}> class={parent.get('class')} id={parent.get('id')}")
            return temp

    # Fallback: dump alle tekst met "temp" of "graden" of "°"
    print("Geen duidelijke temperatuur gevonden. Relevante tekst:")
    for tag in soup.find_all(string=re.compile(r"[°º]|graden|temp|water", re.I)):
        print(f"  {tag.strip()[:200]}")

    return None


if __name__ == "__main__":
    temp = get_temperature()
    if temp:
        print(f"\nWatertemperatuur De Lentse Plas: {temp}")
    else:
        print("\nTemperatuur niet gevonden.")
