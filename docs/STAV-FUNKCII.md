# Stav funkcií – prototyp 1.2

## Nové v 1.2 – dokončené

- Vstupná obrazovka s dátumom, triedou, skupinou a číslom/časom bloku; Zadať/Upraviť dochádzku bez úvodného formulára. História je zbalená samostatne.
- Upraviteľných deväť časov a 19 prednastavených blokov; bezpečný náhľad doplnenia, opätovné použitie tried, nové triedy bez žiakov.
- Zachovanie posledného výberu po vyučovaní, večer, po polnoci, cez víkend a bez rozvrhu. Aktivácia nového dňa od konfigurovateľných 06:00 v Bratislave.
- Výber bloku po zmene dátumu, viac hodín tej istej triedy, mimoriadna hodina a transakčné otvorenie existujúcej dochádzky aj pri súbehu kariet.
- Predvolená skupina a platnosť osobného rozvrhu, presun dňa a času.
- Vlastník hodiny, nezávislé témy a potvrdenia učiteľov; spoločný zoznam žiakov.
- Zmena skupiny a výslovné prevzatie s kontrolou kolízií, zachovaním značiek, tém a otvorených prípadov.
- Stavy naplánovaná, rozpracovaná a ukončená; overené uloženie a potvrdenie dochádzky.
- Prehľad rozpracovaných a minulých nezaznamenaných hodín, kalendár výučby/voľna, neuskutočnené hodiny bez dochádzky.
- Ed/Ep/– na obdobie vrátane otvoreného konca; manuálna značka má prednosť a potvrdená história sa neprepisuje.
- Kompaktný zoznam tried, abecedné a vlastné poradie učiteľa.
- Skupinové a spoločné exporty s oboma témami, kompletná záloha nových údajov.
- Kompatibilné načítanie údajov 1.0/1.1 a automatický lokálny snímok pred prvým zápisom 1.2.
- Testovacie mená učiteľov v lokálnych kartách; školská identita ostáva záležitosťou Etapy B.

Aktuálne výsledky: [protokol zjednodušenej dochádzky](TESTY-1.2-DOCHADZKA.md). Pôvodné výsledky 1.2 ostávajú v [staršom protokole](TESTY-1.2.md).

## Zachované z 1.1

- Nastavenia → Rozvrh: ľubovoľný počet položiek pre pondelok až piatok, začiatok, koniec a existujúca trieda; pridanie, úprava a odstránenie.
- Predvýber prebiehajúcej alebo nasledujúcej dnešnej triedy, aj počas prestávok, podľa Europe/Bratislava.
- Trvalé zapamätanie poslednej vybranej triedy na tomto zariadení; prednosť manuálneho výberu. V 1.2 sa pamätá aj automatický výber, skupina a blok.
- Ochrana rozpracovanej aj historickej hodiny vrátane obnovenia tej istej karty, ochrana neuložených vstupov a prebiehajúceho zápisu.
- Automatický výber nevytvára hodinu ani nemení historický záznam.
- Trvalý rozvrh v pôvodnom úložisku, kompletná obnova zo zálohy, staré zálohy 1.0 bez zmeny údajov.
- Pripravený osobný rozvrh školského účtu cez existujúce API s autorom, históriou, validáciou a kontrolou konfliktov.
- 51 automatických testov a 28 úspešných browser scenárov; podrobnosti v [TESTY-1.1.md](TESTY-1.1.md).

## Etapa A – dokončené

