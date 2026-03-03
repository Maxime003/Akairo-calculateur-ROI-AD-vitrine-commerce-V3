# AKAIRO – Calculateur V3 (GitHub)  
## Fichier d’instructions pour refonte des calculs (version “Impact CA”)

> Repo : `Maxime003/Akairo-calculateur-ROI-AD-vitrine-commerce-V3`  
> Objectif de cette refonte : **remplacer les calculs de rentabilité/ROI actuels** par un modèle **plus réaliste et défendable** centré sur **l’impact sur le chiffre d’affaires (CA)**.  
> Décisions validées :  
> - **Hausse de trafic (uT)** : saisie **mais pré-remplie à 10%** + micro-texte “dépend du contexte”.  
> - **k (conversion relative du trafic incrémental)** : **fixe** (0,435).  
> - **Marge brute** : **supprimée** (donc pas de “ROI financier” correct au sens profit/cash).  
> - 1 seul scénario “standard”.

---

## 1) Vue d’ensemble de l’outil (comportement fonctionnel)

### 1.1 Parcours utilisateur
1. L’utilisateur renseigne les **données du point de vente** :
   - Trafic mensuel actuel (T)
   - Hausse estimée de trafic (uT, % – pré-rempli à 10%)
   - Nombre de transactions mensuelles (V)
   - Panier moyen (P)

2. L’utilisateur renseigne l’**offre & financement** :
   - Mode : Achat comptant OU Location RSE
   - Investissement initial (I) (ou apport initial si location)
   - Loyer mensuel (si location)
   - Coûts mensuels récurrents (L) (dans ta décision : uniquement licence ; dans le code actuel ce champ sert aussi pour maintenance)

3. L’utilisateur clique sur **“Générer l’analyse financière”** :
   - Le bloc résultats s’affiche
   - Les cartes “Actuellement” et “Projection” se remplissent
   - Le graphique (Chart.js) se met à jour
   - Le bouton “Télécharger le rapport PDF” permet d’exporter la section résultats via html2pdf

### 1.2 Fichiers et dépendances
- `index.html`
  - Charge :
    - Chart.js (CDN)
    - html2pdf.js (CDN)
    - `style.css`
    - `script.js`
  - Contient **toutes les zones d’input** et **toutes les zones de sortie** (via IDs)

- `script.js`
  - Déclencheurs :
    - DOMContentLoaded : écouteurs boutons
  - Logique :
    - `toggleFinancement()`
    - `calculerROI()` (à refondre)
    - `updateChart()`
    - `downloadPDF()`
    - utilitaires formatage

- `style.css`
  - Mise en forme des cartes, inputs, toggles, etc.

---

## 2) Cartographie DOM (IDs / champs) – indispensable pour modifier sans casser l’UI

### 2.1 Inputs (formulaire)
**Point de vente**
- `trafic` : Trafic mensuel actuel (T)
- `taux_hausse_trafic` : Hausse de trafic (%) (uT)  
  - ⚠️ actuellement : valeur par défaut `33` dans l’HTML (à passer à 10)
- `ventes` : Transactions mensuelles (V)
- `panier` : Panier moyen (P)

**Financement**
- Radios :
  - `mode_achat` (par défaut)
  - `mode_location`
- `investissement` : Investissement initial (I) / apport initial (si location)
- `loyer_mensuel` : loyer mensuel (uniquement si location)
- `couts_mensuels` : coûts mensuels récurrents (L)
- Groupes / labels (modifiés par `toggleFinancement`) :
  - `group_loyer`
  - `bloc_tresorerie`
  - `label_invest`, `helper_invest`
  - `label_couts`, `helper_couts`

### 2.2 Outputs (résultats – cartes & KPIs)
**Carte “Actuellement”**
- `trafic_avant`
- `ventes_avant`
- `panier_avant`
- `ca_avant`

**Carte “Projection AKAIRO”**
- `badge_trafic`
- `trafic_apres`
- `badge_ventes`
- `ventes_apres`
- (Panier) :
  - `panier_apres` (la valeur)  
  - ⚠️ badge panier est **statique** dans l’HTML aujourd’hui `+29,5%` (à corriger)
- `badge_ca`
- `ca_apres`

**Bloc gain**
- `gain_mensuel` (actuellement “Gain mensuel de CA”)
- `gain_annuel` (CA additionnel / an)

