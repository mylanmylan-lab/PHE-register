# Google Workspace – technický plán a návod pre správcu

Stav: **backend implementovaný, testovaný lokálne so simulovanými Google službami; v školskom prostredí nenasadený a integračne neoverený.** Žiadna doména, účet ani Google tabuľka neboli v tejto úlohe pripojené. Nasadenie nasleduje až po schválení školy a konfigurácii.

## Architektúra

```text
iPhone Safari / Windows Chrome
          │ prihlásenie Google Workspace
          ▼
Apps Script HTML Service (Index.html)
          │ google.script.run.api(...)
          ▼
serverová identita → allowlist → validácia → ScriptLock
          │ načítanie logu, kontrola verzie, jeden zápis udalosti
          ▼
Google Sheets / hárok Events
          │
          └── rekonštrukcia tried, hodín, značiek, prípadov a histórie
```

Produkčné rozhranie sa podáva priamo z Apps Script. Nie je potrebný verejný REST endpoint, CORS proxy, API kľúč v prehliadači ani prihlásenie poskytované vlastným formulárom. Rovnaké rozhranie automaticky použije `GoogleStore`, keď existuje `google.script.run`. Lokálny HTML režim používa `LocalStore`.

## 1. Pripraviť školské prostredie

1. Určite školského správcu projektu a presne 2–3 oprávnené účty učiteľov. Používajte školské účty v jednej Workspace doméne.
2. V školskom Drive vytvorte **novú testovaciu Google tabuľku**, napríklad `PHE Register – test`. Nezverejňujte ju odkazom ani anonymne.
3. Zdieľajte tabuľku na úpravu iba oprávneným učiteľom a správcovi. Režim „vykonávať ako používateľ pristupujúci k aplikácii“ vyžaduje, aby používateľ smel zapisovať do tabuľky.
4. Vytvorte **samostatný Apps Script projekt**. Editormi projektu nech sú iba správcovia. Učitelia nepotrebujú upravovať zdrojový kód.
5. Uchovávanie údajov, záloh, prístupových práv a vyradenie odchádzajúceho učiteľa nastavte podľa pravidiel školy. Prototyp neurčuje lehoty ani automatické výchovné opatrenia.

## 2. Skopírovať pripravené súbory

V editore Apps Script vytvorte/skopírujte:

| Miestny súbor | Názov v editore |
|---|---|
| `google-apps-script/Code.gs` | `Code.gs` |
| `google-apps-script/Domain.gs` | `Domain.gs` |
| `google-apps-script/Index.html` | HTML súbor `Index` |
| `google-apps-script/appsscript.json` | manifest `appsscript.json` |

Manifest zobrazíte v nastaveniach projektu. Nastavuje V8, Europe/Bratislava a rozsahy `spreadsheets` a `userinfo.email`. Rozsah Sheets sa používa na otvorenie určenej tabuľky; aplikácia žiadnu ďalšiu tabuľku nevyberá z klientskych vstupov.

`Domain.gs` a `Index.html` sú už pripravené. Ak zmeníte zdroje, lokálne spustite `npm run build` a skopírujte ich znova.

## 3. Script Properties

V **Project Settings → Script Properties** pridajte:

| Kľúč | Hodnota |
|---|---|
| `SPREADSHEET_ID` | ID novej tabuľky z URL medzi `/d/` a `/edit` |
| `WORKSPACE_DOMAIN` | Skutočná doména školy, bez `@` |
| `ALLOWED_TEACHERS` | Presné e-maily oddelené čiarkou, vrátane správcu, ktorý bude inicializovať |
| `ADMIN_EMAILS` | Podmnožina oprávnených účtov, ktoré môžu inicializovať a obnovovať |

Ilustračné adresy ako `ucitel1@skola.example` nahraďte až pri konfigurácii. Do klienta nevkladajte tajomstvá ani tokeny. Zoznam učiteľov overuje server pri každom čítaní aj zápise.

