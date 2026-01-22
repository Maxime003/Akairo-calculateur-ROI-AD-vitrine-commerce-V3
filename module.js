// Variable globale pour le graphique Chart.js
let roiChartInstance = null;

document.addEventListener('DOMContentLoaded', function() {
  const btnCalculate = document.querySelector('.btn-calculate');
  if (btnCalculate) {
    btnCalculate.addEventListener('click', calculerROI);
  }
});

// === GESTION DU MODE ACHAT / LOCATION RSE ===
function toggleFinancement() {
  const isLocation = document.getElementById('mode_location').checked;
  const groupLoyer = document.getElementById('group_loyer');
  
  // Le bloc de résultat à afficher/masquer
  const blocTreso = document.getElementById('bloc_tresorerie');
  
  // Éléments UI à modifier
  const labelInvest = document.getElementById('label_invest');
  const helperInvest = document.getElementById('helper_invest');
  const inputInvest = document.getElementById('investissement');
  
  const labelCouts = document.getElementById('label_couts');
  const helperCouts = document.getElementById('helper_couts');

  if (isLocation) {
    // === MODE LOCATION RSE ===
    
    // 1. Afficher le champ Loyer
    groupLoyer.style.display = 'block'; 
    
    // 2. Afficher le bloc Résultat Trésorerie (L'argument clé)
    if (blocTreso) blocTreso.style.display = 'block';

    // 3. Adapter les libellés
    labelInvest.textContent = "Apport Initial (Facultatif)";
    helperInvest.textContent = "Préservation de la trésorerie (généralement 0€)";
    if (inputInvest.value == "3500") inputInvest.value = "0"; 

    labelCouts.textContent = "Services hors-leasing (€)";
    helperCouts.textContent = "Ex: Licence logicielle si non incluse dans le loyer";
    
  } else {
    // === MODE ACHAT COMPTANT ===
    
    // 1. Cacher le champ Loyer
    groupLoyer.style.display = 'none'; 
    
    // 2. Masquer le bloc Résultat Trésorerie (Moins pertinent en achat)
    if (blocTreso) blocTreso.style.display = 'none';

    // 3. Adapter les libellés
    labelInvest.textContent = "Investissement initial (€)";
    helperInvest.textContent = "Matériel + Installation + Logiciel";
    if (inputInvest.value == "0") inputInvest.value = "3500";

    labelCouts.textContent = "Coûts mensuels récurrents (€)";
    helperCouts.textContent = "Abonnement IDPLAY + Maintenance";
  }
}