**Bloc “Trésorerie” (actuellement visible seulement en location)**
- `tresorerie_nette` (à renommer côté wording car ce n’est pas de la trésorerie si on raisonne en CA)

**Section “ROI” (à refondre)**
- `res_invest`
- `res_ca_1an`
- `res_benefice` (aujourd’hui utilisé pour afficher un “ROI” en € – à supprimer/repurposer)
- `res_amortissement` (aujourd’hui durée d’amortissement – à repurposer/retirer)

**Coût de l’inaction**
- `cout_inaction`

**Graph**
- Canvas : `roiChart`

### 2.3 Champs cachés (intégration HubSpot / tracking)
À la fin du HTML :
- `<input type="hidden" name="trafic_visiteurs_mensuel">`
- `<input type="hidden" name="gain_mensuel_estime">`
- `<input type="hidden" name="roi_previsionnel_12_mois">`
- `<input type="hidden" name="budget_investissement_estime">`

⚠️ Après refonte, **“roi_previsionnel_12_mois” n’a plus de sens**.  
Deux options (choisir 1) :
- **Option 1 (recommandée, minimal-change HubSpot)** : garder le champ mais y stocker une métrique utile (ex : `% hausse CA` arrondi).
- **Option 2 (propre mais nécessite HubSpot)** : créer de nouvelles propriétés HubSpot et renommer les hidden inputs (ex : `hausse_ca_pct`, `gain_annuel_estime`).

---

## 3) Problèmes des calculs actuels (pour comprendre ce qu’on supprime)

Dans `calculerROI()`, le code actuel :
1. Calcule conversion : `tauxConversion = ventes / trafic`
2. Applique hausse trafic : `traficApres = trafic * (1 + uT)`
3. Suppose **même conversion** : `ventesApres = traficApres * tauxConversion`
4. Augmente **panier en dur** : `panierApres = panier * 1.295`
5. En déduit CA après : `caApres = ventesApres * panierApres`

➡️ Effet cumulatif : **trafic ↑ + ventes ↑ + panier ↑**  
Ce double-compte souvent l’impact et peut produire des hausses de CA difficiles à défendre.

Le code calcule ensuite des métriques “ROI / amortissement” en soustrayant des coûts mensuels du gain de CA, ce qui n’est pas un ROI financier robuste (il manque la marge).

---

## 4) Nouveau modèle de calcul (V3.1) – “Impact CA” (sans marge)

### 4.1 Variables (définitions)
**Inputs**
- T = trafic mensuel actuel (entrées magasin)
- V = transactions mensuelles (tickets)
- P = panier moyen (€)
- uT = hausse de trafic estimée (en %)  
  - UI : champ saisi mais pré-rempli à **10**
  - Calcul : `uT = tauxHausseInput / 100`
- L = coûts mensuels (licence)  
  - ⚠️ Ne pas appeler “profit” ce qui soustrait L (c’est juste “CA net de coûts”)

**Constante interne**
- k = 0,435 (conversion relative du trafic incrémental)  
  - Interprétation : les visiteurs additionnels convertissent en moyenne **moins** que les visiteurs existants.  
  - Dans le modèle, cela évite de surestimer Ventes/CA.

### 4.2 Formules (à implémenter)

#### Étape A — Conversion actuelle (bonus, utile pour debug / pédagogie)
- `CR0 = V / T`

#### Étape B — Trafic après installation
- `T1 = T * (1 + uT)`
- `deltaT = T * uT`

#### Étape C — Transactions incrémentales (cœur du modèle)
Deux écritures équivalentes :

1) Forme “trafic → conversion”
- `deltaV = deltaT * (CR0 * k)`

2) Forme simplifiée (recommandée : plus robuste)
- `deltaV = V * uT * k`

#### Étape D — Transactions après
- `V1 = V + deltaV`

#### Étape E — CA (avant / incrémental / après)
- `CA0 = V * P`
- `deltaCA = deltaV * P`
- `CA1 = CA0 + deltaCA`

#### Étape F — Indicateurs additionnels
- `% hausse CA` : `pctHausseCA = (deltaCA / CA0) * 100`
- `% hausse transactions` : `pctHausseVentes = (deltaV / V) * 100`
- “Coût de l’attente (6 mois)” : `coutInaction = deltaCA * 6`
- “CA incrémental – coûts mensuels” :  
  - `deltaCA_netCouts = deltaCA - coutsMensuels`  
  - ⚠️ à **libeller** correctement (pas “trésorerie”, pas “cash-flow”)