V editore pod oprávneným účtom správcu spustite **`initialize_`** a udeľte požadované školské oprávnenia. Vytvorí hlavičku `Events`; existujúce dáta neprepíše. Pre test následne spustite **`seedDemo_`**, ktorý do prázdneho úložiska vloží 20 fiktívnych žiakov. Ak editor súkromné pomocné funkcie nezobrazuje vo výbere, dočasne ich zavolajte z funkcie spustenej v editore a tú pred nasadením odstráňte.

## 4. Nasadenie iba v doméne

V **Deploy → New deployment → Web app**:

- **Execute as / Vykonávať ako:** používateľ pristupujúci k webovej aplikácii (`USER_ACCESSING`).
- **Who has access / Kto má prístup:** iba používatelia školskej domény (`DOMAIN`). Presnú podmnožinu účtov obmedzí `ALLOWED_TEACHERS`.
- Nikdy nevyberajte anonymný prístup ani „Anyone“. Neprepínajte na vykonávanie ako vlastník, aby sa obišiel problém s prihlásením.

Otvorte produkčnú URL končiacu `/exec` samostatne pre každý testovací účet. Každý učiteľ môže potrebovať schváliť OAuth oprávnenia; správca Workspace môže musieť povoliť internú aplikáciu. Otestujte aj súkromné okno a účet mimo allowlistu. Tieto účty nesmú čítať údaje ani volať zápis cez `google.script.run`.

### Ako sa identita overuje

Server číta `Session.getActiveUser().getEmail()` a `Session.getEffectiveUser().getEmail()`. Oba e-maily musia byť neprázdne, rovnaké, v určenej doméne a active e-mail musí byť na explicitnom zozname učiteľov. Klient žiadny e-mail autora neposiela. Autor a čas udalosti vznikajú na serveri.

Prázdny active e-mail sa **nepokladá za prihlásenie**. Backend sa vtedy uzavrie s `FORBIDDEN`. Zhoda active/effective odhalí bežné nesprávne nasadenie ako vlastník pri prístupe iného učiteľa; test iba účtom vlastníka nestačí. Samotný manifest ani simulované testy nepotvrdzujú, že školská politika sprístupní identitu. **Autentifikácia je prevádzkovo nevyriešená až do úspešného overenia všetkých účtov a negatívnych prípadov v škole.**

## 5. Dáta a história

Autoritatívnym úložiskom je hárok **Events**:

| Stĺpec | Obsah |
|---|---|
| A `sequence` | Súvislé poradové číslo od 1 |
| B `event_json` | Jedna kompletná udalosť: `id`, `at`, `actor`, `command` |

Neodstraňujte, netrieďte ani ručne neupravujte riadky. JSON začína objektom, nie vzorcom; používateľské texty sa nezapisujú ako samostatné vzorce v bunkách. Pri nesprávnej sekvencii, neplatnom JSON alebo nekonzistentnej histórii server ďalšie operácie odmietne.

Odvodený model v pamäti:

- **Trieda:** ID, názov, verzia a zoznam žiakov s vlastným ID, menom, priezviskom, skupinou a aktívnosťou.
- **Hodina:** ID, trieda, dátum, téma, ukončenie, verzia, čas vytvorenia a nemenná kópia vtedajšieho zoznamu. Dátum nie je primárny kľúč.
- **Záznam:** dvojica hodina–žiak, práve jedna značka a verzia. Úbor, prítomnosť a cvičenie sa odvodzujú z tejto značky.
- **Prípad:** ID, žiak/hodina, pôvodné ! a pôvodný dátum, otvorenie, autor, výsledok, uzavretie a verzia. Nové ! po uzavretí vytvorí nový prípad.
- **Udalosti:** celá história; spätná úprava pridá udalosť, neprepisuje predchádzajúcu.

Príkazy sú `class.create`, `class.update`, `lesson.create`, `lesson.update`, `record.set`, `case.resolve`. Server odmieta neznáme polia, neplatné ID, dátumy, značky, dĺžky, duplicitné ID a neplatné verzie. Pri založení hodiny kontroluje aj verziu triedy, aby nevznikla hodina zo zastaraného zoznamu.

## 6. Súbežné zápisy a zlyhania

