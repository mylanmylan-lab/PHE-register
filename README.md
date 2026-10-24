# PHE Register 1.1 – Inteligentný rozvrh

Funkčný mobilný prototyp evidencie účasti a pripravenosti na PHE. Rozhranie je v slovenčine, bez platených služieb a bez knižníc potrebných na samotný beh. Obsahuje **20 fiktívnych žiakov** v triede 7. A.

**Etapa A je implementovaná a lokálne otestovaná. Etapa B má pripravený zdrojový kód a návod; do Google Workspace nebola nasadená.** Žiadne skutočné osobné údaje nie sú súčasťou projektu.

## Začnite tu

1. Na GitHube otvorte **Code → Download ZIP** a celý archív rozbaľte do priečinka. Pri práci s Gitom môžete repozitár naklonovať. Súbory aplikácie sú priamo v koreni repozitára.
2. Spustite lokálny server podľa nasledujúcich krokov; na Windows je pripravený **Spustit-Windows.cmd**.
3. V aplikácii kliknite na **Nová hodina**. Všetci žiaci začínajú so značkou ✓.
4. Kliknite na meno žiaka, potom na požadovanú značku. Panel sa zbalí a zmena sa uloží.
5. V **Údaje → Stiahnuť zálohu** si pravidelne uložte obnoviteľný súbor JSON.

Je dodaný aj samostatný **PHE-Register.html** so všetkým kódom, ktorý možno skúsiť otvoriť dvojklikom v Chrome. **Tento spôsob cez `file://` nebol overený:** politika dostupného testovacieho prehliadača ho blokovala. Podpora databázy pri lokálnych súboroch sa líši. Pri probléme použite otestovaný server nižšie. Pri zmene cesty súboru, adresy alebo portu môže prehliadač zobraziť samostatnú evidenciu; pred presunom vytvorte zálohu.

## Odporúčané spustenie: lokálny server