#### Étape G (optionnel) — Couverture de l’investissement (sur CA net de coûts)
> Ce n’est pas un ROI financier, mais un indicateur “combien de mois pour couvrir l’investissement en CA net de coûts”.

- Si `deltaCA_netCouts <= 0` → couverture = “Jamais / Non atteignable”
- Sinon :
  - `couvertureMois = investissement / deltaCA_netCouts`

---

## 5) Refonte UI (index.html) – consignes de modification

### 5.1 Ajuster le champ “hausse estimée”
Dans `index.html` :
- Input `#taux_hausse_trafic` :
  - passer `value="33"` → `value="10"`
- Helper texte :
  - actuel : “Hausse estimée”
  - recommandé :  
    - “Pré-rempli à 10% : dépend de l’emplacement, de la visibilité vitrine et de l’animation des contenus.”

### 5.2 Corriger la ligne “Panier” dans la carte Projection
Aujourd’hui :
- badge panier statique `+29,5%` (HTML)
- panierApres est calculé à `panier * 1.295` (JS)

Après refonte :
- panier **ne bouge pas** (standard) :
  - JS : `panierApres = panier`
- UI :
  - soit tu remplaces le badge statique par `+0%`
  - soit tu crées un badge dynamique :
    - remplacer `<span class="metric-badge">+29,5%</span>` par  
      `<span class="metric-badge" id="badge_panier">+0%</span>`

### 5.3 Corriger le badge “Ventes”
Aujourd’hui : `badge_ventes` = `+uT` (faux)  
Après refonte :  
- `badge_ventes` = `+pctHausseVentes%` (dérivé de deltaV / V)

### 5.4 Renommer les éléments “profit / trésorerie / ROI” (important)
Puisque tu ne gardes pas la marge :
- Renommer “Trésorerie Nette Mensuelle” → **“CA additionnel – coûts mensuels”** (ou “CA net des coûts mensuels”)
- Renommer “Zone de Profit potentiel” → **“Projection cumulée du CA (3 ans)”**
- La section “ROI” :
  - soit tu la renomme en **“Lecture budgétaire (indicative)”**
  - et tu remplaces les 4 cartes par :
    1) Investissement (I)
    2) CA additionnel annuel
    3) CA additionnel annuel **net de coûts**
    4) Couverture investissement (mois) **sur CA net de coûts**

> IMPORTANT : si tu laisses “ROI” en libellé, ça induit une lecture DAF/profit — à éviter sans marge.

---

## 6) Refonte JS (script.js) – plan d’implémentation

### 6.1 Constantes à ajouter (en haut du fichier)
Ajouter près des variables globales :
- `const K_CONVERSION_RELATIVE = 0.435;`
- `const DEFAULT_UPLIFT_TRAFFIC_PCT = 10;`

### 6.2 Ajuster la lecture du champ uT (hausse trafic)
Remplacer :
- valeur par défaut `33`
par :
- valeur par défaut `DEFAULT_UPLIFT_TRAFFIC_PCT`

Pseudo-code :
- `let tauxHausseInput = DEFAULT_UPLIFT_TRAFFIC_PCT;`
- si input vide : garder default
- clamp conseillé : `tauxHausseInput = Math.max(0, tauxHausseInput)`  
  (optionnel : limiter à 100)

### 6.3 Validation d’inputs (recommandé)
Actuellement tu valides uniquement `trafic/ventes/panier > 0`.

Amélioration conseillée :
- Exiger `trafic > 0`, `ventes > 0`, `panier > 0`
- Et **contrôler cohérence** : `ventes <= trafic`
  - si `ventes > trafic`, afficher un message :  
    “Le nombre de transactions ne peut pas dépasser le trafic entrant. Corrigez vos valeurs.”

### 6.4 Calculs à remplacer (bloc central)
Dans `calculerROI()`, remplacer tout le bloc :
- `multiplicateurTrafic`, `ventesApres = traficApres * tauxConversion`, `panierApres = panier * 1.295`, etc.

Par ce bloc (référence “propre”) :

1) Normaliser
- `const uT = tauxHausseInput / 100;`
- `const k = K_CONVERSION_RELATIVE;`

