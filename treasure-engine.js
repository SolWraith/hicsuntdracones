/* Dragon's Hoard - motore di generazione del tesoro
 * Conversione della macro MapTool "Esperienza Pathfinder E Tesoro".
 * Logica pura: nessun accesso a DOM o storage, così si può testare da solo.
 */
(function (root) {
  'use strict';

  // Scala dei GS: indice 0..4 = frazioni, poi 1, 2, 3, ...
  const FRAZIONI = ['1/8', '1/6', '1/4', '1/3', '1/2'];
  const XP_FRAZ = [50, 65, 100, 135, 200];
  const TESORO_FRAZ = [35, 45, 65, 85, 130];
  const DIVISORE_FRAZ = [8, 6, 4, 3, 2];

  const TESORO_PER_GS = [
    260, 550, 800, 1150, 1550, 2000, 2600, 3350, 4250, 5450, 7000, 9000, 11600,
    15000, 19500, 25000, 32000, 41000, 53000, 67000, 84000, 105000, 132000,
    165000, 208000
  ]; // indice 0 = GS 1 ... indice 24 = GS 25

  /** Legge un GS scritto dall'utente ("7", "1/3") -> { intero, frazione } */
  function interpretaGS(testo) {
    const t = String(testo).trim().replace(/\s+/g, '');
    const i = FRAZIONI.indexOf(t);
    if (i !== -1) return { gs: 1, frazione: i + 1, etichetta: FRAZIONI[i] };
    const n = Math.floor(Number(t.replace(',', '.')));
    const gs = Number.isFinite(n) ? Math.min(Math.max(n, 1), 60) : 1;
    return { gs: gs, frazione: 0, etichetta: String(gs) };
  }

  /** Passo successivo/precedente sulla scala dei GS (per i bottoni - e +) */
  function scalaGS(etichetta, passo) {
    const scala = FRAZIONI.concat(Array.from({ length: 60 }, (_, k) => String(k + 1)));
    let i = scala.indexOf(interpretaGS(etichetta).etichetta);
    i = Math.min(Math.max(i + passo, 0), scala.length - 1);
    return scala[i];
  }

  function esperienzaPerGS(gs) {
    if (gs === 1) return 400;
    if (gs === 2) return 600;
    if (gs === 3) return 800;
    const molt = Math.pow(2, Math.floor(gs / 2) - 1);
    return (gs % 2 === 0 ? 600 : 800) * molt;
  }

  function valoreTesoroPerGS(gs) {
    if (gs <= 25) return TESORO_PER_GS[gs - 1];
    return Math.ceil((208000 * Math.pow(1.2, gs - 25)) / 1000) * 1000;
  }

  function formatta(n) { return String(n).replace('.', ','); }

  /**
   * opzioni: { gs: "7" | "1/3", partecipanti, moltiplicatore, rng? }
   * rng: funzione che restituisce un numero in [0,1) (utile per i test)
   */
  function generaTesoro(opzioni) {
    const rng = opzioni.rng || Math.random;
    const tira = (n, facce) => { // somma di n dadi a "facce" facce
      let s = 0;
      for (let k = 0; k < n; k++) s += Math.floor(rng() * facce) + 1;
      return s;
    };
    const d = (facce) => tira(1, facce);

    const g = interpretaGS(opzioni.gs);
    const GS = g.gs;
    const fr = g.frazione; // 0 = intero, 1..5 = frazione
    const part = Math.max(Math.floor(Number(opzioni.partecipanti)) || 1, 1);
    const molt = Math.max(Math.floor(Number(opzioni.moltiplicatore)) || 1, 1);
    const dividi = (x) => Math.floor(x / DIVISORE_FRAZ[fr - 1]);

    // Esperienza e valore del tesoro
    const esperienza = fr ? XP_FRAZ[fr - 1] : esperienzaPerGS(GS);
    const valBase = fr ? TESORO_FRAZ[fr - 1] : valoreTesoroPerGS(GS);

    // Monete
    let monete = tira(1, Math.floor(valBase / 2) * 100 * molt + 1) - 1;
    if (d(100) <= 15 - Math.floor(GS / 2)) monete = 0;
    let mp = 0, mo = 0, ma = 0;
    if (monete >= 1000) {
      mp = tira(1, Math.floor(monete / 1000) + 1) - 1;
      monete -= mp * 1000;
    }
    if (monete >= 100) {
      const f = Math.floor(monete / 100);
      mo = Math.max(d(f), d(f));
      monete -= mo * 100;
    }
    if (monete >= 10) {
      const f = Math.floor(monete / 10);
      ma = Math.max(d(f), d(f), d(f));
      monete -= ma * 10;
    }
    const mr = monete;

    // Beni (gemme / oggetti d'arte)
    let beni = '';
    let dadoBeni = 0;
    const gemOggArt = GS + d(20);
    const gradoOggArt = 20 + Math.ceil(GS / 2);
    if (gemOggArt >= 20) dadoBeni = d(100);
    if (dadoBeni >= 1) beni = 'gemme';
    if (dadoBeni >= 46 && gemOggArt >= gradoOggArt) beni = 'arte';
    if (dadoBeni >= 81 && gemOggArt >= gradoOggArt) beni = 'entrambi';

    let gemme = tira(1, Math.max(GS - 2, 1) * molt);
    let oggArte = tira(1, Math.max(Math.floor(GS / 2), 1) * molt);
    if (fr) { gemme = dividi(gemme); oggArte = dividi(oggArte); }
    if (beni !== 'gemme' && beni !== 'entrambi') gemme = 0;
    if (beni !== 'arte' && beni !== 'entrambi') oggArte = 0;

    // Oggetti (comuni / magici)
    let categoria = '';
    const oggComMagi = GS + d(10);
    if (oggComMagi >= 5) categoria = 'comuni';
    if (oggComMagi >= 11) categoria = 'minori';
    if (oggComMagi >= 18) categoria = 'medi';
    if (oggComMagi >= 24) categoria = 'maggiori';

    let comuni = tira(1, (GS + Math.floor(GS / 2)) * molt);
    if (fr === 4) comuni = Math.ceil(comuni / 3);
    if (fr === 5) comuni = Math.ceil(comuni / 2);
    let minori = tira(1, (1 + Math.floor(GS / 2)) * molt);
    let medi = tira(1, (1 + Math.floor(GS / 6)) * molt);
    const dadoMagg = Math.max(Math.floor(GS / 8), 1) + (GS >= 19 ? Math.floor(GS / 19) : 0);
    let maggiori = fr === 0 ? tira(1, dadoMagg * molt) : 0;

    const livello = { '': 0, comuni: 1, minori: 2, medi: 3, maggiori: 4 }[categoria];
    if (livello < 1) comuni = 0;
    if (livello < 2) minori = 0;
    if (livello < 3) medi = 0;
    if (livello < 4) maggiori = 0;
    if (fr >= 1 && fr <= 3) comuni = 0;
    if (fr >= 1) { minori = 0; medi = 0; maggiori = 0; }

    // Valori derivati
    const valTesoro = valBase * molt;
    const valATesta = Math.floor((valTesoro / part) * 100) / 100;
    const valoreMoneteMO = (mr + ma * 10 + mo * 100 + mp * 1000) / 100;

    return {
      gs: g.etichetta, partecipanti: part, moltiplicatore: molt,
      esperienza: esperienza,
      esperienzaIndividuale: Math.floor(esperienza / part),
      valoreTesoro: valTesoro,
      valoreTesoroATesta: formatta(valATesta),
      monete: { mr: mr, ma: ma, mo: mo, mp: mp },
      valoreMoneteMO: valoreMoneteMO,
      beni: { gemme: gemme, oggettiArte: oggArte, listaGemme: generaGemme(gemme, rng), listaArte: generaOggettiArte(oggArte, rng) },
      oggetti: { comuni: comuni, minori: minori, medi: medi, maggiori: maggiori },
      listaComuni: generaOggettiComuni(comuni, rng),
      listaMinori: generaOggettiMinori(minori, rng),
      categoriaOggetti: categoria
    };
  }

  // ---- Tabelle, gemme e oggetti d'arte ----
  const ROMANI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
  // valore = n dadi a "facce" facce + base, per categoria
  const GEMME_VAL = [[4, 4, 0], [1, 64, 16], [1, 121, 39], [1, 640, 160], [1, 1201, 399], [1, 6400, 1600], [1, 8000, 4000], [1, 64000, 16000], [1, 120000, 40000], [1, 640000, 160000]];
  const ARTE_VAL = [[1, 90, 10], [1, 150, 30], [1, 500, 100], [1, 900, 100], [1, 1000, 200], [1, 1500, 300], [1, 2000, 400], [1, 2500, 500], [1, 3000, 1000], [1, 5000, 1000],
    [1, 6000, 2000], [1, 10000, 2000], [1, 20000, 4000], [1, 30000, 10000], [1, 90000, 30000], [1, 200000, 40000], [1, 300000, 100000], [1, 900000, 300000], [1, 2000000, 400000], [1, 4500000, 500000]];
  const MAX_GEMME = 50, MAX_ARTE = 20; // limiti dell'elenco dettagliato (come nelle macro originali)

  function tiraEspressione(expr, rng) { // "1d4+3"
    const m = /^(\d+)d(\d+)([+-]\d+)?$/.exec(String(expr).replace(/\s+/g, ''));
    if (!m) return 1;
    let s = Number(m[3] || 0);
    for (let k = 0; k < Number(m[1]); k++) s += Math.floor(rng() * Number(m[2])) + 1;
    return s;
  }

  /** Estrae una riga da una tabella; null se la tabella non esiste */
  function pescaTabella(nome, rng, roll) {
    const t = (root.DH_TABELLE || {})[nome];
    if (!t) return null;
    const n = roll ? tiraEspressione(roll, rng) : Math.floor(rng() * t.d) + 1;
    const riga = t.r.find(x => n >= x[0] && n <= x[1]);
    return riga ? riga[2] : '';
  }

  /** Risolve i segnaposto {{...}} dei testi delle tabelle */
  function risolvi(testo, rng, prof) {
    prof = prof || 0;
    if (prof > 8) return testo;
    const mancante = n => '[tabella “' + n + '” mancante]';
    const out = String(testo).replace(/\{\{(.*?)\}\}/g, (_, tok) => {
      const i = tok.indexOf(':'), cmd = tok.slice(0, i), arg = tok.slice(i + 1);
      if (cmd === '50') return rng() < 0.5 ? arg : '';
      if (cmd === 'scelta') { const o = arg.split('|'); return o[Math.floor(rng() * o.length)]; }
      if (cmd === 'taglia') {
        const v = pescaTabella('Taglia Casuale', rng, arg);
        if (v === null) return mancante('Taglia Casuale');
        return (v === 'Media' || v === '') ? '' : 'di taglia ' + v;
      }
      if (cmd === 'tab') {
        const p = arg.split('|'), nome = p[0];
        let roll = null, noend = null;
        p.slice(1).forEach(x => { if (x.startsWith('roll=')) roll = x.slice(5); if (x.startsWith('noend=')) noend = x.slice(6); });
        let v = null;
        for (let k = 0; k < 50; k++) {
          v = pescaTabella(nome, rng, roll);
          if (v === null) return mancante(nome);
          if (!(noend && v.endsWith(noend))) break;
        }
        return risolvi(v, rng, prof + 1);
      }
      return '';
    });
    return prof === 0 ? out.replace(/\s{2,}/g, ' ').replace(/\s+([,;:.)])/g, '$1').trim() : out;
  }

  function generaVoci(n, rng, selettore, prefisso, valori) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const sel = parseInt(pescaTabella(selettore, rng), 10);
      if (!sel || !valori[sel - 1]) { out.push({ nome: '(tabelle non disponibili)', val: 0, cat: 'I' }); continue; }
      const v = valori[sel - 1];
      let val = v[2];
      for (let j = 0; j < v[0]; j++) val += Math.floor(rng() * v[1]) + 1;
      out.push({ nome: risolvi(pescaTabella(prefisso + sel, rng) || '', rng), val: val, cat: ROMANI[sel - 1] });
    }
    return out;
  }
  const generaGemme = (n, rng) => generaVoci(Math.min(n, MAX_GEMME), rng || Math.random, 'Gemme', 'Gemma', GEMME_VAL);
  const generaOggettiArte = (n, rng) => generaVoci(Math.min(n, MAX_ARTE), rng || Math.random, 'Oggetti Arte', 'Oggetto Arte', ARTE_VAL);
  function riepilogo(lista) {
    let tot = 0, alta = 0;
    lista.forEach(x => { tot += x.val; alta = Math.max(alta, ROMANI.indexOf(x.cat) + 1); });
    return { totale: tot, categoriaAlta: ROMANI[alta - 1] || 'I' };
  }

  /** Suggerimenti per un oggetto d'arte personalizzato (macro "Generatore Di Oggetti D'Arte Casuali").
   *  Mantiene valore e categoria dell'oggetto che sostituisce. */
  function generaPersonalizzato(val, cat, rng) {
    rng = rng || Math.random;
    const P = 'Oggetti Arte Casuali';
    const pesca = nome => pescaTabella(nome, rng);
    const eq = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
    const tipo = pesca(P);
    let spec = 0;
    // stessi passaggi, nello stesso ordine, della macro originale
    [['t', 'Arredamento'], ['t', 'Gioco'], ['t', 'Gioiello'], ['t', 'Opera Artistica'], ['s', 'Solido Geometrico'],
     ['t', 'Strumento Musicale'], ['t', 'Utensile'], ['t', 'Vestito'], ['s', 'Armatura'], ['s', 'Scudo'], ['s', 'Arma']
    ].forEach(p => {
      if (eq(p[0] === 't' ? tipo : spec, p[1])) { const v = pesca(P + ' ' + p[1]); if (v !== null) spec = v; }
    });
    const materiale = (base, passi) => {
      let m = pesca(P + ' ' + base);
      passi.forEach(p => { if (m !== null && eq(m, p[0])) { const v = pesca(P + ' ' + p[1]); if (v !== null) m = v; } });
      return m;
    };
    const ROB = [['Avorio o Corno', 'Avorio'], ['Legno Duro', 'Legno Duro'], ['Legno Tenero', 'Legno Tenero'], ['Metallo', 'Metallo'], ['Pietra', 'Pietra']];
    const FRA = ['Pelle', 'Pelle Esotica', 'Pelliccia', 'Pelliccia Esotica', 'Piume', 'Piume Esotiche', 'Tessuto'].map(x => [x, x]);
    const r = x => risolvi(x === null ? '(tabella non disponibile)' : x, rng);
    const opz = [0, 1, 2].map(() => ({
      rob: r(materiale('Materiale Robusto', ROB)), fra: r(materiale('Materiale Fragile', FRA)),
      scena: r(pesca(P + ' Scene')), abb: r(pesca(P + ' Abbellimento'))
    }));
    return { alt: true, nome: 'Oggetto personalizzato', val: val, cat: cat, tipo: r(tipo), spec: r(spec === 0 ? '—' : spec), opz: opz, dim: r(pesca(P + ' Dimensioni')) };
  }

  const MAX_COMUNI = 30;
  const eqs = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

  /** "Candela (1d4)" -> "Candela: 3 (1d4)"; "Corda (1d20 x 1,5 m)" -> "Corda: 12 m (1d20 x 1,5 m)".
   *  Il contenuto tra parentesi resta, così si vede anche il valore generabile. */
  function espandiDadi(testo, rng) {
    rng = rng || Math.random;
    const m = /^(.*\S)\s*\((\d+)d(\d+)([^)]*)\)\s*$/.exec(testo);
    if (!m) return testo;
    const n = Number(m[2]), f = Number(m[3]), resto = m[4];
    let unita = resto.split(';')[0].trim(), molt = 1;
    const mm = /^x\s*([\d.,]+)\s*(.*)$/i.exec(unita);
    if (mm) { molt = parseFloat(mm[1].replace(',', '.')); unita = mm[2].trim(); }
    let tot = 0;
    for (let k = 0; k < n; k++) tot += Math.floor(rng() * f) + 1;
    const SING = { ampolle: 'ampolla', boccette: 'boccetta', bastoni: 'bastone', borse: 'borsa', pietre: 'pietra', tizzoni: 'tizzone', verghe: 'verga', vasetti: 'vasetto',
      fiale: 'fiala', sacchetti: 'sacchetto', flaconi: 'flacone', palline: 'pallina', fogli: 'foglio', pezzi: 'pezzo', 'utilizzi rimasti': 'utilizzo rimasto' };
    if (tot * molt === 1 && SING[unita]) unita = SING[unita]; // 1 ampolla, non "1 ampolle"
    const num = String(Math.round(tot * molt * 100) / 100).replace('.', ',');
    return m[1] + ': ' + num + (unita ? ' ' + unita : '') + ' (' + m[2] + 'd' + m[3] + resto + ')';
  }

  // ---- Armi, armature e scudi casuali (macro "Arma Casuale" e "Armatura o Scudo Casuale") ----
  function materialeMetallo(r100) {
    return r100 === 96 ? 'Adamantio' : r100 === 97 ? 'Argento Alchemico' : r100 === 98 ? 'Ferro Freddo' : r100 === 99 ? 'Mithril' : r100 === 100 ? 'Scaglie di Drago' : 'Comune';
  }
  /** Restituisce un testo su più righe: la prima è il nome, le altre i dettagli */
  function generaArma(rng) {
    rng = rng || Math.random;
    const d = f => Math.floor(rng() * f) + 1;
    const nome = pescaTabella('Arma Casuale', rng);
    if (nome === null) return '[tabella “Arma Casuale” mancante]';
    const costoBonus = eqs(nome, 'Arco Corto Composito') ? 75 : eqs(nome, 'Arco Lungo Composito') ? 100 : 0;
    const metallo = materialeMetallo(d(100));
    const legno = d(100) >= 96 ? 'Legnoscuro' : 'Comune';
    const po = d(100);
    const potente = po >= 97 ? 5 : po >= 91 ? 4 : po >= 83 ? 3 : po >= 73 ? 2 : po >= 61 ? 1 : 0;
    const perfetta = d(100) >= 76;
    const t = d(138);
    const taglia = t >= 138 ? 'Colossale' : t >= 136 ? 'Mastodontica' : t >= 131 ? 'Enorme' : t >= 121 ? 'Grande' : t >= 101 ? 'Piccola' : 'Media';
    let det = 'Perfetta: ' + (perfetta ? 'Sì' : 'No') + '; Metallo: ' + metallo + '; Legno: ' + legno;
    if (costoBonus && potente > 0) det += '; Potente: +' + potente + ' (+' + costoBonus + ' MO x bonus; totale: +' + (potente * costoBonus) + ' MO)';
    return 'Arma - ' + risolvi(nome, rng) + ' (per creature di taglia ' + taglia + ')\n' + det;
  }
  function armaturaOScudo(tabella, prefisso, perfettaLabel, rng) {
    rng = rng || Math.random;
    const d = f => Math.floor(rng() * f) + 1;
    const nome = pescaTabella(tabella, rng);
    if (nome === null) return '[tabella “' + tabella + '” mancante]';
    const metallo = materialeMetallo(d(100));
    const legno = d(100) >= 96 ? 'Legnoscuro' : 'Comune';
    const chiodato = d(100) <= 10;
    const perfetta = d(100) >= 76;
    const t = d(100);
    const taglia = t >= 99 ? 'Enorme' : t >= 91 ? 'Grande' : t >= 76 ? 'Piccola' : 'Media';
    return prefisso + ' - ' + risolvi(nome, rng) + ' (per creature di taglia ' + taglia + ')\n' + perfettaLabel + ': ' + (perfetta ? 'Sì' : 'No') +
      '; Metallo: ' + metallo + '; Legno: ' + legno + '; Chiodatura: ' + (chiodato ? 'Chiodato' : 'No');
  }
  const generaArmatura = rng => armaturaOScudo('Armatura Casuale', 'Armatura', 'Perfetta', rng);
  const generaScudo = rng => armaturaOScudo('Scudo Casuale', 'Scudo', 'Perfetto', rng);

  /** Oggetti comuni (macro "Oggetti Comuni"): ogni elemento è una stringa (le righe successive alla prima sono dettagli) */
  function generaOggettiComuni(n, rng) {
    rng = rng || Math.random;
    const out = [];
    for (let k = 0; k < Math.min(n, MAX_COMUNI); k++) {
      let c = pescaTabella('Oggetti Comuni', rng);
      if (c === null) { out.push('(tabelle non disponibili)'); continue; }
      if (eqs(c, 'Strumento O Equipaggiamento')) { const v = pescaTabella('Strumenti O Equipaggiamenti', rng); if (v !== null) c = v; }
      if (eqs(c, 'Armatura')) { out.push(generaArmatura(rng)); continue; }
      if (eqs(c, 'Scudo')) { out.push(generaScudo(rng)); continue; }
      if (eqs(c, 'Arma')) { out.push(generaArma(rng)); continue; }
      let nome = c;
      if (eqs(c, 'Strumento Musicale Comune') || eqs(c, 'Strumento Musicale Perfetto')) {
        const m = pescaTabella('Oggetti Arte Casuali Strumento Musicale', rng);
        nome = (m === null ? c : m) + ' (' + c + ')';
      }
      out.push(espandiDadi(risolvi(nome, rng), rng));
    }
    return out;
  }

  // ---- Oggetti magici minori: per ora sempre armi ----
  const MAX_MINORI = 30;
  const SOLO_ARMI_MINORI = true; // finché true, ogni oggetto magico minore è un'arma (si toglierà quando saranno pronte le altre categorie)
  const EM = '\u0001'; // delimita i tratti da mostrare in semigrassetto corsivo
  const norm = x => String(x).normalize('NFD').replace(/[\u0300-\u036f'’]/g, '').toLowerCase().trim();
  const bonusDi = x => { const m = /\(\+(\d+)\)\s*$/.exec(x); return m ? Number(m[1]) : 0; };

  /** Tira le abilità speciali di un'arma da una tabella, rispettando le regole:
   *  niente doppioni, "Tira Due Volte" (+2 al conteggio, il tiro conta), bonus totale (base + abilità) al massimo +10. */
  function tiraAbilita(tabella, base, quante, rng) {
    const scelte = [], viste = new Set();
    let totale = base, daTirare = quante, tentativi = 0;
    while (daTirare > 0 && totale < 10 && tentativi++ < 2000) {
      const r = pescaTabella(tabella, rng);
      if (r === null) break;
      daTirare--;
      const k = norm(r);
      if (k === 'tira due volte') { daTirare += 2; continue; }
      if (viste.has(k)) { daTirare++; continue; }           // doppione: ignorato e non conteggiato
      const b = bonusDi(r);
      if (totale + b > 10) { daTirare++; continue; }          // supererebbe +10: scartata
      viste.add(k); totale += b; scelte.push(r);
    }
    return scelte.map(r => {
      if (!/^anatema\b/i.test(r)) return r;
      const a = pescaTabella('Anatema Casuale', rng);
      return a === null ? r : r.replace(/^Anatema/i, a);
    });
  }

  /** Arma magica minore, tutto insieme (macro "Arma Minore Casuale" + tabelle delle abilità).
   *  Testo su più righe: la prima è il risultato (con tratti in EM...EM), le altre i dettagli. */
  function generaArmaMinore(rng) {
    rng = rng || Math.random;
    const d = f => Math.floor(rng() * f) + 1;
    const isArma = x => /^arma\s*\+(\d+)$/i.exec(String(x).trim());
    let r = pescaTabella('Arma Minore', rng);
    if (r === null) return '[tabella “Arma Minore” mancante]';
    let base = 0, quante = 0, specifica = null, guardia = 0;
    if (norm(r) === 'arma specifica') {
      let sp = pescaTabella('Arma Specifica Minore', rng) || '';
      if (/^freccia assassina/i.test(sp)) { // la macro originale non arrivava mai a questa tabella: qui sì
        const f = pescaTabella('Freccia Assassina', rng);
        const prezzo = /\(([^)]*MO)\)\s*$/.exec(sp);
        if (f !== null) sp = f + (prezzo ? ' (' + prezzo[1] + ')' : '');
      }
      specifica = sp;
    } else if (isArma(r)) {
      base = Number(isArma(r)[1]);
    } else { // Abilità speciale e ritira: si ritira finché non esce "Arma +n" (le armi specifiche si ignorano)
      quante = 1;
      while (guardia++ < 1000) {
        r = pescaTabella('Arma Minore', rng);
        if (norm(r) === 'abilita speciale e ritira') { quante++; continue; }
        const m = isArma(r);
        if (m) { base = Number(m[1]); break; }
      }
      if (!base) base = 1;
    }
    let principale, freccia = false;
    if (specifica !== null) {
      freccia = /^freccia assassina/i.test(specifica);
      principale = EM + specifica + EM;
    } else {
      const tipo = pescaTabella('Arma Casuale', rng) || 'Arma';
      const m = /^(.*?)(\s*\([^)]*\))?$/.exec(risolvi(tipo, rng)); // il bonus va prima di una parentesi finale: "Frecce +2 (20)"
      let testo = EM + m[1] + ' +' + base + EM + (m[2] || '');
      if (quante > 0) {
        const mis = tiraAbilita('Abilita Arma Minore Mischia', base, quante, rng);
        const dis = tiraAbilita('Abilita Arma Minore Distanza', base, quante, rng);
        if (mis.length) testo += '; se arma da mischia: ' + EM + mis.join(', ') + EM;
        if (dis.length) testo += '; se arma a distanza: ' + EM + dis.join(', ') + EM;
      }
      principale = testo;
    }
    // materiali, qualità speciali e maledizione, come nella macro
    const metallo = materialeMetallo(d(100));
    const legno = d(100) >= 96 ? 'Legnoscuro' : 'Comune';
    const q = [];
    if (d(100) <= 5) q.push('Intelligente');
    if (d(100) <= 30) q.push('Emana Luce');
    if (d(100) <= 10) q.push('Disegno, Iscrizione o Runa');
    const qual = (q.length && !freccia) ? q.join(', più ') : 'Nessuna';
    let det = 'Metallo: ' + metallo + '; Legno: ' + legno + '; Qualità speciali: ' + qual;
    if (d(100) <= 5) det += '\n' + EM + 'Oggetto maledetto' + EM;
    return principale + '\n' + det;
  }

  function generaOggettiMinori(n, rng) {
    rng = rng || Math.random;
    const out = [];
    for (let k = 0; k < Math.min(n, MAX_MINORI); k++) {
      if (SOLO_ARMI_MINORI) { out.push(generaArmaMinore(rng)); continue; }
      const c = pescaTabella('Oggetti Magici Minori', rng);
      out.push(norm(c) === 'arma' ? generaArmaMinore(rng) : '(' + c + ')'); // altre categorie: in arrivo
    }
    return out;
  }

  const API = { generaTesoro, generaOggettiMinori, generaArmaMinore, tiraAbilita, MAX_MINORI, EM, generaOggettiComuni, generaArma, generaArmatura, generaScudo, espandiDadi, MAX_COMUNI, generaPersonalizzato, generaGemme, generaOggettiArte, riepilogo, risolvi, MAX_GEMME, MAX_ARTE, interpretaGS, scalaGS, esperienzaPerGS, valoreTesoroPerGS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.DragonsHoard = Object.assign(root.DragonsHoard || {}, API);
})(typeof window !== 'undefined' ? window : globalThis);
