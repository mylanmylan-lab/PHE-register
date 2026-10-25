# Aktualizácia údajov 1.1 → 1.2

Plán pripravený pred rozšírením dátového modelu: ponechať databázu `phe-register-v1`, objektové úložisko `data`, kľúč `state` aj zálohu udalostí `schema: 1`. Staré udalosti sa musia prehrať bez zmeny ich významu. Nové funkcie používajú doplnkové polia a nové typy udalostí; nové zálohy vyžadujú aplikáciu 1.2 alebo novšiu.

1. V pôvodnej aplikácii stiahnite úplnú JSON zálohu mimo priečinka aplikácie. Zatvorte všetky staré karty a zastavte server.
2. Nahraďte súbory aplikácie, spustite Windows spúšťač a použite rovnaký prehliadač, profil, adresu a port.
3. Pred prvým zápisom 1.2 lokálne úložisko uchová pôvodný stav pod samostatným kľúčom `before-v1.2`. Tento snímok sa pri ďalšom otvorení neprepisuje. Je doplnkom stiahnutej zálohy, nie náhradou zálohy mimo prehliadača.
4. Existujúce hodiny zostávajú spoločnými historickými záznamami bez vymysleného vlastníka, skupiny alebo času. Rozšírené hodiny majú explicitný čas, vlastníka a zoznam zaradených žiakov. Staré záznamy sa automaticky nerozdeľujú ani nespájajú.
5. Overte pôvodné triedy, hodiny, značky, prípady a export. Až potom používajte nové funkcie. Pri návrate na 1.1 použite samostatne uloženú starú zálohu; verzia 1.1 nepozná udalosti 1.2.

Google Workspace zatiaľ nie je nasadený. Pred budúcou aktualizáciou servera správca vytvorí úplnú zálohu a naraz aktualizuje všetky Apps Script súbory. Skutočné školské údaje ani identita sa pri vývoji nepoužívajú.
