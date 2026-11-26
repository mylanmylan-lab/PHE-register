# Testovanie a výsledky

Dátum overenia: **23. 10. 2026**, časové pásmo používateľského rozhrania Europe/Bratislava.

## Súhrn vykonaného overenia

| Oblasť | Výsledok |
|---|---|
| Doménové automatické testy | **19 / 19 prešlo** |
| Reálny zdroj Code.gs so simulovanými Google službami | **12 / 12 prešlo** |
| Browser scenáre cez HTTP, Linux Chromium | **13 / 13 prešlo** |
| Otvorenie samostatného HTML cez file:// | **Preskočené po blokovaní politikou prehliadača** |
| Nezávislá kontrola CSV, XLSX a PDF | **Prešlo** |
| Fyzický iPhone Safari / Windows Chrome | **Nevykonané – zariadenia neboli dostupné** |
| Školský Google Workspace a reálne prihlásenie | **Nevykonané – prostredie nebolo pripojené ani nasadené** |

Prostredie: Linux, Node.js **24.19.0**, Python **3.12.14**, Chromium **154.0.8037.57**, Playwright. Aplikácia nepotrebuje Playwright ani Python knižnice na samotný beh. Na nezávislú kontrolu XLSX bol použitý openpyxl, na kontrolu PDF `pdftotext`.

Úplné výstupy:

- [Výsledky domény a backendu](../tests/artifacts/unit-results.txt)
- [Výsledky prehliadača](../tests/artifacts/browser-results.txt)
- [Výsledky exportov](../tests/artifacts/export-results.txt)
- [Desktopový náhľad](../tests/artifacts/desktop.png)
- [Mobilný náhľad](../tests/artifacts/mobile.png)
- [Rozbalené možnosti na mobile](../tests/artifacts/mobile-options.png)
- [Overený XLSX](../tests/artifacts/prehlad.xlsx), [CSV](../tests/artifacts/prehlad.csv), [PDF](../tests/artifacts/prehlad.pdf) a [úplná fiktívna záloha](../tests/artifacts/zaloha.json)

## Deväť povinných scenárov

Všetky sú priamo pomenované v `tests/domain.test.cjs`.

| Č. | Situácia | Overený výsledok |
|---|---|---|
| 1 | Nová hodina | Všetkých 20 záznamov má ✓, prítomnosť aj úbor sú true, žiak cvičí |
| 2 | Výber A | Necvičí, nemá úbor, nevzniká ! ani prípad |
| 3 | Výber ! | Vznikne otvorený prípad s pôvodným ! a dátumom |
| 4 | ! → Ep | Prípad je vyriešený, pôvodná udalosť ostáva |
| 5 | Výber Ed | Necvičí, úbor má hodnotu null, predošlé A sa nevykazuje |
| 6 | Neprítomnosť | Úbor null, dôvod necvičenia null, cvičenie false |
| 7 | Dve hodiny v rovnaký deň | Rôzne ID, 40 nezávislých záznamov, samostatné stĺpce |
| 8 | Spätná úprava | Pôvodné udalosti a dátum otvorenia prípadu ostanú nezmenené |
| 9 | Súbežná úprava | Stará verzia toho istého záznamu vyvolá CONFLICT; rôzni žiaci si neprepíšu údaje |

Ďalšie doménové testy pokrývajú uzavretie bez ospravedlnenia, riešenie po skončení hodiny, ! → A, opakované otvorenie, obnovu zálohy, poškodené vstupy, idempotenciu, historické zoznamy žiakov, slovenské triedenie, školský polrok a exportné escapovanie.

## Browser scenáre

Súbor `tests/browser.cjs` automaticky používa skutočné UI a IndexedDB:

