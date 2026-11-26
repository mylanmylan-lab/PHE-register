# PHE Register na jednom iPhone

Aplikácia je pripravená na inštaláciu z HTTPS adresy. Údaje zostávajú v pôvodnej IndexedDB `phe-register-v1` na zariadení; neodosielajú sa na GitHub ani do Google Sheets. Iný telefón alebo prehliadač má vlastnú evidenciu. Zálohy obsahujú celú evidenciu, preto ich nezverejňujte v repozitári.

## Jednorazové sprístupnenie na GitHube

1. Skontrolujte a zlúčte PR #3 do `main` (obsahuje kompletnú aplikáciu aj PWA).
2. V repozitári otvorte **Settings → Pages → Source → GitHub Actions**.
3. V **Actions → PHE Register Pages → Run workflow** vyberte `main`.
4. Po úspešnom dokončení otvorte adresu z výstupu deploy, očakávaná adresa je `https://mylanmylan-lab.github.io/PHE-register/`.

Workflow sa spúšťa iba ručne. Publikuje výhradne zostavený priečinok `dist` so statickými súbormi aplikácie, nie zálohy, dokumentáciu ani Apps Script backend. Samotné zlúčenie PR nespustí publikovanie. Nastavenie Pages a nasadenie zatiaľ neboli vykonané.

## Inštalácia a offline skúška

1. Na iPhone otvorte publikovanú adresu v **Safari**, so zapnutým internetom.
2. Počkajte na text **Offline aplikácia pripravená**.
3. Zvoľte **Zdieľať → Pridať na plochu → Pridať** (ak je dostupné, ponechajte Otvoriť ako webovú aplikáciu).
4. Otvorte aplikáciu jej ikonou na ploche, ešte online. Znova počkajte na pripravenosť offline režimu. Safari a nainštalovaná aplikácia nemusia zdieľať rovnakú evidenciu; odteraz používajte tú istú ikonu.
5. Na skúšku použite fiktívnu triedu 7. A, vytvorte hodinu a zmeňte značku. Ukončite hodinu.
6. Zapnite režim Lietadlo a vypnite aj Wi-Fi. Aplikáciu zatvorte cez prepínač aplikácií a znovu otvorte ikonou.
7. Overte uloženú hodinu, zmeňte značku, vytvorte ďalší blok a otvorte históriu. V Údajoch vyskúšajte export zálohy aj offline.

## Úplná záloha a obnova

Aspoň raz týždenne a pred aktualizáciou: **Údaje → Stiahnuť zálohu**. Súbor `PHE-zaloha-DATUM.json` uložte cez Safari/Súbory; zo stiahnutého súboru môžete použiť **Zdieľať → Uložiť do Súborov**. Pri offline skúške vyberte **Na mojom iPhone**. CSV, XLSX a PDF sú prehľady, nie úplná záloha.

JSON zahŕňa triedy, žiakov, hodiny, značky, skupiny, rozvrh a jeho časy, ospravedlnenia, prípady aj históriu. Obnova: **Údaje → Vybrať súbor zálohy**, skontrolovať náhľad a až potom **Nahradiť lokálne údaje**. Existujúce údaje sa nahradia iba po tomto potvrdení. Pred obnovou si stiahnite aj aktuálnu zálohu.

Pri prenose z Windows alebo inej adresy exportujte JSON v pôvodnej aplikácii a obnovte ho v nainštalovanej PWA. Výmena súborov aplikácie nemení databázu, zmena adresy však znamená iné úložisko. Vymazanie dát webu alebo odinštalovanie môže odstrániť evidenciu; JSON uchovávajte aj mimo aplikácie.

## Aktualizácie

Po publikovaní nového buildu sa nová verzia pripraví na pozadí. Ak zostávajú otvorené okná starej verzie, zobrazí sa upozornenie. Najprv uložte rozpracovaný zápis, potom zatvorte všetky okná PHE Register vrátane kariet Safari a aplikácie z plochy. Znova otvorte aplikáciu. Aktualizácia sama nevynucuje obnovenie obrazovky a nemaže IndexedDB. Bez internetu pokračuje už pripravená verzia.

## Rozsah overenia

Automatický test `npm run test:browser:pwa` používa skutočný Chromium, samostatný profil, projektovú cestu `/PHE-register/`, reštart prehliadača offline, export a potvrdenú obnovu, čakajúcu aktualizáciu s rozpracovaným textom a zachovanie databázy po aktivácii novej verzie. Fyzický iPhone/Safari a systémový dialóg Pridať na plochu neboli pri vývoji overené; vykonajte uvedenú skúšku pred pravidelným používaním.

Overenie 26. 11. 2026: `npm test` **100/100**, `npm run build` úspešný, `PHE_CHROMIUM=/usr/bin/chromium node tests/pwa-browser.cjs` **3/3 scenáre**. Výstupy: `tests/artifacts/pwa-browser-results.txt` a `tests/artifacts/unit-results-pwa.txt`. Ide o Chromium na Linuxe, nie fyzický iPhone. Pôvodné browser protokoly 1.2 opisujú predchádzajúce overenie; v tomto doplnení bol spustený nový PWA scenár a všetky dátové testy.