2) Base
- `const CR0 = ventes / trafic;` (bonus)
- `const caAvant = ventes * panier;`

3) Trafic après
- `const traficApres = trafic * (1 + uT);`
- `const deltaT = trafic * uT;`

4) Transactions incrémentales (forme simplifiée)
- `const deltaV = ventes * uT * k;`

5) Transactions après
- `const ventesApres = ventes + deltaV;`

6) Panier après (inchangé)
- `const panierApres = panier;`

7) CA
- `const deltaCA = deltaV * panier;`
- `const caApres = caAvant + deltaCA;`

8) Gains et dérivés
- `const gainMensuel = deltaCA;`
- `const gainAnnuelCA = gainMensuel * 12;`
- `const coutInaction = gainMensuel * 6;`
- `const pctHausseCA = (deltaCA / caAvant) * 100;`
- `const pctHausseVentes = (deltaV / ventes) * 100;`

9) “Net de coûts” (attention au naming)
- `const caNetCoutsMensuel = gainMensuel - coutsMensuels;`

10) (Optionnel) Couverture investissement
- si `investissement > 0 && caNetCoutsMensuel > 0` :
  - `couvertureMois = investissement / caNetCoutsMensuel`

### 6.5 Mise à jour des outputs (setText / UI)
Mettre à jour :
- Avant : inchangé
- Après :
  - `trafic_apres` = traficApres arrondi
  - `ventes_apres` = ventesApres arrondi
  - `panier_apres` = panierApres
  - `ca_apres` = caApres

Badges :
- `badge_trafic` = `+tauxHausseInput%`
- `badge_ventes` = `+pctHausseVentes.toFixed(1)%`
- `badge_panier` (si créé) = `+0%`
- `badge_ca` = `+pctHausseCA.toFixed(1)%`

Gain :
- `gain_mensuel` = gainMensuel
- `gain_annuel` = gainAnnuelCA

Bloc “trésorerie” :
- remplacer texte / label côté HTML (recommandé)
- JS :
  - `tresorerie_nette` affiche `caNetCoutsMensuel` mais **sans dire trésorerie**
  - couleur : vert si >=0, rouge sinon (ok)

Section “ROI” :
- supprimer calcul `beneficeNetAn1`, `roiAn1`, `amortissementText` actuel
- remplacer par tes nouvelles 4 cartes (si tu choisis ce design)
  - ex :
    - `res_invest`
    - `res_ca_1an`
    - `res_benefice` → repurposé en `res_ca_net_1an`
    - `res_amortissement` → repurposé en `res_couverture`

### 6.6 Mise à jour “donnees” (hidden inputs HubSpot)
Actuellement tu pushes :
- `trafic_visiteurs_mensuel` = trafic
- `gain_mensuel_estime` = gainMensuel
- `roi_previsionnel_12_mois` = roiAn1 (devenu inutile)
- `budget_investissement_estime` = investissement

Après refonte (Option 1 minimal-change) :
- `trafic_visiteurs_mensuel` = trafic
- `gain_mensuel_estime` = Math.round(deltaCA)  (CA incrémental mensuel)
- `roi_previsionnel_12_mois` = Math.round(pctHausseCA)  (recyclage du champ)
- `budget_investissement_estime` = investissement

> Tu documentes dans HubSpot que la propriété “roi_previsionnel_12_mois” contient désormais “% hausse CA”.

---

## 7) Refonte graphique (Chart.js) – cohérence de wording

### 7.1 Ce que fait le graphique actuellement
- Construit des séries “cumulées” à partir du **CA annuel** :
  - Sans écran : `0, CA0*12, CA0*24, CA0*36`
  - Avec écran : `0, CA1*12, CA1*24, CA1*36`

### 7.2 Ajustements recommandés
- Renommer le titre du bloc :
  - “Zone de Profit potentiel” → “Projection cumulée du CA (sur 3 ans)”
- Renommer dataset :
  - “Avec Écran AKAIRO” peut rester
- Optionnel (plus performant) :
  - Ne recréer le chart que si les valeurs ont changé (sinon update dataset)

---

## 8) PDF (html2pdf) – points d’attention
La fonction `downloadPDF()` :
- Ajoute la classe `pdf-mode` sur `#results`
- Génère un PDF A4 portrait
- Force 2 pages max
- Ajoute un branding base64 en fond sur chaque page
- Déclenche un event HubSpot `_hsq.push(['trackCustomBehavioralEvent', ...])`