1. Server overí účet aj tvar požiadavky.
2. Získa **ScriptLock** spoločný pre celý projekt; pri obsadení po 20 sekundách vráti `BUSY`.
3. Načíta aktuálny log a overí každú udalosť.
4. Porovná očakávanú verziu upravovaného záznamu. Pri nesúlade vráti `CONFLICT`, nič neprepíše.
5. Zapíše **jeden riadok obsahujúci celú udalosť** cez jednu operáciu `setValues`, vykoná `flush` a zápis spätne prečíta.
6. Uvoľní zámok aj pri chybe.

Zápis značky, prípadu a auditnej histórie nie je rozdelený do troch tabuliek. Všetky tri pohľady sa rekonštruujú z tej istej udalosti. Odlišní žiaci majú vlastné verzie, takže ich úpravy sa zachovajú. Rovnaký žiak/hodina vyvolá explicitný konflikt. Pri uzavretí prípadu sa kontroluje verzia prípadu aj záznamu.

`requestId` umožňuje bezpečne zopakovať tú istú požiadavku po nejasnom výsledku sieťového spojenia: uložená udalosť sa neduplikuje. Opakovanie s iným obsahom alebo autorom sa odmietne. Rozhranie zmeny automaticky neopakuje; pri chybe žiada obnoviť údaje. Ukážka dvojitého zápisu aj zlyhania po zápise je v backend testoch.

**Hranice:** Sheets nie je plnohodnotná transakčná databáza. Zámok koordinuje iba túto Apps Script aplikáciu. Google negarantuje týmto návrhom transakcie naprieč viacerými službami; zámerne sa vykonáva len jeden autoritatívny zápis a overuje sa výsledok. Testy v škole musia overiť reálne súbežné požiadavky a výpadky. Pri zlyhaní nepredstierajte, že sa zápis neuskutočnil.

Učitelia s právom editovať Sheets môžu priamo zmeniť podkladový log mimo aplikácie. História aplikácie preto **nie je audit odolný proti manipulácii oprávneným editorom tabuľky**. Sprístupnite iba aplikáciu v bežnom pracovnom postupe, obmedzte editorský okruh a používajte verzie/zálohy Workspace. Ak škola potrebuje technicky zabrániť aj priamym zásahom učiteľov do logu, použite alternatívu nižšie.

## 7. Zálohy a obnova v škole

Učiteľ môže stiahnuť úplnú JSON zálohu cez aplikáciu. Správca určí bezpečné školské umiestnenie, frekvenciu a prístup. Záloha môže obsahovať osobné údaje; neposielajte ju do verejných služieb. Históriu verzií Sheets používajte ako doplnok.

Pripravený postup obnovy nevie prepísať existujúce dáta:

1. Pozastavte používanie starej aplikácie, urobte poslednú zálohu. Pôvodnú tabuľku ponechajte na návrat.
2. Vytvorte novú súkromnú prázdnu tabuľku a samostatný obnovovací Apps Script projekt s rovnakými zdrojmi a oprávneniami.
3. Nastavte jeho `SPREADSHEET_ID` na novú tabuľku a spustite `initialize_`. Nespúšťajte `seedDemo_`.
4. V počítači lokálne overte a pripravte obnovu (potrebný Node.js):

   ```sh
   node tools/prepare-restore.cjs cesta/zaloha.json work/RestoreData.gs
   ```

5. Vygenerovaný `RestoreData.gs` obsahuje zálohu. Skopírujte ho iba do súkromného obnovovacieho projektu a v editore spustite **`restoreBackupIntoEmpty_`** ako správca. Nástroj nevolá sieť a sám nič nenasadzuje.
6. Skript overí prázdnosť cieľa, obnoví udalosti vrátane pôvodných autorov a časov a porovná načítaný výsledok so zálohou. Po nejasnej chybe najprv skontrolujte cieľ; existujúce udalosti sa automaticky neprepisujú.
7. Porovnajte triedy, hodiny, značky, prípady a stiahnutú zálohu. Odstráňte dočasný `RestoreData.gs` z projektu, aby kópia údajov nezostala v zdrojovom kóde.
8. Vytvorte nové doménové nasadenie, vykonajte akceptačné testy a až potom distribuujte novú URL učiteľom. Všetci musia zavrieť staré karty a otvoriť nové nasadenie. Pôvodné nasadenie vypnite podľa pravidiel školy.

