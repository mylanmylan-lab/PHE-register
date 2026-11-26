# PHE Register – stav projektu

Kontrola 26. 11. 2026; vetva main; verzia 1.2.0 podľa package.json. Stav vychádza z README.md, docs/PWA-IPHONE.md a kontroly testovacieho spúšťača tools/test.cjs. Testy neboli v tejto kontrole spustené.

## Zdokumentované funkcie
- Lokálna IndexedDB evidencia, skupiny, triedy, značky ✓ / – / A / ! / Ep / Ed, prípady a história.
- Rozvrh, výber hodiny, potvrdenie dochádzky, nezaznamenané hodiny, dlhodobé ospravedlnenia, lokálny režim viacerých učiteľov a suplovanie.
- CSV, XLSX, tlač/PDF, úplná JSON záloha a migrácie.
- PWA build, offline režim a pripravený Google Apps Script backend.

## Otvorené
1. Overiť stav GitHub Pages a workflow; dokumentácia uvádza manuálne nasadenie, ktoré nebolo vykonané. Overiť aj stav PR #3 pred ďalšími krokmi.
2. Fyzický iPhone: inštalácia, offline otvorenie, zápis, záloha, obnova a aktualizácia s fiktívnymi údajmi.
3. Školský Google Workspace: schválenie IT, autentifikácia, oprávnenia, spoločné úložisko a synchronizácia; backend zatiaľ podľa dokumentácie nenasadený.
4. Overiť rozpor v čase 6. hodiny: staršia požiadavka 12:30–13:25, README 12:40–13:25. Bez potvrdenia nemeníme.

## Obmedzenia
Lokálne zariadenia majú oddelené úložiská. Verejný repozitár nesmie obsahovať skutočné školské údaje. Pred zmenou pôvodu alebo migráciou vytvoriť zálohu. Úplný bezpečnostný audit ani kontrola živého nasadenia neprebehli.
