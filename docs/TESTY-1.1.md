# PHE Register 1.1 – testový protokol

Overené **24. 10. 2026** v existujúcom projekte, Linux, Node.js 24.19.0 a Chromium 154. Bez nasadenia aplikácie alebo Google Workspace backendu.

## Výsledky

| Oblasť | Výsledok |
|---|---|
| Pôvodná evidencia a exporty – doménové testy | 19 / 19 |
| Rozvrh a rozhodovanie o predvýbere | 19 / 19 |
| Backend so simulovanými službami Google | 13 / 13 |
| Pôvodné browser scenáre cez HTTP | 13 / 13 |
| Nové browser scenáre rozvrhu cez HTTP | 15 / 15 |
| Samostatný HTML cez `file://` | SKIP – politika Chromium ho blokuje |

Spolu **51 automatických testov a 28 úspešných browser scenárov**. Fyzický Safari/iPhone, Windows Chrome a skutočné školské Google služby neboli v tomto prostredí dostupné; nejde o potvrdenie ich integračného testu.

Výstupy behov: [automatické testy](../tests/artifacts/unit-results-1.1.txt), [regresné browser testy](../tests/artifacts/browser-results-1.1.txt), [rozvrh v prehliadači](../tests/artifacts/timetable-browser-results.txt). Pôvodné artefakty 1.0 zostali zachované.

## Čo sa overilo

- Interval hodiny je `[začiatok, koniec)`: presný začiatok, posledná milisekunda pred koncom, presný koniec, nadväzujúce hodiny bez prestávky.
- Pred prvou hodinou a cez prestávku sa vyberie nasledujúca dnešná trieda. Po poslednej hodine, počas prázdneho dňa a cez víkend sa použije posledná manuálna trieda.
- Europe/Bratislava vrátane letného/zimného času a prechodu cez polnoc. Browser test úmyselne používa zariadenie v časovom pásme America/New_York.
- Manuálny výber sa neprepíše pri ďalšej časovej hranici; používateľ ho môže výslovne uvoľniť.
- Rozpracovaný zápis a text témy zostanú pri zmene času a po obnovení tej istej karty. Po ukončení sa môže ponúknuť ďalšia trieda.
- Historická hodina si zachová triedu, dátum, tému aj históriu pri zmene času a obnovení stránky. Odchod z nej na rozvrh vyžaduje výslovný pokyn.
- Automatika ani opakované otvorenie aplikácie nevytvoria evidenčný záznam.
- Skutočné UI: pridanie viacerých položiek, úprava, odstránenie, kontrola prekrytia bez straty vyplneného formulára, mobilné šírky 320 a 390 px.
- Žiadny pevný počet školských hodín na deň (test so 16 položkami). Neplatné dni, časy, nulové intervaly a neexistujúce triedy sa odmietnu.
- Verzie a oddelenie rozvrhov učiteľov: odmietnutie starej verzie, cudzieho vlastníka aj podvrhnutého poľa vlastníka. Opätovný zápis neobnoví odstránenú položku.
- JSON záloha a obnova cez UI obsahujú rozvrh, jeho odstránené položky a existujúce hodiny.
- Existujúca IndexedDB so stavom 1.0 sa otvorí bez migrácie; porovnanie potvrdilo nezmenené pôvodné dáta. Stará JSON záloha sa obnoví bez pridaných udalostí.
- Všetky pôvodné testy značiek, prípadov, exportov, tried a transakcií v dvoch kartách naďalej prechádzajú.

## Opakovanie

```sh
npm test
npm run build
```

Spustite `npm start` a v druhom termináli (s pripraveným Playwright podľa README):

```sh
npm run test:browser
npm run test:browser:timetable
```

Browser testy používajú izolované kontexty a fiktívne údaje. Voliteľná premenná `PHE_TEST_ARTIFACTS` určí iný priečinok výsledkov. Nástroj netestuje používateľovu bežnú databázu Chrome.
