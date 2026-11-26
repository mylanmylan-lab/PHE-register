# Aktualizácia údajov 1.1 alebo staršej 1.2

Plán pripravený pred rozšírením dátového modelu: ponechať databázu `phe-register-v1`, objektové úložisko `data`, kľúč `state` aj zálohu udalostí `schema: 1`. Staré udalosti sa musia prehrať bez zmeny ich významu. Nové funkcie používajú doplnkové polia a nové typy udalostí; nové zálohy vyžadujú aplikáciu 1.2 alebo novšiu.

1. V pôvodnej aplikácii stiahnite úplnú JSON zálohu mimo priečinka aplikácie. Zatvorte všetky staré karty a zastavte server.
2. Nahraďte súbory aplikácie, spustite Windows spúšťač a použite rovnaký prehliadač, profil, adresu a port.
3. Pred prvým zápisom 1.2 lokálne úložisko uchová pôvodný stav pod samostatným kľúčom `before-v1.2`. Tento snímok sa pri ďalšom otvorení neprepisuje. Je doplnkom stiahnutej zálohy, nie náhradou zálohy mimo prehliadača.
4. Existujúce hodiny zostávajú spoločnými historickými záznamami bez vymysleného vlastníka, skupiny alebo času. Rozšírené hodiny majú explicitný čas, vlastníka a zoznam zaradených žiakov. Staré záznamy sa automaticky nerozdeľujú ani nespájajú.
5. Overte pôvodné triedy, hodiny, značky, prípady a export. Až potom používajte nové funkcie. Pri návrate na 1.1 použite samostatne uloženú starú zálohu; verzia 1.1 nepozná udalosti 1.2.

Google Workspace zatiaľ nie je nasadený. Pred budúcou aktualizáciou servera správca vytvorí úplnú zálohu a naraz aktualizuje všetky Apps Script súbory. Skutočné školské údaje ani identita sa pri vývoji nepoužívajú.

## Zjednodušená dochádzka a prednastavený rozvrh

Aj táto aktualizácia ponecháva pôvodnú IndexedDB, verziu databázy 1, kľúče a udalosti. Pri otvorení existujúcej databázy sa nemenia triedy, rozvrh, hodiny ani značky. Snímok `before-v1.2` sa neprepisuje; pred výmenou už používanej verzie 1.2 si stiahnite novú úplnú zálohu.

- `schedule.preset` je jediná auditovaná operácia s kontrolou aktuálnej revízie. Dopĺňa len voľné bloky rozvrhu daného učiteľa. Existujúce triedy znovu použije podľa normalizovaného názvu alebo explicitného priradenia; nové triedy sú prázdne. Existujúce položky sa neprepisujú. Pri aktualizácii sa spúšťa výslovne z náhľadu v Nastaveniach. Automaticky sa použije iba pri založení úplne novej lokálnej databázy.
- `timetable.settings` pridáva voliteľné pole `timetableSettings` pre učiteľa: deväť časov, `startOfDay` a verziu. Bez neho platí predvolených 06:00 a deväť časov zo zadania. Voliteľné `period` v rozvrhu prepája blok s číslom hodiny; zmena nastavení upraví len naviazané rozvrhové položky, nikdy uložené dochádzky.
- `lesson.create` s `openExisting: true` v transakcii otvorí rovnaký vlastný blok bez ďalšej udalosti. Naďalej platia kontroly skupín, prekrytia a výslovného prevzatia. Historické príkazy bez tejto voľby sa prehrávajú pôvodným spôsobom.
- Posledná trieda, skupina a blok sa pamätajú v osobitnej predvoľbe rozhrania na zariadení. Obnova zálohy zneplatní starý výber pomocou existujúceho `storageEpoch`. Predvoľba rozhrania sa nesynchronizuje; rozvrh a jeho nastavenia sú v obnoviteľných udalostiach.

Zálohy 1.0, 1.1 aj pôvodnej 1.2 sa naďalej obnovia. Zálohy obsahujúce nové príkazy `schedule.preset` a `timetable.settings` vyžadujú **túto aktualizovanú 1.2 alebo novšiu**. Starší kód ich bezpečne odmietne, preto súbežne nepoužívajte staré a nové súbory aplikácie. V pripravenom školskom variante treba aktualizovať `Domain.gs` aj `Index.html` spoločne; samotné nahratie frontendu nestačí.