// === CALCUL PRINCIPAL ===
function calculerROI() {
  console.log('--- Calcul en cours ---');

  // Helpers sécurisés
  const getVal = (id) => parseFloat(document.getElementById(id)?.value) || 0;
  
  // 1. Inputs
  const trafic = getVal('trafic');
  const ventes = getVal('ventes');
  const panier = getVal('panier');
  
  // Gestion intelligente de la simulation (Défaut 33%)
  let tauxHausseInput = 33;
  const elTaux = document.getElementById('taux_hausse_trafic');
  if (elTaux) tauxHausseInput = parseFloat(elTaux.value) || 33;

  // Gestion intelligente du Financement
  let investissement = getVal('investissement');
  let coutsMensuels = getVal('couts_mensuels');
  
  const isLocation = document.getElementById('mode_location')?.checked;
  if (isLocation) {
    const loyer = getVal('loyer_mensuel');
    coutsMensuels = coutsMensuels + loyer; // Total Charges Mensuelles
    // L'investissement reste l'apport (souvent 0)
  }

  // Validation
  if (trafic <= 0 || ventes <= 0 || panier <= 0) {
    alert('Veuillez renseigner Trafic, Ventes et Panier avec des valeurs positives.');
    return;
  }

  // 2. Logique Performance
  const tauxConversion = ventes / trafic;
  const caAvant = ventes * panier;

  const multiplicateurTrafic = 1 + (tauxHausseInput / 100);
  const traficApres = trafic * multiplicateurTrafic;
  const ventesApres = traficApres * tauxConversion;
  const panierApres = panier * 1.295; // Fixe +29.5%
  const caApres = ventesApres * panierApres;

  // 3. Logique Financière
  const gainMensuel = caApres - caAvant;
  const gainAnnuelCA = gainMensuel * 12;
  const coutInaction = gainMensuel * 6;
  const tresorerieNetteMensuelle = gainMensuel - coutsMensuels;
  
  const coutsAnnuels = coutsMensuels * 12;
  const beneficeNetAn1 = gainAnnuelCA - coutsAnnuels - investissement;
  const pourcentHausseCA = ((caApres - caAvant) / caAvant) * 100;

  // Calcul ROI (Cas spécial Division par zéro)
  let roiAn1 = 0;
  let roiText = "";
  if (investissement > 0) {
    roiAn1 = (beneficeNetAn1 / investissement) * 100;
    roiText = formatPourcent(roiAn1);
  } else {
    // Si investissement 0 => ROI Infini
    roiAn1 = 999999; 
    roiText = "Infini";
  }

  // 4. Affichage DOM
  const setText = (id, text) => { const el = document.getElementById(id); if(el) el.textContent = text; };

  // Comparatif
  setText('trafic_avant', formatNumber(trafic) + ' visit.');
  setText('ventes_avant', formatNumber(ventes) + ' ventes');
  setText('panier_avant', formatEuro(panier));
  setText('ca_avant', formatEuro(caAvant));

  setText('trafic_apres', formatNumber(Math.round(traficApres)) + ' visit.');
  setText('ventes_apres', formatNumber(Math.round(ventesApres)) + ' ventes');
  setText('panier_apres', formatEuro(panierApres));
  setText('ca_apres', formatEuro(caApres));

  // Badges
  setText('badge_trafic', '+' + tauxHausseInput + '%');
  setText('badge_ventes', '+' + tauxHausseInput + '%');
  setText('badge_ca', '+' + pourcentHausseCA.toFixed(1) + '%');

  // Bannières Gain & Tréso
  setText('gain_mensuel', formatEuro(gainMensuel));
  setText('gain_annuel', formatEuro(gainAnnuelCA));
  
  const elTreso = document.getElementById('tresorerie_nette');
  if (elTreso) {
    elTreso.textContent = (tresorerieNetteMensuelle > 0 ? '+' : '') + formatEuro(tresorerieNetteMensuelle) + ' /mois';
    elTreso.style.color = tresorerieNetteMensuelle >= 0 ? '#2a850e' : '#DE0B19';
  }

  // Cartes Finance
  setText('res_invest', formatEuro(investissement));
  setText('res_ca_1an', formatEuro(gainAnnuelCA));
  
  const elBenef = document.getElementById('res_benefice');
  if(elBenef) {
    elBenef.textContent = (beneficeNetAn1 > 0 ? '+' : '') + formatEuro(beneficeNetAn1);
    elBenef.style.color = beneficeNetAn1 >= 0 ? '#DE0B19' : '#1A1A1A';
  }

  const elRoi = document.getElementById('res_roi');
  if(elRoi) {
    elRoi.textContent = roiText;
    elRoi.style.color = '#DE0B19';
  }

  setText('cout_inaction', formatEuro(coutInaction));

  // 5. Graphique & Affichage Final
  updateChart(caAvant, caApres);
  
  const resultsSection = document.getElementById('results');
  if (resultsSection) {
    resultsSection.style.display = 'block';
    setTimeout(() => resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 150);
  }

  // Transfert Données (Hidden Inputs)
  const donnees = {
    'trafic_visiteurs_mensuel': trafic,
    'gain_mensuel_estime': Math.round(gainMensuel),
    'roi_previsionnel_12_mois': (roiAn1 > 9999) ? 9999 : Math.round(roiAn1),
    'budget_investissement_estime': investissement
  };
  for (const [key, val] of Object.entries(donnees)) {
    const input = document.querySelector(`input[name="${key}"]`);
    if(input) { input.value = val; input.dispatchEvent(new Event('change')); }
  }
}

// === GRAPHIQUE ===
function updateChart(caAvantMensuel, caApresMensuel) {
  const canvas = document.getElementById('roiChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const caAvantAn = caAvantMensuel * 12;
  const caApresAn = caApresMensuel * 12;
  const dataSans = [0, caAvantAn, caAvantAn * 2, caAvantAn * 3];
  const dataAvec = [0, caApresAn, caApresAn * 2, caApresAn * 3];

  if (roiChartInstance) roiChartInstance.destroy();

  roiChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Départ', 'Année 1', 'Année 2', 'Année 3'],
      datasets: [
        {
          label: 'Situation Actuelle',
          data: dataSans,
          borderColor: '#999', borderWidth: 2, borderDash: [5,5], pointRadius: 3
        },
        {
          label: 'Avec Écran AKAIRO',
          data: dataAvec,
          borderColor: '#DE0B19', backgroundColor: 'rgba(222, 11, 25, 0.1)',
          borderWidth: 3, pointRadius: 5, pointBackgroundColor: '#FFF', pointBorderColor: '#DE0B19',
          fill: '-1', tension: 0.3
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' }, tooltip: { mode: 'index', intersect: false } },
      scales: { y: { beginAtZero: true, ticks: { callback: v => v >= 1000 ? (v/1000) + ' k€' : v + ' €' } } }
    }
  });
}

// Utilitaires
function formatEuro(v) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v); }
function formatNumber(v) { return new Intl.NumberFormat('fr-FR').format(v); }
function formatPourcent(v) { return (v >= 0 ? '+' : '') + v.toFixed(0) + '%'; }