Potrebujete bezplatný Python 3 z [python.org](https://www.python.org/downloads/). Pri inštalácii na Windows zaškrtnite pridanie Pythonu do PATH, ak je táto možnosť dostupná.

1. Dvojklikom otvorte **Spustit-Windows.cmd**.
2. Otvorí sa prehliadač na **http://127.0.0.1:4173**. Ak sa neotvorí, skopírujte túto adresu do Chrome.
3. Okno spúšťača nechajte otvorené. Ukončenie: `Ctrl+C`, potom zatvoriť okno.

Na macOS/Linux otvorte terminál v priečinku projektu a použite:

```sh
python3 spustit.py
```

Ak používate Node.js 20 alebo novší, rovnakú aplikáciu spustí aj:

```sh
npm start
```

`npm install` nie je potrebné na aplikáciu ani základné testy. Ak je port obsadený, použite `python spustit.py --port 4174`; zmena portu znamená samostatné lokálne úložisko.

## Aktualizácia z 1.0 na 1.1 vo Windows

1. V pôvodnej aplikácii otvorte **Údaje → Stiahnuť zálohu** a odložte JSON mimo priečinka aplikácie. Poznačte si adresu z prehliadača.
2. Zatvorte všetky karty PHE Register a zastavte pôvodný server cez `Ctrl+C`.
3. Z GitHubu stiahnite verziu 1.1 a rozbaľte celý projekt. Pred zlúčením pull requestu vyberte vetvu `codex/phe-register-smart-schedule-1-1`; po zlúčení použite `main`.
4. Spustite **Spustit-Windows.cmd** z nového priečinka. Otvorte aplikáciu v rovnakom prehliadači a používateľskom profile na **presne rovnakej adrese a porte** ako doteraz. Napríklad `http://127.0.0.1:4173` a `http://localhost:4173` sú pre úložisko odlišné adresy.
5. Skontrolujte pôvodné triedy a hodiny. Rozvrh nastavte cez **Nastavenia → Rozvrh → Pridať hodinu**, zadajte začiatok, koniec a triedu a kliknite **Uložiť do rozvrhu**.

Údaje evidencie sú v prehliadači, nie v stiahnutom priečinku ani na GitHube. Verzia 1.1 používa rovnakú databázu a existujúce údaje pri otvorení nemaže ani nenahrádza fiktívnymi. Pri bežnej aktualizácii preto netreba obnovovať zálohu ani vymazávať dáta prehliadača. Ak sa objaví prázdna alebo ukážková evidencia, najprv skontrolujte pôvodnú adresu, port a profil; do novej evidencie zatiaľ nezapisujte. Pri zámernom presune na inú adresu alebo zariadenie použite uloženú JSON zálohu podľa časti **Export a obnova**.

## Vyskúšanie na iPhone

1. Počítač a iPhone pripojte k rovnakej dôveryhodnej Wi-Fi.
2. V priečinku projektu spustite `py -3 spustit.py --lan` na Windows alebo `python3 spustit.py --lan` na macOS/Linux.
3. Na Windows zistite IPv4 adresu počítača príkazom `ipconfig`. Napríklad `192.168.1.25`.
4. V Safari otvorte napríklad **http://192.168.1.25:4173**. Použite skutočnú adresu svojho počítača.
5. Ak sa stránka nenačíta, povoľte Pythonu súkromnú sieť vo firewalle. Školská Wi-Fi môže komunikáciu medzi zariadeniami blokovať; vtedy pomôže správca siete.

LAN režim slúži iba na test s fiktívnymi údajmi. Server sprístupňuje súbory aplikácie, **nesynchronizuje evidenciu**. iPhone a počítač majú vlastné oddelené úložiská. Safari musí mať povolené ukladanie dát. Náhľad HTML v aplikácii Súbory nenahrádza Safari cez server. Odporúčané sú aktuálne Chrome a Safari, iOS 16 alebo novší.

## Ovládanie

- **Hodiny:** vyberte triedu, vytvorte novú hodinu, upravte dátum a voliteľnú tému. Dátum sa predvyplní podľa Europe/Bratislava. Aj v jeden deň môžete vytvoriť viac samostatných hodín.
- **Zoznam žiakov:** chlapci a dievčatá sú samostatne a abecedne podľa priezviska. V zbalenom stave vidíte iba meno a značku. Ťuknutie rozbalí veľké voľby.
- **Ukončiť hodinu:** zastaví bežné úpravy značiek. Staršiu hodinu vyberte zo zoznamu a kliknite **Znovu otvoriť**. Pôvodné zápisy zostanú v histórii.
- **Prípady:** otvorené ! sú viditeľné naprieč všetkými triedami a po skončení hodiny. Vyriešte ich ako Ep, Ed alebo bez ospravedlnenia. Uzavretie bez ospravedlnenia ponechá značku !, ale odstráni prípad z počtu otvorených. Vyriešené prípady zostávajú v prehľade aj histórii.
- **Triedy:** vytvorte triedu, doplňte mená a skupinu. Platná úprava sa automaticky uloží po opustení poľa; je dostupné aj tlačidlo Uložiť triedu. Pri novom žiakovi treba doplniť meno aj priezvisko. Tlačidlo − archivuje žiaka, ↶ ho obnoví. Staré hodiny si ponechajú pôvodný zoznam a mená.
- **Polrok:** tabuľka žiaci × hodiny, s voľbou obdobia. Prvý polrok je september–január, druhý február–august; dátumy možno zmeniť. Kliknutím na dátum otvoríte hodinu. Prázdne pole znamená, že žiak nebol v zozname danej hodiny.
- **História:** rozbaľte žiaka alebo prípad. V Údajoch je posledných 100 zmien; JSON záloha obsahuje všetky.
- **Nastavenia → Rozvrh:** pri pracovnom dni kliknite na Pridať hodinu, vyplňte začiatok, koniec a existujúcu triedu, potom Uložiť do rozvrhu. Počet položiek nie je pevne stanovený. Uložené položky možno upraviť alebo odstrániť.

### Ako funguje inteligentný rozvrh

Pri otvorení aplikácie sa predvyberie práve prebiehajúca trieda. Pred prvou hodinou a počas prestávky sa vyberie nasledujúca trieda **toho istého dňa**. Začiatok je vrátane, koniec už patrí prestávke alebo ďalšej hodine. Časy používajú Europe/Bratislava vrátane zmeny letného času. Hodiny jedného učiteľa sa nemôžu prekrývať; bezprostredne nadväzujúce časy sú povolené.

Rozvrh mení iba výber triedy. **Záznam vytvorí až tlačidlo Nová hodina.** Po ukončení rozpracovaného zápisu sa môže ponúknuť nasledujúca naplánovaná trieda. Kým je zápis rozpracovaný, pole rozeditované alebo prebieha ukladanie, trieda sa automaticky neprepne.

Triedu môžete vždy vybrať manuálne. Tento výber platí počas aktuálneho otvorenia aplikácie, kým nepoužijete **Použiť rozvrh**. Cez víkend, v prázdny deň alebo po poslednej hodine sa použije posledná manuálne zvolená trieda. Tento údaj si prehliadač pamätá aj po zatvorení. Ak ešte manuálny výber neexistuje, zostane aktuálna alebo prvá dostupná trieda.

Otvorenie historickej hodiny pozastaví automatiku: trieda, dátum a téma zostanú zachované, aj pri obnovení tej istej karty. Na automatický výber sa vrátite výslovne cez **Späť na rozvrh**. Rozpracovaná hodina sa pri obnovení tej istej karty tiež zachová. Stav otvorenej karty nie je synchronizovaný medzi zariadeniami.

Lokálny rozvrh sa ukladá v existujúcej IndexedDB a je už zahrnutý v úplnej JSON zálohe. Staré zálohy 1.0 sa načítajú bez rozvrhu a bez zmeny pôvodných údajov. Formát `schema: 1` zostáva zachovaný; pribudli typy udalostí rozvrhu. **Zálohu obsahujúcu rozvrh obnovujte vo verzii 1.1 alebo novšej** – verzia 1.0 nové udalosti nepozná. Pri aktualizácii zachovajte adresu a port lokálneho servera; pred výmenou súborov si vytvorte zálohu a zatvorte staré karty verzie 1.0.

V pripravenom Google backend modeli patrí rozvrh jednotlivému školskému účtu. Server určí vlastníka podľa prihlásenia a kontroluje verzie pri úpravách. Lokálny režim používa jedného „Lokálneho učiteľa“. Skutočná školská synchronizácia ostáva predmetom konfigurácie a overenia Etapy B.

Značky a ich význam:

| Značka | Význam | Farba | Vyhodnotenie úboru |
|---|---|---|---|
| ✓ | Prítomný, má úbor, cvičí | Zelená | Má úbor |
| – | Neprítomný | Sivá | Nevyhodnocuje sa |
| A | Nemá úbor, automaticky necvičí | Oranžová | Nemá úbor |
| ! | Necvičí bez ospravedlnenia | Červená | Nevyhodnocuje sa |
| Ep | Necvičí, ospravedlnený rodičom | Modrá | Nevyhodnocuje sa |
| Ed | Necvičí, ospravedlnený lekárom | Modrá | Nevyhodnocuje sa |

**A nikdy nevytvára ! ani otvorený prípad.** Dôvody necvičenia sa vylučujú. Neprítomnosť deaktivuje ostatné údaje; preto tu nie sú samostatné prepínače, ktoré by mohli vytvoriť nesprávnu kombináciu.

Zmena ! na Ep/Ed vyrieši prípad ospravedlnením. Zmena ! na ✓/A/– ho uzavrie ako opravu zápisu a zachová históriu. Opätovný výber ! po uzavretí vytvorí nový otvorený prípad. Aplikácia neurčuje výchovné opatrenia.

## Ukladanie a konflikty

Značka sa ukladá hneď po výbere. Téma, dátum a platné údaje triedy sa ukladajú po zmene a opustení poľa. Horný indikátor zobrazuje ukladanie, úspech alebo problém. Pri neúplnom mene zostáva upozornenie na neuložené údaje.

Lokálny režim používa **IndexedDB**, ktorá transakčne koordinuje viac kariet rovnakého prehliadača. Pri dvoch úpravách toho istého záznamu uspeje prvá; druhá dostane upozornenie na konflikt, načítajú sa aktuálne údaje a učiteľ si zvolí zmenu znova. Rozdielni žiaci sa môžu upravovať nezávisle. Obnova zálohy zneplatní aj staré verzie otvorené v druhej karte.

Pri chybe ukladania sa úspech nepredstiera. Kliknite na **Obnoviť**, skontrolujte aktuálny stav a zopakujte zamýšľanú zmenu. Pri školskom režime mohol server zápis dokončiť ešte pred výpadkom spojenia.

Lokálna evidencia patrí konkrétnemu prehliadaču a adrese stránky. Neslúži na spoločný prístup viacerých zariadení a nemá overenie identity učiteľa. Vymazanie dát prehliadača či automatické uvoľnenie úložiska môže údaje odstrániť. Používajte ju s fiktívnymi údajmi a zálohujte.

## Export a obnova

- **CSV:** Polrok → CSV. UTF-8 s BOM, oddeľovač bodkočiarka. Pre Excel pri importe zvoľte UTF-8 a bodkočiarku. Text, ktorý by sa mohol interpretovať ako vzorec, je ošetrený apostrofom.
- **XLSX:** Polrok → Excel XLSX. Vzniká skutočný súbor Office Open XML, bez externej knižnice alebo internetovej služby. Obsahuje aktuálnu tabuľku a skupinu žiaka. Má zamrznutý hlavičkový riadok a prvé dva stĺpce.
- **PDF:** Hodiny, Polrok alebo Prípady → Tlač / PDF. V Chrome vyberte cieľ **Uložiť ako PDF**. V iPhone použite systémový náhľad tlače a zdieľanie do Súborov. Polročný prehľad sa rozdelí po ôsmich hodinách na šírku, aby sa neorezal. PDF vzniká cez systémovú tlač, nejde o samostatný PDF generátor.
- **Úplná záloha:** Údaje → Stiahnuť zálohu. JSON je jediný export určený na úplnú obnovu vrátane pôvodných zápisov a autorov. CSV, XLSX a PDF slúžia na prehľad, nie obnovu.
- **Obnova v Etape A:** Údaje → vybrať JSON. Aplikácia overí všetky udalosti a ukáže počty. Až tlačidlo Nahradiť lokálne údaje vykoná obnovu. Pred ňou stiahne súčasnú zálohu a uloží predošlý stav aj do IndexedDB pod `before-restore`. Prehliadač môže vyžadovať povolenie sťahovania. Poškodená záloha súčasné údaje nezmení.

Lokálny prototyp má limit 20 000 udalostí, 50 tried, 60 evidovaných žiakov na triedu a 15 MB formátovanej JSON zálohy. Pri dosiahnutí limitu odmietne novú zmenu s vysvetlením; dovtedajšie údaje ostanú dostupné. Apps Script má konzervatívnejší limit 10 000 udalostí. Veľké školské nasadenie potrebuje meranie výkonu a rozšírenie úložiska.

## Testy

Základné testy potrebujú Node.js 20+:

```sh
npm test
```

Vo verzii 1.1 prešlo **51 automatických testov**: 19 pôvodnej domény, 19 rozvrhu a 13 backendu so simulovanými službami Google. Prešlo aj 13 pôvodných a 15 nových scenárov v Chromium. Výsledky a hranice overenia: [docs/TESTY-1.1.md](docs/TESTY-1.1.md); pôvodný protokol 1.0 ostáva v [docs/TESTY.md](docs/TESTY.md).

Voliteľné opakovanie testov prehliadača:

```sh
npm install --no-save playwright
npx playwright install chromium
```

V prvom termináli nechajte `npm start`. V druhom spustite `npm run test:browser` a potom `npm run test:browser:timetable`. Inštalácia Playwright je potrebná len pre testovanie, nie pre používateľa aplikácie. Pri vlastnom Chromium nastavte premennú `PHE_CHROMIUM` na cestu k jeho spustiteľnému súboru. Voliteľná premenná `PHE_TEST_ARTIFACTS` určuje priečinok výsledkov, aby opakovanie testov nemuselo prepísať pôvodné ukážky.

Testované v Linux Chromium, pri mobilných šírkach 320, 375, 390 a 430 px. **Fyzický iPhone/Safari ani Windows Chrome neboli v tomto prostredí dostupné.** Ich manuálne overenie je v akceptačnom zozname; emulácia šírky ho nenahrádza.

## Google Workspace – Etapa B

Postup pre správcu: **[docs/GOOGLE-WORKSPACE.md](docs/GOOGLE-WORKSPACE.md)**. Je pripravené rovnaké rozhranie, Apps Script backend, manifest, validácia, história, zámok, kontrola verzií a obnova do prázdneho školského úložiska.

Školský správca musí nakonfigurovať doménu, presný zoznam učiteľov, ID tabuľky, oprávnenia a doménové nasadenie spúšťané ako prihlásený používateľ. Chýbajúci e-mail, nesúlad identity alebo nepovolený účet znamenajú zamietnutie prístupu. **Autentifikácia zatiaľ nie je prevádzkovo overená.** Ak ju školské nastavenia neumožnia spoľahlivo overiť, návod opisuje alternatívu s IAP; anonymný zápis nie je náhradou.

## Súbory projektu

| Súbor/priečinok | Účel |
|---|---|
| `PHE-Register.html` | Vygenerovaná samostatná lokálna aplikácia |
| `web/` | Čitateľný HTML, CSS a JavaScript zdroj |
| `spustit.py`, `Spustit-Windows.cmd` | Jednoduché lokálne spustenie |
| `examples/fiktivne-udaje.json` | Obnoviteľná počiatočná fiktívna trieda |
| `tests/` | Automatické testy a artefakty overenia |
| `google-apps-script/` | Pripravené súbory na skopírovanie do Apps Script |
| `docs/GOOGLE-WORKSPACE.md` | Nasadenie, model dát, bezpečnostné hranice, obnova |
| `docs/STAV-FUNKCII.md` | Dokončené, pripravené a neoverené funkcie |
| `tools/build.cjs` | Znova vytvorí HTML balík a Apps Script súbory |
| `tools/prepare-restore.cjs` | Lokálne pripraví administračný skript obnovy do prázdnej tabuľky |

Po úprave zdrojov spustite `npm run build`. Generované `PHE-Register.html`, `google-apps-script/Index.html` a `Domain.gs` neupravujte oddelene. Aplikácia nemá závislosť od EduPage ani rozvrhu.