| Funkcia | Výsledok |
|---|---|
| Lokálny prototyp bez Google prihlásenia | Hotový, IndexedDB; otestovaný HTTP server, dodaný samostatný HTML súbor |
| 20 fiktívnych žiakov | Hotové, trieda 7. A, 10 chlapcov a 10 dievčat |
| Tvorba a úprava tried a žiakov | Hotové, archivácia bez zmazania histórie |
| Spoločný zoznam a prehľad celej triedy | Hotové; nové záznamy patria jednotlivým učiteľom/skupinám, staré spoločné hodiny zachované |
| Mobilný kompaktný zoznam | Hotový, voľby až po kliknutí na meno, automatické zbalenie |
| Presných 6 značiek a požadované farby | Hotové |
| A bez automatického ! | Hotové, samostatný doménový aj browser test |
| Neprítomnosť a Ed bez vyhodnotenia úboru | Hotové |
| Otvorené a vyriešené prípady | Hotové, červené upozornenie, Ep/Ed/bez ospravedlnenia, pôvodný dátum |
| Nová hodina jedným tlačidlom | Hotové, predvolená značka ✓ a aktuálny dátum |
| Viac hodín v jeden deň, téma, spätná úprava | Hotové, samostatné ID hodiny |
| Ukladanie a jeho indikátor | Hotové; značky hneď, textové polia po zmene a opustení poľa |
| História s časom a lokálnym autorom | Hotová; lokálny autor nie je overená školská identita |
| Polročná tabuľka žiaci × hodiny | Hotová, nastaviteľné obdobie, zachované historické zoznamy |
| CSV | Hotové, UTF-8, bodkočiarka, ošetrenie vzorcov |
| XLSX | Hotové, skutočný OOXML/ZIP, overený nezávislým čítačom |
| Tlač / PDF | Hotové cez tlač prehliadača, overené generovaným PDF |
| Úplná záloha a obnova | Hotové, validácia histórie a potvrdenie nahradenia až po náhľade |
| Súbežnosť kariet prehliadača | Hotové, IndexedDB transakcie, explicitný konflikt, ochrana aj po obnove |
| Automatické testy a slovenský návod | Dodané |

## Etapa B – pripravené, nenasadené

| Funkcia | Stav |
|---|---|
| Apps Script + Google Sheets | Implementovaný server a hotové súbory pre editor |
| Frontend cez HTML Service | Vygenerovaný Index.html a GoogleStore pre `google.script.run` |
| Explicitný zoznam učiteľov | Implementované, kontrola pri čítaní aj zápise |
| Serverová identita a autor | Implementované zamietnutie prázdnej/nepovolenej identity; vyžaduje overenie v škole |
| Súbežné zápisy | ScriptLock + kontrola verzií + jedna autoritatívna udalosť |
| Serverová validácia | Implementovaná a testovaná so simulovanými službami |
| História zmien a idempotentné opakovanie | Implementované a lokálne testované |
| Obnova školského úložiska | Pripravený a lokálne testovaný nástroj pre správcu; iba do prázdnej tabuľky |
| Bezpečná alternatíva pri nedostupnej identite | Technický návrh Cloud Run + IAP; neimplementovaná |

## Zostáva overiť alebo nie je súčasťou verzie

- Výber žiakov z viacerých tried v jednej skupine.
- Automatický import školského kalendára; sviatky a prázdniny zadáva učiteľ. Bez období výučby sú upozornenia na minulé plány vypnuté.
- Automatické rozdelenie a spojenie historických hodín bez času; pôvodné záznamy ostávajú samostatné.

- Reálne školské prihlásenie, oprávnenia, OAuth súhlas, dostupnosť e-mailu a doménové nasadenie Apps Script. **Autentifikácia ešte nie je prevádzkovo overená.**
- Reálne súbežné požiadavky dvoch školských účtov, výpadky Google služby a výkon pri školskom objeme. Simulované testy nie sú integračný test Google.
- Samostatný HTML cez `file://`: test zablokovala politika prehliadača `ERR_BLOCKED_BY_ADMINISTRATOR`. Overený spôsob je lokálny HTTP server.
- Fyzický iPhone/Safari a Windows Chrome vrátane sťahovania a systémovej tlače. Automaticky overené boli Chromium a mobilné rozmery v Linuxe.
- Natívne otvorenie XLSX v desktopovom Exceli. Súbor bol nezávisle načítaný cez openpyxl a ZIP/XML overené.
- Spoločná synchronizácia zariadení v lokálnom režime; tú poskytuje až nakonfigurovaná Etapa B.
- Živý prenos cudzích zmien a offline front v Google režime. Aktualizácia je pri otvorení, návrate alebo tlačidlom Obnoviť; server chráni zastarané záznamy verziami.
- Automatické plánované zálohovanie, podpisy záloh, audit odolný proti úpravám priamo v Sheets, automatická správa lehôt uchovávania a veľkokapacitná databáza.

Tieto nedokončené funkcie nemajú nefunkčné tlačidlá. V Google režime je obnova vysvetlená ako úloha správcu. XLSX ani tlačový PDF export nie sú iba zástupné tlačidlá.
