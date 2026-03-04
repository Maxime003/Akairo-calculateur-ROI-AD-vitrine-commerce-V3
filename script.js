// ==========================================
// 1. VARIABLES GLOBALES & CONSTANTES
// ==========================================

let roiChartInstance = null;

// Constantes du modèle V3.1 "Impact CA"
const K_CONVERSION_RELATIVE = 0.435;   // Taux de conversion relatif du trafic incrémental
const DEFAULT_UPLIFT_TRAFFIC_PCT = 10; // Hausse de trafic pré-remplie par défaut (%)

// ==========================================
// 2. INITIALISATION
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
  const btnCalculate = document.querySelector('.btn-calculate');
  if (btnCalculate) {
    btnCalculate.addEventListener('click', calculerROI);
  }

  const btnDownload = document.querySelector('.btn-download-pdf');
  if (btnDownload) {
    btnDownload.addEventListener('click', downloadPDF);
  }

  document.querySelectorAll('input[name="financement"]').forEach(radio => {
    radio.addEventListener('change', toggleFinancement);
  });

  const dateSpan = document.getElementById('date-simulation');
  if (dateSpan) {
    dateSpan.textContent = new Date().toLocaleDateString('fr-FR');
  }
});

// ==========================================
// 3. LOGIQUE FINANCEMENT (Toggle)
// ==========================================

function toggleFinancement() {
  const isLocation = document.getElementById('mode_location').checked;
  const groupLoyer  = document.getElementById('group_loyer');
  const blocTreso   = document.getElementById('bloc_tresorerie');

  const labelInvest  = document.getElementById('label_invest');
  const helperInvest = document.getElementById('helper_invest');
  const inputInvest  = document.getElementById('investissement');

  const labelCouts  = document.getElementById('label_couts');
  const helperCouts = document.getElementById('helper_couts');

  if (isLocation) {
    if (groupLoyer) groupLoyer.style.display = 'block';
    if (blocTreso)  blocTreso.style.display  = 'block';

    labelInvest.textContent  = "Apport Initial (Facultatif)";
    helperInvest.textContent = "Préservation de la trésorerie (généralement 0€)";
    if (inputInvest.value === "3500") inputInvest.value = "0";

    labelCouts.textContent  = "Licence logicielle mensuelle (€)";
    helperCouts.textContent = "Licence IDPLAY mensuelle (non incluse dans le loyer)";

  } else {
    if (groupLoyer) groupLoyer.style.display = 'none';
    if (blocTreso)  blocTreso.style.display  = 'none';

    labelInvest.textContent  = "Investissement initial (€)";
    helperInvest.textContent = "Matériel + Installation + Logiciel";
    if (inputInvest.value === "0") inputInvest.value = "3500";

    labelCouts.textContent  = "Licence logicielle mensuelle (€)";
    helperCouts.textContent = "Licence IDPLAY mensuelle";
  }
}

// ==========================================
// 4. LOGIQUE MÉTIER — CALCUL ROI V3.1
// ==========================================