Obnovení autori sú historické hodnoty zo zálohy; záloha nemá digitálny podpis. Jej pôvod musí správca overiť. Lokálne fiktívne zálohy nemajú dôveryhodnú školskú identitu autora.

## 8. Akceptačné testy pred reálnymi údajmi

- Povolený učiteľ A aj B sa prihlásia samostatne, vidia rovnakú triedu a ich udalosti majú správny serverový e-mail.
- Neprihlásený, externý a vnútroškolský nepovolený účet nesmie načítať údaje ani zapisovať. Testujte aj priame volanie API z prehliadača.
- Prázdny active e-mail a nesúlad active/effective musia vyvolať zamietnutie. Test iba správcom nepostačuje.
- Vykonajte všetkých deväť scenárov z `docs/TESTY.md` na fiktívnych údajoch.
- Dvaja učitelia upravia rovnaký záznam zo starej verzie: jeden zápis uspeje, druhý dostane konflikt. Pri rôznych žiakoch sa zachovajú oba.
- Ukončite hodinu s !; v druhom účte musí prípad zostať viditeľný po obnovení. Vyriešte ho, skontrolujte autora, čas a históriu.
- Prerušte pripojenie po odoslaní. Po obnove skontrolujte stav; opakovanie identického `requestId` nesmie duplikovať udalosť.
- Vytvorte zálohu, obnovte do novej testovacej tabuľky a porovnajte obsah.
- Na fyzickom iPhone Safari overte dotyky, dátum, sťahovanie JSON/XLSX a systémové uloženie PDF. To isté urobte v Windows Chrome.
- Zmerajte odozvu na očakávanom polročnom objeme dát. Prekročenie časových/kvótových limitov nie je úspešný test.

## 9. Limity a bezpečná alternatíva

Prototyp rekonštruuje model z logu pri každom volaní. Má limit **10 000 udalostí**, 15 MB formátovanej JSON zálohy a najviac 40 000 znakov na jednu bunku udalosti. Tento limit nie je výkonnostná záruka. Pri raste je potrebné zaviesť overované snímky modelu a/alebo zmeniť databázu; nič sa automaticky nepremazáva. Serverový čas je ISO UTC, používateľské dátumy Europe/Bratislava.

Spoločné zmeny sa načítajú pri otvorení, návrate do aplikácie alebo tlačidlom Obnoviť. Nie je implementovaný živý prenos zmien ani offline front pre školský režim. Kontrola verzií na serveri chráni aj zastarané obrazovky.

Ak Workspace neposkytne spoľahlivú identitu alebo škola vyžaduje audit bez priamych zásahov učiteľov do Sheets, **Apps Script autentifikáciu nepovažujte za vyriešenú**. Zastavte toto nasadenie; neznižujte ochranu na anonymný prístup, klientsky e-mail či spoločné heslo.

Bezpečná alternatíva je školský Google Cloud projekt s **Cloud Run za Identity-Aware Proxy (IAP)**, presným IAM zoznamom učiteľov a služobným účtom, ktorý jediný pristupuje do Sheets. Vypnite obídenie IAP priamou URL a overujte podpísanú IAP identitu/jej audience na serveri; nedôverujte vlastnému klientskemu headeru. Zápisy treba koordinovať transakčnou databázou alebo jediným zapisovačom; `ScriptLock` mimo Apps Script neplatí. Učitelia potom nepotrebujú právo upravovať podkladový Sheet. Túto alternatívu musí schváliť a nakonfigurovať školský správca, môže vyžadovať billing a samostatnú implementáciu. **Nie je súčasťou hotového prototypu.**

Oficiálne referencie pre správcu: [Apps Script web apps](https://developers.google.com/apps-script/guides/web), [Session](https://developers.google.com/apps-script/reference/base/session), [LockService](https://developers.google.com/apps-script/reference/lock/lock-service), [HTML Service komunikácia](https://developers.google.com/apps-script/guides/html/communication), [IAP pre Cloud Run](https://cloud.google.com/iap/docs/enabling-cloud-run). Pred nasadením overte aktuálne možnosti v školskom tenante.
