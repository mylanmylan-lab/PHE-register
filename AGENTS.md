# PHE Register – pravidlá vývoja

- Pracuj výhradne v repozitári `mylanmylan-lab/PHE-register`. Pred zmenou over pracovný adresár a Git remote; pri nesúlade zastav. Neprenášaj požiadavky NutriTrack.
- Zdroj požiadaviek: README.md, dokumentácia v docs/ a výslovne schválené zadania. PROJECT_STATUS.md je stručný stav, nie náhrada špecifikácie. Rozpory pred zmenou predlož používateľovi.
- Slovenské mobilné rozhranie; minimalizuj počet kliknutí. Zachovaj skupiny, rozvrh, význam značiek, históriu a explicitné potvrdenie dochádzky.
- Zachovaj IndexedDB, kompatibilitu záloh, migrácie a kontrolu konfliktov. Nikdy automaticky nevytváraj potvrdenú dochádzku z rozvrhu. Lokálny režim nie je synchronizácia ani autentifikácia.
- Verejný repozitár: iba fiktívne testovacie údaje; žiadne reálne mená žiakov, dochádzka, zálohy, diagnózy ani tajomstvá. Školský backend musí overovať identitu a oprávnenia na serveri.
- Node >=20; základné testy `npm test`, build `npm run build`. Podľa zmeny spusti príslušné browser testy z package.json; pri PWA `npm run test:browser:pwa`. Rozlišuj emuláciu a fyzický iPhone.
- Čítaj relevantné súbory, rob minimálne zmeny, nerefactoruj nesúvisiace časti. Pri riziku migrácie, bezpečnosti alebo synchronizácie rozšír testy. Nevynechávaj povinné kontroly.
- Po úlohe stručne uveď zmenené súbory, testy, neoverené časti a aktualizuj stav iba pri podstatnej zmene. Bez súhlasu necommituj, nepushuj, nenasadzuj ani nemeň rozsah.