function calculerROI() {
  const getVal = (id) => parseFloat(document.getElementById(id)?.value) || 0;

  const trafic = getVal('trafic');
  const ventes = getVal('ventes');
  const panier = getVal('panier');

  let tauxHausseInput = DEFAULT_UPLIFT_TRAFFIC_PCT;
  const elTaux = document.getElementById('taux_hausse_trafic');
  if (elTaux) tauxHausseInput = parseFloat(elTaux.value) || DEFAULT_UPLIFT_TRAFFIC_PCT;
  tauxHausseInput = Math.max(0, tauxHausseInput);

  let investissement = getVal('investissement');
  let coutsMensuels  = getVal('couts_mensuels');

  const isLocation = document.getElementById('mode_location')?.checked;
  if (isLocation) {
    coutsMensuels += getVal('loyer_mensuel');
  }

  // --- Validation ---
  if (trafic <= 0 || ventes <= 0 || panier <= 0) {
    alert('Veuillez renseigner le Trafic, les Ventes et le Panier moyen avec des valeurs positives.');
    return;
  }
  if (ventes > trafic) {
    alert('Le nombre de transactions ne peut pas dépasser le trafic entrant. Corrigez vos valeurs.');
    return;
  }

  // -----------------------------------------------
  // MODÈLE V3.1 — "Impact CA"
  // -----------------------------------------------

  const uT = tauxHausseInput / 100;
  const k  = K_CONVERSION_RELATIVE;

  const traficApres  = trafic * (1 + uT);
  const deltaV       = ventes * uT * k;
  const ventesApres  = ventes + deltaV;
  const panierApres  = panier;

  const caAvant  = ventes * panier;
  const deltaCA  = deltaV * panier;
  const caApres  = caAvant + deltaCA;

  const gainMensuel     = deltaCA;
  const gainAnnuelCA    = gainMensuel * 12;
  const coutInaction    = gainMensuel * 6;
  const pctHausseCA     = (deltaCA / caAvant) * 100;
  const pctHausseVentes = (deltaV / ventes) * 100;

  const caNetCoutsMensuel = gainMensuel - coutsMensuels;
  const caNetCoutsAnnuel  = caNetCoutsMensuel * 12;

  // Couverture investissement
  let couvertureText  = "";
  let couvertureColor = "#DE0B19";

  if (investissement > 0) {
    if (caNetCoutsMensuel <= 0) {
      couvertureText  = "Non atteignable";
      couvertureColor = "#333";
    } else {
      const couvertureMois = investissement / caNetCoutsMensuel;
      if (couvertureMois > 60) {
        couvertureText  = "> 5 ans";
        couvertureColor = "#DE0B19";
      } else {
        couvertureText  = Math.round(couvertureMois) + " mois";
        couvertureColor = couvertureMois <= 18 ? "#2a850e" : "#DE0B19";
      }
    }
  } else {
    couvertureText  = caNetCoutsMensuel > 0 ? "Immédiat" : "N/A";
    couvertureColor = caNetCoutsMensuel > 0 ? "#2a850e" : "#333";
  }

  // -----------------------------------------------
  // MISE À JOUR DU DOM
  // -----------------------------------------------

  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

  setText('trafic_avant', formatNumber(trafic) + ' visit.');
  setText('ventes_avant', formatNumber(ventes) + ' ventes');
  setText('panier_avant', formatEuro(panier));
  setText('ca_avant',     formatEuro(caAvant));

  setText('trafic_apres', formatNumber(Math.round(traficApres)) + ' visit.');
  setText('ventes_apres', formatNumber(Math.round(ventesApres)) + ' ventes');
  setText('panier_apres', formatEuro(panierApres));
  setText('ca_apres',     formatEuro(caApres));

  setText('badge_trafic', '+' + tauxHausseInput + '%');
  setText('badge_ventes', '+' + pctHausseVentes.toFixed(1) + '%');
  setText('badge_panier', '+0%');
  setText('badge_ca',     '+' + pctHausseCA.toFixed(1) + '%');

  setText('gain_mensuel', formatEuro(gainMensuel));
  setText('gain_annuel',  formatEuro(gainAnnuelCA));

  const elCaNet = document.getElementById('tresorerie_nette');
  if (elCaNet) {
    elCaNet.textContent = (caNetCoutsMensuel > 0 ? '+' : '') + formatEuro(caNetCoutsMensuel) + ' /mois';
    elCaNet.style.color = caNetCoutsMensuel >= 0 ? '#2a850e' : '#DE0B19';
  }

  // -----------------------------------------------
  // INDICATEURS CLÉS — 4 CARTES
  // -----------------------------------------------

  // Carte 1 — Ventes supplémentaires / mois
  // Formule : deltaV = V * uT * k (déjà calculé en amont)
  setText('res_delta_ventes', '+' + deltaV.toFixed(1));

  // Carte 2 — CA additionnel sur 3 ans
  // Formule : deltaCA * 36
  const caAdditionnel3ans = deltaCA * 36;
  setText('res_ca_3ans', formatEuro(caAdditionnel3ans));

  // Carte 3 — Coût journalier de l'écran sur 36 mois
  // Base : 30.44 jours/mois (365/12), durée 36 mois = 1 095.84 jours
  // Achat comptant : (I + L * 36) / 1095.84
  // Location RSE   : (loyer + L) / 30.44  (pas d'investissement à amortir)
  const JOURS_PAR_MOIS = 365 / 12;        // 30.4167 jours
  const DUREE_MOIS     = 36;
  const JOURS_TOTAL    = DUREE_MOIS * JOURS_PAR_MOIS; // 1 095.0 jours

  let coutJournalier;
  const licenceMensuelle = getVal('couts_mensuels');

  if (isLocation) {
    // Location : coût mensuel = loyer + licence, pas d'investissement initial
    const loyerVal = getVal('loyer_mensuel');
    coutJournalier = (loyerVal + licenceMensuelle) / JOURS_PAR_MOIS;
  } else {
    // Achat comptant : amortissement investissement + licence sur 36 mois
    coutJournalier = (investissement + licenceMensuelle * DUREE_MOIS) / JOURS_TOTAL;
  }

  const elCoutJour = document.getElementById('res_cout_jour');
  if (elCoutJour) {
    elCoutJour.textContent = new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'EUR',
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(coutJournalier) + '/j';
  }

  // Carte 4 — Couverture de l'investissement
  // Formule : I / caNetCoutsMensuel (calculé plus haut)
  const elCouverture = document.getElementById('res_amortissement');
  if (elCouverture) {
    elCouverture.textContent = couvertureText;
    elCouverture.style.color = couvertureColor;
  }

  setText('cout_inaction', formatEuro(coutInaction));

  // Mise à jour du titre du graphique
  const chartTitle = document.getElementById('chart-title');
  if (chartTitle) {
    if (investissement > 0 && caNetCoutsMensuel > 0) {
      chartTitle.textContent = "Couverture de l'investissement — CA net cumulé sur 36 mois";
    } else {
      chartTitle.textContent = "CA additionnel net cumulé sur 36 mois";
    }
  }

  updateChart(investissement, caNetCoutsMensuel);

  const resultsSection = document.getElementById('results');
  if (resultsSection) {
    resultsSection.style.display = 'block';
    const dateSpan = document.getElementById('date-simulation');
    if (dateSpan) dateSpan.textContent = new Date().toLocaleDateString('fr-FR');
    setTimeout(() => resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 150);
  }

  // Hidden inputs HubSpot
  const donnees = {
    'trafic_visiteurs_mensuel':     trafic,
    'gain_mensuel_estime':          Math.round(deltaCA),
    'roi_previsionnel_12_mois':     Math.round(pctHausseCA),
    'budget_investissement_estime': investissement
  };
  for (const [key, val] of Object.entries(donnees)) {
    const input = document.querySelector(`input[name="${key}"]`);
    if (input) {
      input.value = val;
      input.dispatchEvent(new Event('change'));
    }
  }
}

