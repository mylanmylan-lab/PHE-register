# PHE Register 1.2 – testový protokol

Overené 25. 10. 2026 v Linuxe, Node.js 24.19.0 a Chromium 154. Všetky scenáre používajú fiktívne údaje a samostatné kontexty prehliadača. Žiadna používateľova lokálna evidencia ani školský server sa pri teste neotvárali.

| Oblasť | Výsledok |
|---|---|
| Pôvodná doména: značky, história, prípady, exporty | 19 / 19 |
| Rozvrh 1.1 a hranice predvýberu | 19 / 19 |
| Nová doména 1.2: skupiny, učitelia, potvrdenie a obdobia | 29 / 29 |
| Skutočný Apps Script kód so simulovanými službami Google | 15 / 15 |
| Pôvodné scenáre používateľského rozhrania | 13 / 13 |
| Scenáre rozvrhu v prehliadači | 15 / 15 |
| Scenáre pracovného postupu 1.2 v prehliadači | 20 / 20 |
| Samostatný HTML cez `file://` | SKIP – politika Chromium `ERR_BLOCKED_BY_ADMINISTRATOR` |

Spolu **82 automatických testov a 48 úspešných scenárov v Chromium**. Prešli `npm run build`, kontrola syntaxe JavaScriptu, kontrola diffu a `python3 spustit.py --help`. Generované súbory zodpovedajú zdrojom. XLSX a tlačové PDF vznikli cez skutočné ovládanie aplikácie.

Výstupy: [automatické testy](../tests/artifacts/unit-results-1.2.txt), [regresné scenáre](../tests/artifacts/browser-results-1.2.txt), [rozvrh](../tests/artifacts/timetable-browser-results-1.2.txt), [pracovný postup 1.2](../tests/artifacts/workflow-browser-results-1.2.txt), [kontrola exportov](../tests/artifacts/export-results-1.2.txt). Pôvodné testy a výsledky 1.0/1.1 sú zachované. Backendový test pôvodnej spoločnej hodiny používa historický záznam v testovacom úložisku: nový server už zámerne odmieta vytváranie hodín starým klientom bez skupiny a času.

## Overené situácie

- Aktuálna a nasledujúca hodina, presné hranice intervalov, prestávka, víkend, čas Bratislavy a letný čas.
- Manuálny výber aj predvolená skupina vybranej triedy; rozpracovaný alebo historický záznam automatika nezmení.
- Dvaja učitelia v dvoch kartách rovnakej IndexedDB, spoločná trieda, rozdielne skupiny, témy, značky a nezávislé ukončenie.
- Opakované otvorenie toho istého plánu nevytvorí nový záznam. Zápis do cudzej hodiny je odmietnutý, prevzatie vyžaduje osobitnú operáciu a aktuálnu revíziu.
- Rozšírenie skupiny na celú triedu: náhľad konfliktu, zrušenie bez zmeny, potvrdený prenos značiek, tém a otvoreného prípadu; súbežný zásah neprejde potichu.
- Aj čiastočné a opakované prevzatie zachová správnu zostávajúcu skupinu a nevytvorí dva otvorené prípady pre rovnaký zápis.
- Simulované zlyhanie ukončenia v prehliadači: žiadne úspešné potvrdenie, rozpracovaná hodina aj text témy zostanú zachované. Ďalší úspešný pokus potvrdí tému a dochádzku.
- Neistý výsledok serverového zápisu vráti chybu; opakovanie rovnakej požiadavky nezapíše druhú udalosť.
- Predvolené ✓ a nepotvrdená dochádzka sú oddelené. Ukončenie a neskoršia oprava majú históriu autora a času.
- Ed/Ep/– na obdobie, vrátane hraničných dní a otvoreného konca; ručná značka má prednosť. Úprava alebo odstránenie obdobia neprepíše potvrdené historické hodnoty ani po opätovnom otvorení.
- Minulé plány sa zobrazia až po nastavení kalendára. Voľno ich vylúči; označenie Neuskutočnená nevytvorí dochádzku. Spätné doplnenie zachová dátum plánu a použije správne predvyplnenie.
- Poradie tried a presun rozvrhu medzi dňami pretrvajú po obnovení stránky.
- Skupinový a spoločný export, obe témy, bez duplicitných žiakov po prevzatí; CSV, XLSX a tlačový PDF.
- Úplná záloha/obnova zahŕňa všetky nové udalosti. Pôvodná IndexedDB sa otvorí bez zmeny a uloží sa osobitný snímok pred 1.2.
- Mobilné šírky 320 a 390 px pre nové obrazovky, pôvodné scenáre aj 375/430 px; bez chýb JavaScriptu.

## Reprodukcia

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
```

Voliteľné premenné: `PHE_CHROMIUM` pre cestu k prehliadaču, `PHE_TEST_URL` pre lokálnu adresu a `PHE_TEST_ARTIFACTS` pre samostatný priečinok výstupov.

Fyzický iPhone/Safari, Windows Chrome verzie 1.2 a skutočné Google Workspace účty neboli v tomto prostredí dostupné. Úspešný používateľský test Windows verzie 1.1 sa nepovažuje za test 1.2. Pred školským nasadením treba vykonať akceptáciu podľa technického návodu. Aplikácia ani backend neboli publikované alebo nasadené.