1. Nová hodina a všetkých 20 značiek ✓.
2. A bez prípadu, automatické zbalenie a trvalosť po obnovení stránky.
3. ! vytvorí prípad, Ep ho vyrieši.
4. Dve hodiny v ten istý deň majú samostatné záznamy.
5. Ukončenie nevymaže prípad; dodatočné uzavretie bez ospravedlnenia funguje.
6. Dve karty v rovnakom kontexte vykonajú súbežné transakcie: jeden konflikt pri rovnakom žiakovi a oba zachované zápisy pri rôznych žiakoch.
7. Tlačidlá skutočne vytvoria CSV, XLSX a tlačový PDF súbor.
8. Úplná JSON záloha sa obnoví cez rozhranie s rovnakou históriou.
9. Obnova v jednej karte zneplatní zastarané zápisy druhej karty aj pri zhodných číselných verziách.
10. Vytvorenie triedy, pridanie žiačky, automatické uloženie a nová samostatná hodina.
11. Šírka 390 px nepretečie vodorovne, voľby značiek majú aspoň 44 px.
12. Kontrola pretečenia pri šírkach 320, 375 a 430 px.
13. Žiadna zachytená JavaScript chyba pri uvedených scenároch.

Dodatočná skúška `file://` skončila na **`ERR_BLOCKED_BY_ADMINISTRATOR`**. Test túto konkrétnu politiku zaznamená ako SKIP; ostatné chyby nezamlčuje. Nebola obchádzaná politika prehliadača. Hlavný podporený a overený postup v README preto používa lokálny HTTP server.

Mobilné rozmery v Chromium overujú rozloženie, nie WebKit ani správanie fyzického iPhone. Farebné značky sú zároveň označené textom; význam nezávisí iba od farby.

## Backend testy: čo dokazujú

`tests/backend.test.cjs` načíta skutočný `Code.gs` a spoločný doménový kód do Node VM. Nahrádza len služby Google explicitnými simuláciami. Overuje:

- Zamietnutie prázdneho e-mailu, nepovoleného a externého účtu.
- Zamietnutie nesúladu active/effective identity a chýbajúcej konfigurácie.
- Inicializáciu bez prepisu údajov a obmedzenie správcovských úloh.
- Serverový čas a autora, odmietnutie podvrhnutých klientskych polí.
- Konflikt rovnakého záznamu a zachovanie rôznych záznamov.
- Nejasné zlyhanie po zápise a bezpečné opakovanie rovnakého requestId.
- ! → Ed s uchovanou históriou.
- Neplatné značky, dátumy a operácie bez zápisu.
- Zablokovanie poškodenej histórie, uvoľnenie zámku a odpoveď BUSY.
- Skutočne vygenerovaný administračný skript obnovy, rovnakú históriu po obnove a odmietnutie neprázdneho cieľa.

**Nedokazujú dostupnosť Session identity, skutočné oprávnenia, časovanie ScriptLock, transakčné vlastnosti služby Sheets ani úspech nasadenia.** Pre to je povinný školský akceptačný postup v [GOOGLE-WORKSPACE.md](GOOGLE-WORKSPACE.md).

## Nezávislá kontrola exportov

- XLSX: úspešná kontrola CRC všetkých ZIP častí, parsovanie všetkých XML a otvorenie cez openpyxl. Overených 21 riadkov × 4 stĺpce, meno „Bielik Adam“, značky A a ✓ v nezávislých hodinách. Desktopový Microsoft Excel nebol dostupný.
- CSV: načítanie štandardným CSV parserom s UTF-8 BOM a bodkočiarkou, rovnaký počet riadkov/stĺpcov a hodnoty. Doménový test navyše kontroluje úvodzovky a ošetrenie vzorcov.
- PDF: vygenerované Chromium s tlačovým CSS; `pdftotext` potvrdil nadpis, mená s diakritikou a značky ✓, Ep, Ed. Systémový dialóg Safari nebol dostupný.

## Opakovanie

```sh
npm run build
npm test
```

Pre browser testy spustite `npm start`, v druhom termináli `npm run test:browser`. Jednorazová inštalácia testovacieho nástroja je opísaná v README. Testy používajú nový izolovaný kontext prehliadača a fiktívne údaje; nezasahujú do evidencie vo vašom bežnom Chrome.

Pred používaním skutočných školských údajov doplňte manuálny test oboch cieľových zariadení a celú školskú akceptáciu. Tento protokol tieto nevykonané testy neoznačuje ako úspešné.