// ==========================================
// 5. GRAPHIQUE — COUVERTURE INVESTISSEMENT
// ==========================================

function updateChart(investissement, caNetMensuel) {
  const canvas = document.getElementById('roiChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const MOIS = 36;

  // Série cumulée mois par mois
  const labels    = [];
  const cumulData = [];

  for (let i = 0; i <= MOIS; i++) {
    labels.push(i === 0 ? 'Départ' : `M${i}`);
    cumulData.push(Math.round(caNetMensuel * i));
  }

  // Ligne investissement (constante, null si pas d'investissement)
  const investData = Array(MOIS + 1).fill(investissement > 0 ? investissement : null);

  // Mois de couverture
  let moisCouverture = null;
  if (investissement > 0 && caNetMensuel > 0) {
    const raw = investissement / caNetMensuel;
    if (raw <= MOIS) moisCouverture = Math.round(raw);
  }

  if (roiChartInstance) roiChartInstance.destroy();

  roiChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'CA net cumulé',
          data: cumulData,
          borderColor: '#DE0B19',
          backgroundColor: 'rgba(222, 11, 25, 0.08)',
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#DE0B19',
          pointHoverBorderWidth: 2,
          fill: true,
          tension: 0.35,
          order: 2,
        },
        {
          label: 'Investissement initial',
          data: investData,
          borderColor: '#1A1A1A',
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          tension: 0,
          order: 1,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 14,
            boxHeight: 2,
            padding: 20,
            font: { size: 12 },
            color: '#555',
          }
        },
        tooltip: {
          backgroundColor: '#1A1A1A',
          titleColor: '#fff',
          bodyColor: '#ccc',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            title: (items) => {
              const idx = items[0]?.dataIndex;
              if (moisCouverture && idx === moisCouverture) {
                return `Mois ${idx} — ✓ Investissement couvert`;
              }
              return idx === 0 ? 'Départ' : `Mois ${idx}`;
            },
            label: (item) => {
              if (item.raw === null) return null;
              return ` ${item.dataset.label} : ${formatEuro(item.raw)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            color: '#999',
            font: { size: 11 },
            maxTicksLimit: 13,
            callback: function(val, index) {
              return index % 6 === 0 ? this.getLabelForValue(val) : '';
            }
          }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            color: '#999',
            font: { size: 11 },
            callback: (v) => v >= 1000 ? (v / 1000).toFixed(1) + ' k€' : v + ' €'
          }
        }
      }
    },
    plugins: [
      {
        // Marqueur vert au point de couverture
        id: 'couvertureMarker',
        afterDraw(chart) {
          if (!moisCouverture || caNetMensuel <= 0 || investissement <= 0) return;

          const { ctx: c, chartArea, scales: { x, y } } = chart;
          const xPos = x.getPixelForValue(moisCouverture);
          const yPos = y.getPixelForValue(cumulData[moisCouverture]);

          // Ligne verticale pointillée verte
          c.save();
          c.beginPath();
          c.setLineDash([4, 3]);
          c.strokeStyle = 'rgba(42, 133, 14, 0.45)';
          c.lineWidth = 1.5;
          c.moveTo(xPos, chartArea.top);
          c.lineTo(xPos, chartArea.bottom);
          c.stroke();

          // Point vert
          c.beginPath();
          c.setLineDash([]);
          c.arc(xPos, yPos, 7, 0, Math.PI * 2);
          c.fillStyle = '#2a850e';
          c.fill();
          c.strokeStyle = '#fff';
          c.lineWidth = 2;
          c.stroke();

          // Étiquette
          const label   = `✓ Couvert — M${moisCouverture}`;
          const padding = 7;
          c.font = 'bold 11px Outfit, Helvetica, sans-serif';
          const textW = c.measureText(label).width;
          const boxW  = textW + padding * 2;
          const boxH  = 22;
          const rawX  = xPos - boxW / 2;
          const boxX  = Math.max(chartArea.left + 2, Math.min(rawX, chartArea.right - boxW - 2));
          const boxY  = yPos - boxH - 12;

          c.fillStyle = '#2a850e';
          c.beginPath();
          if (c.roundRect) {
            c.roundRect(boxX, boxY, boxW, boxH, 4);
          } else {
            c.rect(boxX, boxY, boxW, boxH);
          }
          c.fill();

          c.fillStyle = '#fff';
          c.textAlign  = 'left';
          c.textBaseline = 'middle';
          c.fillText(label, boxX + padding, boxY + boxH / 2);
          c.restore();
        }
      }
    ]
  });
}

// ==========================================
// 6. LOGIQUE PDF
// ==========================================

function downloadPDF() {
  const element = document.getElementById('results');
  if (!element) return;
  const btn = document.querySelector('.btn-download-pdf');

  element.classList.add('pdf-mode');

  if (btn) {
    btn.textContent = 'Génération en cours...';
    btn.disabled = true;
    btn.style.opacity = '0.7';
  }

  const brandingBase64 = ''; // Votre image base64 ici

  const opt = {
    margin:      [35, 10, 10, 10],
    filename:    'Etude-Rentabilite-AKAIRO.pdf',
    image:       { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
    jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  setTimeout(() => {
    html2pdf().from(element).set(opt).toPdf().get('pdf').then(function(pdf) {

      const initialPages = pdf.internal.getNumberOfPages();
      if (initialPages > 2) {
        for (let i = initialPages; i > 2; i--) {
          pdf.deletePage(i);
        }
      }

      const finalPages = pdf.internal.getNumberOfPages();
      const pageWidth  = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      if (brandingBase64.length > 50) {
        for (let i = 1; i <= finalPages; i++) {
          pdf.setPage(i);
          pdf.addImage(brandingBase64, 'PNG', 0, 0, pageWidth, pageHeight);
        }
      }

    }).save().then(function() {
      element.classList.remove('pdf-mode');
      if (btn) {
        btn.textContent = '📄 Télécharger le rapport PDF';
        btn.disabled = false;
        btn.style.opacity = '1';
      }
      if (typeof window._hsq !== 'undefined') {
        window._hsq.push(['trackCustomBehavioralEvent', {
          name: 'telechargement_pdf_roi_commerce',
          properties: {}
        }]);
      }
    }).catch(function(err) {
      console.error(err);
      element.classList.remove('pdf-mode');
      if (btn) {
        btn.textContent = 'Erreur — Réessayer';
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    });
  }, 200);
}

// ==========================================
// 7. UTILITAIRES
// ==========================================

function formatEuro(v) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(v);
}

function formatNumber(v) {
  return new Intl.NumberFormat('fr-FR').format(v);
}

