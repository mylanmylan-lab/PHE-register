# Stav funkcií – prototyp 1.0

## Etapa A – dokončené

| Funkcia | Výsledok |
|---|---|
| Lokálny prototyp bez Google prihlásenia | Hotový, IndexedDB; otestovaný HTTP server, dodaný samostatný HTML súbor |
| 20 fiktívnych žiakov | Hotové, trieda 7. A, 10 chlapcov a 10 dievčat |
| Tvorba a úprava tried a žiakov | Hotové, archivácia bez zmazania histórie |
| Spoločná evidencia celej triedy | Hotová, dve abecedné skupiny v jednom zázname hodiny |
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

- Reálne školské prihlásenie, oprávnenia, OAuth súhlas, dostupnosť e-mailu a doménové nasadenie Apps Script. **Autentifikácia ešte nie je prevádzkovo overená.**
- Reálne súbežné požiadavky dvoch školských účtov, výpadky Google služby a výkon pri školskom objeme. Simulované testy nie sú integračný test Google.
- Samostatný HTML cez `file://`: test zablokovala politika prehliadača `ERR_BLOCKED_BY_ADMINISTRATOR`. Overený spôsob je lokálny HTTP server.
- Fyzický iPhone/Safari a Windows Chrome vrátane sťahovania a systémovej tlače. Automaticky overené boli Chromium a mobilné rozmery v Linuxe.
- Natívne otvorenie XLSX v desktopovom Exceli. Súbor bol nezávisle načítaný cez openpyxl a ZIP/XML overené.
- Spoločná synchronizácia zariadení v lokálnom režime; tú poskytuje až nakonfigurovaná Etapa B.
- Živý prenos cudzích zmien a offline front v Google režime. Aktualizácia je pri otvorení, návrate alebo tlačidlom Obnoviť; server chráni zastarané záznamy verziami.
- Automatické plánované zálohovanie, podpisy záloh, audit odolný proti úpravám priamo v Sheets, automatická správa lehôt uchovávania a veľkokapacitná databáza.

Tieto nedokončené funkcie nemajú nefunkčné tlačidlá. V Google režime je obnova vysvetlená ako úloha správcu. XLSX ani tlačový PDF export nie sú iba zástupné tlačidlá.