Recommandations :
- Après refonte des textes “ROI/Profit”, vérifier le PDF (les mêmes libellés y seront)
- Le branding base64 est énorme : OK si tu assumes, sinon externaliser (mais attention CORS)

---

## 9) Performance & qualité dev (consignes concrètes)

### 9.1 Réduire les accès DOM répétitifs
Actuellement, `getVal()` refait un `getElementById` à chaque appel.  
Ce n’est pas dramatique, mais tu peux améliorer :

- Cacher les éléments clés au début de `calculerROI()` :
  - `const elTrafic = document.getElementById('trafic');` etc.
- Lire `value` une fois
- Écrire les outputs via un helper `setText` comme tu le fais (ok)

### 9.2 Normalisation / arrondis
- Pour les affichages “visiteurs” et “ventes” :
  - arrondir (`Math.round`) avant affichage
- Pour € :
  - `formatEuro()` à 0 décimales (déjà le cas)
- Pour badges % :
  - `toFixed(1)` pour éviter les gros sauts

### 9.3 Robustesse / cas limites
- Si `coutsMensuels` > `deltaCA` :
  - “CA net de coûts” devient négatif (afficher en rouge, et ne pas parler de “gain”)
- Si `uT` = 0 :
  - tout delta = 0, chart “avec” = “sans”
- Si `ventes` très faible :
  - deltaV peut être < 1 : afficher arrondi mais garder les calculs en float

### 9.4 Cohérence des labels (UX / crédibilité)
- Éviter les mots : “profit”, “trésorerie”, “cash-flow”, “ROI” (sans marge)
- Préférer :
  - “CA additionnel potentiel”
  - “CA additionnel potentiel net des coûts mensuels”
  - “Couverture indicative de l’investissement (sur CA net de coûts)”

---

## 10) Plan de test (3 cas simples – résultats attendus)

> Utiliser k = 0,435 et uT par défaut = 10%

### Cas 1 (valeurs default proches de ton HTML)
- T=1000, V=100, P=50, uT=10%
- deltaV = 100 * 0.10 * 0.435 = 4,35
- ventesApres ≈ 104
- deltaCA = 4,35 * 50 = 217,50 €/mois
- deltaCA annuel ≈ 2 610 €
- traficApres = 1100
- % hausse ventes ≈ 4,35%
- % hausse CA ≈ 4,35% (puisque panier constant)

### Cas 2 (commerce plus dense)
- T=5000, V=600, P=35, uT=10%
- deltaV = 600 * 0.10 * 0.435 = 26,1
- deltaCA = 26,1 * 35 = 913,5 €/mois
- annuel ≈ 10 962 €

### Cas 3 (uT 20% – vérifier l’élasticité)
- T=1000, V=100, P=50, uT=20%
- deltaV = 100 * 0.20 * 0.435 = 8,7
- deltaCA = 8,7 * 50 = 435 €/mois

---

## 11) Checklist de modification (ordre recommandé)

1) **index.html**
   - `#taux_hausse_trafic` : default 10
   - micro-texte explicatif
   - badge panier : passer à +0% ou rendre dynamique
   - renommer sections “ROI / profit / trésorerie” selon choix

2) **script.js**
   - ajouter constantes k + default uT
   - refondre `calculerROI()` selon §6.4
   - badges ventes et CA
   - repurposer la section ROI (ou la neutraliser)
   - adapter les hidden inputs HubSpot

3) **style.css** (si nécessaire)
   - si tu changes des labels/titres, rien à faire
   - si tu supprimes des cartes/sections : ajuster grid `roi-grid`

4) **Tests** (cas §10) + export PDF

---

## 12) Remarques “produit” (pour un outil plus pertinent)
- Ton calculateur est plus crédible si tu affiches aussi **+transactions/mois** (deltaV) en plus du CA :
  - le commerçant se projette mieux (“combien de tickets en plus”)
- Ajoute un mini texte de transparence :
  - “Simulation indicative : l’effet dépend de l’emplacement, de la visibilité vitrine et du contenu.”
- Si tu veux renforcer la défendabilité, tu peux ajouter un lien/renvoi “hypothèses” (accordion) expliquant :
  - uT (pré-rempli) et k (fixe) en 3 lignes

---

Fin du document.
