# PHE Register 1.2 – zjednodušená dochádzka a ranný rozvrh

Overené 25. 10. 2026 v Linuxe, Node.js 24.19.0 a Chromium 154. Testy používajú izolované profily a fiktívnych žiakov. Existujúce používateľské údaje ani školský Google Workspace neboli súčasťou testov.

| Oblasť | Výsledok |
|---|---|
| Pôvodná doména: značky, prípady, história a exporty | 19 / 19 |
| Rozvrh: hranice, manuálny výber, ochrana zápisov | 19 / 19 |
| Pracovný postup 1.2: skupiny, učitelia, ukončenie, obdobia | 29 / 29 |
| Nové prednastavenie, čas dňa, opakované otvorenie a kompatibilita | 16 / 16 |
| Apps Script so simulovanými Google službami | 17 / 17 |
| Pôvodné scenáre rozhrania v Chromium | 13 / 13 |
| Scenáre rozvrhu v Chromium | 15 / 15 |
| Scenáre skupín a pracovného postupu v Chromium | 20 / 20 |
| Nový vstup dochádzky, aktualizácia a časové hranice v Chromium | 20 / 20 |
| Samostatný HTML cez `file://` | SKIP – politika Chromium |

Spolu **100 / 100 automatických testov dátovej logiky a servera** a **68 / 68 scenárov v Chromium**. Navyše prešiel build, kontrola syntaxe/diffu, Python spúšťač `--help` a otvorenie vygenerovaného HTML balíka cez HTTP. `Domain.gs` zodpovedá zdieľanej doméne a `Index.html` samostatnému HTML. XLSX bol načítaný nezávislým openpyxl; export zachoval 10 dievčat a obe témy v spoločnej hodine. Tlačový PDF má platnú hlavičku a ukončenie.

## Čo je overené

- Presné časy deviatich hodín a 19 blokov; osem pomenovaných tried vzniká bez žiakov. Už existujúce triedy sa použijú znovu, nejednoznačný názov vyžaduje priradenie.
- Staré databázy 1.0/1.1/1.2 sa pri otvorení neprepisujú. Náhľad doplnenia preskočí obsadené bloky, zachová triedy a celý prefix pôvodných udalostí. Opakované použitie nepridá duplicitné triedy ani položky rozvrhu.
- Vstupná obrazovka predvyberie dátum, triedu, skupinu a blok bez vytvorenia dochádzky. Tlačidlo vytvorí rozpracovaný záznam; pri opakovaní otvorí pôvodný bez novej udalosti.
- Skutočné súbežné IndexedDB transakcie dvoch kariet rovnakého učiteľa vytvoria jediný záznam aj pri rozdielnych ID požiadaviek. Serverový kontrakt overuje rovnaké správanie a zachovanie pôvodnej témy.
- Zmena dátumu vyhodnotí vybraný deň, viac blokov rovnakej triedy má samostatné záznamy, mimoriadna hodina má vlastný čas. Manuálna skupina a blok sa dajú vrátiť na rozvrh aj bez zmeny triedy.
- Koniec poslednej hodiny, 22:00, polnoc a 05:59 zachovajú posledný výber aj po reštarte stránky. O 06:00 sa ponúkne prvá dnešná trieda. Overená je aj konfigurácia 07:00, letný čas a zariadenie v pásme America/New_York pri školskom čase Europe/Bratislava.
- Prestávka vyberá ďalší dnešný blok; manuálny výber má prednosť do aktivácie ďalšieho dňa. Sobota, nedeľa a deň bez rozvrhu nič nevytvárajú.
- Rozpracované a historické záznamy zachovajú triedu a dátum pri zmene času aj obnovení stránky. Návrat z ručne upravenej hodiny zachová jej nový dátum a skupinu vo výbere.
- Nastavenie časov mení naviazaný rozvrh, nie starú dochádzku. JSON záloha a obnova obsahujú prednastavenie, začiatok dňa, časy a všetky staršie udalosti.
- Zachované sú A bez !, Ed/Ep/neprítomnosť, otvorené prípady, témy, prednastavenia na obdobie, prevzatie skupiny s potvrdením, kontrola konfliktov, ukončenie aj pri simulovanej chybe zápisu, história, exporty a predchádzajúca záloha.
- Nový vstup funguje pri 320/390 px bez vodorovného pretečenia a chýb JavaScriptu. Pôvodné scenáre pokrývajú aj 375/430 px.

Pôvodné regresné testy sú zachované. Výber z histórie sa teraz v testoch rozbalí, druhá hodina volí iný blok a očakávanie po vyučovaní sa podľa nového zadania zmenilo z poslednej manuálnej na poslednú vybranú triedu. Regresné profily používajú starú databázu bez automatického prednastavenia; čistú inštaláciu overuje nová samostatná sada.

## Výstupy a opakovanie

- [Automatické testy](../tests/artifacts/unit-results-1.2-entry.txt)
- [Pôvodné rozhranie](../tests/artifacts/browser-results-1.2-entry.txt)
- [Rozvrh](../tests/artifacts/timetable-browser-results-1.2-entry.txt)
- [Skupiny a pracovný postup](../tests/artifacts/workflow-browser-results-1.2-entry.txt)
- [Nové zadanie dochádzky](../tests/artifacts/entry-browser-results-1.2.txt)
- [Mobilný náhľad](../tests/artifacts/attendance-mobile-1.2.png)

```sh
npm test
npm run build
npm start
```

V druhom termináli po príprave Playwright podľa README:

```sh
npm run test:browser
npm run test:browser:timetable
npm run test:browser:workflow
npm run test:browser:entry
```

Použité premenné: `PHE_CHROMIUM=/usr/bin/chromium`, samostatný `PHE_TEST_ARTIFACTS` pre každú sadu. Predvolená adresa je `http://127.0.0.1:4173`; možno zmeniť cez `PHE_TEST_URL`.

Fyzický iPhone/Safari, Windows Chrome tejto aktualizácie a skutočný Google Workspace zostávajú na manuálne/školské overenie. Emulácia mobilnej šírky nie je test Safari. Vygenerovaný HTML bol overený cez HTTP; `file://` blokuje politika testovacieho prehliadača. Serverové testy používajú simulované Google služby, preto nedokazujú školské prihlásenie ani dostupnosť Sheets. Aplikácia ani backend neboli nasadené.
