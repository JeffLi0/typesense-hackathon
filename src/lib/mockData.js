/**
 * DUMMY DATA — placeholder until the Python backend is wired up.
 *
 * Nothing else in the app imports this file; `api.js` swaps it out the moment
 * VITE_API_BASE_URL is set. Prices/pharmacies below are illustrative, not real
 * GoodRx quotes.
 */

const CONDITIONS = [
  {
    id: 'strep-throat',
    name: 'Strep Throat',
    summary:
      'A bacterial throat infection caused by group A Streptococcus. Usually resolves with antibiotics within 10 days.',
    symptoms: [
      'Sore throat',
      'Fever',
      'Swollen lymph nodes',
      'Painful swallowing',
      'White patches on tonsils',
      'Headache',
    ],
    treatments: [
      'Antibiotic course',
      'Rest',
      'Warm saltwater gargles',
      'Fluids',
      'Pain relief',
    ],
    medications: [
      {
        name: 'Amoxicillin',
        form: '500mg capsule · 20 capsules',
        otc: false,
        note: 'Typical 10-day course. Finish the full course.',
        goodrx: {
          url: 'https://www.goodrx.com/amoxicillin',
          lowestPrice: 8.42,
          pharmacies: [
            { name: 'Costco Pharmacy', price: 8.42, distanceMi: 2.1, address: '1900 S Coast Hwy' },
            { name: 'CVS Pharmacy', price: 11.28, distanceMi: 0.4, address: '450 Market St' },
            { name: 'Walgreens', price: 14.95, distanceMi: 0.9, address: '1201 Broadway' },
          ],
        },
      },
      {
        name: 'Ibuprofen',
        form: '200mg tablet · 50 tablets',
        otc: true,
        note: 'For throat pain and fever.',
        goodrx: {
          url: 'https://www.goodrx.com/ibuprofen',
          lowestPrice: 4.12,
          pharmacies: [
            { name: 'Walmart Pharmacy', price: 4.12, distanceMi: 3.4, address: '2200 Retail Dr' },
            { name: 'Rite Aid', price: 6.5, distanceMi: 1.2, address: '88 Elm Ave' },
          ],
        },
      },
    ],
  },
  {
    id: 'influenza',
    name: 'Influenza (Flu)',
    summary:
      'A contagious respiratory illness caused by influenza viruses. Symptoms come on suddenly and peak within 2–4 days.',
    symptoms: [
      'Fever',
      'Chills',
      'Body aches',
      'Fatigue',
      'Dry cough',
      'Headache',
      'Sore throat',
    ],
    treatments: [
      'Rest',
      'Fluids',
      'Antiviral medication (within 48h)',
      'Fever control',
      'Isolation until fever-free 24h',
    ],
    medications: [
      {
        name: 'Oseltamivir (Tamiflu)',
        form: '75mg capsule · 10 capsules',
        otc: false,
        note: 'Most effective within 48 hours of symptom onset.',
        goodrx: {
          url: 'https://www.goodrx.com/oseltamivir',
          lowestPrice: 24.6,
          pharmacies: [
            { name: 'Costco Pharmacy', price: 24.6, distanceMi: 2.1, address: '1900 S Coast Hwy' },
            { name: 'Kroger Pharmacy', price: 31.4, distanceMi: 1.8, address: '640 Grand Ave' },
            { name: 'CVS Pharmacy', price: 52.18, distanceMi: 0.4, address: '450 Market St' },
          ],
        },
      },
      {
        name: 'Acetaminophen',
        form: '500mg tablet · 100 tablets',
        otc: true,
        note: 'For fever and aches.',
        goodrx: {
          url: 'https://www.goodrx.com/acetaminophen',
          lowestPrice: 3.88,
          pharmacies: [
            { name: 'Walmart Pharmacy', price: 3.88, distanceMi: 3.4, address: '2200 Retail Dr' },
            { name: 'Walgreens', price: 7.99, distanceMi: 0.9, address: '1201 Broadway' },
          ],
        },
      },
    ],
  },
  {
    id: 'migraine',
    name: 'Migraine',
    summary:
      'A recurring neurological headache disorder, often one-sided and throbbing, frequently with sensory sensitivity.',
    symptoms: [
      'Headache',
      'Nausea',
      'Sensitivity to light',
      'Sensitivity to sound',
      'Visual aura',
      'Dizziness',
    ],
    treatments: [
      'Dark, quiet room',
      'Abortive medication at onset',
      'Cold compress',
      'Trigger avoidance',
      'Preventive therapy if frequent',
    ],
    medications: [
      {
        name: 'Sumatriptan',
        form: '50mg tablet · 9 tablets',
        otc: false,
        note: 'Take at the first sign of a migraine.',
        goodrx: {
          url: 'https://www.goodrx.com/sumatriptan',
          lowestPrice: 9.75,
          pharmacies: [
            { name: 'Kroger Pharmacy', price: 9.75, distanceMi: 1.8, address: '640 Grand Ave' },
            { name: 'Costco Pharmacy', price: 12.3, distanceMi: 2.1, address: '1900 S Coast Hwy' },
            { name: 'Walgreens', price: 28.4, distanceMi: 0.9, address: '1201 Broadway' },
          ],
        },
      },
      {
        name: 'Naproxen',
        form: '220mg tablet · 60 tablets',
        otc: true,
        note: 'NSAID; can help mild to moderate attacks.',
        goodrx: {
          url: 'https://www.goodrx.com/naproxen',
          lowestPrice: 5.4,
          pharmacies: [
            { name: 'Walmart Pharmacy', price: 5.4, distanceMi: 3.4, address: '2200 Retail Dr' },
            { name: 'CVS Pharmacy', price: 9.1, distanceMi: 0.4, address: '450 Market St' },
          ],
        },
      },
    ],
  },
  {
    id: 'gerd',
    name: 'Acid Reflux (GERD)',
    summary:
      'Stomach acid flowing back into the esophagus, causing burning discomfort — often worse after meals or lying down.',
    symptoms: [
      'Heartburn',
      'Chest pain',
      'Regurgitation',
      'Painful swallowing',
      'Chronic cough',
      'Sore throat',
    ],
    treatments: [
      'Acid-suppressing medication',
      'Smaller meals',
      'Avoid eating within 3h of lying down',
      'Raise the head of the bed',
      'Weight management',
    ],
    medications: [
      {
        name: 'Omeprazole',
        form: '20mg capsule · 30 capsules',
        otc: true,
        note: 'Proton pump inhibitor. Take before breakfast.',
        goodrx: {
          url: 'https://www.goodrx.com/omeprazole',
          lowestPrice: 6.15,
          pharmacies: [
            { name: 'Costco Pharmacy', price: 6.15, distanceMi: 2.1, address: '1900 S Coast Hwy' },
            { name: 'Walmart Pharmacy', price: 8.0, distanceMi: 3.4, address: '2200 Retail Dr' },
            { name: 'Rite Aid', price: 15.25, distanceMi: 1.2, address: '88 Elm Ave' },
          ],
        },
      },
      {
        name: 'Famotidine',
        form: '20mg tablet · 30 tablets',
        otc: true,
        note: 'H2 blocker for faster, shorter-acting relief.',
        goodrx: {
          url: 'https://www.goodrx.com/famotidine',
          lowestPrice: 4.6,
          pharmacies: [
            { name: 'Kroger Pharmacy', price: 4.6, distanceMi: 1.8, address: '640 Grand Ave' },
            { name: 'Walgreens', price: 10.2, distanceMi: 0.9, address: '1201 Broadway' },
          ],
        },
      },
    ],
  },
  {
    id: 'allergic-rhinitis',
    name: 'Allergic Rhinitis (Hay Fever)',
    summary:
      'An allergic reaction to airborne triggers like pollen or dust, inflaming the nasal passages.',
    symptoms: [
      'Sneezing',
      'Runny nose',
      'Nasal congestion',
      'Itchy eyes',
      'Watery eyes',
      'Sore throat',
      'Fatigue',
    ],
    treatments: [
      'Antihistamines',
      'Nasal steroid spray',
      'Allergen avoidance',
      'Saline nasal rinse',
      'Immunotherapy for persistent cases',
    ],
    medications: [
      {
        name: 'Cetirizine',
        form: '10mg tablet · 30 tablets',
        otc: true,
        note: 'Once-daily antihistamine.',
        goodrx: {
          url: 'https://www.goodrx.com/cetirizine',
          lowestPrice: 4.25,
          pharmacies: [
            { name: 'Walmart Pharmacy', price: 4.25, distanceMi: 3.4, address: '2200 Retail Dr' },
            { name: 'CVS Pharmacy', price: 8.99, distanceMi: 0.4, address: '450 Market St' },
          ],
        },
      },
      {
        name: 'Fluticasone nasal spray',
        form: '50mcg · 16g bottle',
        otc: true,
        note: 'Steroid spray; takes a few days for full effect.',
        goodrx: {
          url: 'https://www.goodrx.com/fluticasone',
          lowestPrice: 11.4,
          pharmacies: [
            { name: 'Costco Pharmacy', price: 11.4, distanceMi: 2.1, address: '1900 S Coast Hwy' },
            { name: 'Walgreens', price: 19.75, distanceMi: 0.9, address: '1201 Broadway' },
          ],
        },
      },
    ],
  },
  {
    id: 'uti',
    name: 'Urinary Tract Infection',
    summary:
      'A bacterial infection of the bladder or urethra. Common and typically treated with a short antibiotic course.',
    symptoms: [
      'Burning urination',
      'Frequent urination',
      'Cloudy urine',
      'Pelvic pain',
      'Urgency',
      'Fever',
    ],
    treatments: [
      'Antibiotic course',
      'Increased fluid intake',
      'Urinary analgesic for discomfort',
      'Complete the full course',
    ],
    medications: [
      {
        name: 'Nitrofurantoin',
        form: '100mg capsule · 10 capsules',
        otc: false,
        note: '5-day course is standard for uncomplicated UTI.',
        goodrx: {
          url: 'https://www.goodrx.com/nitrofurantoin',
          lowestPrice: 14.8,
          pharmacies: [
            { name: 'Kroger Pharmacy', price: 14.8, distanceMi: 1.8, address: '640 Grand Ave' },
            { name: 'Costco Pharmacy', price: 17.2, distanceMi: 2.1, address: '1900 S Coast Hwy' },
            { name: 'CVS Pharmacy', price: 38.6, distanceMi: 0.4, address: '450 Market St' },
          ],
        },
      },
      {
        name: 'Phenazopyridine',
        form: '95mg tablet · 30 tablets',
        otc: true,
        note: 'Numbs urinary discomfort; does not treat the infection.',
        goodrx: {
          url: 'https://www.goodrx.com/phenazopyridine',
          lowestPrice: 7.3,
          pharmacies: [
            { name: 'Walmart Pharmacy', price: 7.3, distanceMi: 3.4, address: '2200 Retail Dr' },
            { name: 'Rite Aid', price: 12.4, distanceMi: 1.2, address: '88 Elm Ave' },
          ],
        },
      },
    ],
  },
  {
    id: 'common-cold',
    name: 'Common Cold',
    summary:
      'A mild viral upper respiratory infection. Symptoms build over a couple of days and clear on their own within a week.',
    symptoms: [
      'Runny nose',
      'Nasal congestion',
      'Sneezing',
      'Sore throat',
      'Cough',
      'Mild fatigue',
    ],
    treatments: [
      'Rest',
      'Fluids',
      'Symptom relief only',
      'Humidified air',
      'Resolves in 7-10 days without treatment',
    ],
    medications: [
      {
        name: 'Pseudoephedrine',
        form: '30mg tablet · 24 tablets',
        otc: true,
        note: 'Decongestant. Kept behind the pharmacy counter.',
        goodrx: {
          url: 'https://www.goodrx.com/pseudoephedrine',
          lowestPrice: 5.95,
          pharmacies: [
            { name: 'Walgreens', price: 5.95, distanceMi: 0.9, address: '1201 Broadway' },
            { name: 'CVS Pharmacy', price: 8.49, distanceMi: 0.4, address: '450 Market St' },
          ],
        },
      },
      {
        name: 'Dextromethorphan',
        form: '15mg/5mL syrup · 118mL',
        otc: true,
        note: 'Cough suppressant.',
        goodrx: {
          url: 'https://www.goodrx.com/dextromethorphan',
          lowestPrice: 6.2,
          pharmacies: [
            { name: 'Walmart Pharmacy', price: 6.2, distanceMi: 3.4, address: '2200 Retail Dr' },
            { name: 'Kroger Pharmacy', price: 8.75, distanceMi: 1.8, address: '640 Grand Ave' },
          ],
        },
      },
    ],
  },
  {
    id: 'asthma',
    name: 'Asthma',
    summary:
      'Chronic inflammation and narrowing of the airways, causing episodic breathing difficulty.',
    symptoms: [
      'Shortness of breath',
      'Wheezing',
      'Chest tightness',
      'Cough',
      'Trouble sleeping',
    ],
    treatments: [
      'Rescue inhaler for attacks',
      'Daily controller inhaler',
      'Trigger avoidance',
      'Written asthma action plan',
      'Spirometry follow-up',
    ],
    medications: [
      {
        name: 'Albuterol inhaler',
        form: '90mcg · 200 doses',
        otc: false,
        note: 'Rescue inhaler for acute symptoms.',
        goodrx: {
          url: 'https://www.goodrx.com/albuterol',
          lowestPrice: 19.5,
          pharmacies: [
            { name: 'Costco Pharmacy', price: 19.5, distanceMi: 2.1, address: '1900 S Coast Hwy' },
            { name: 'Walmart Pharmacy', price: 24.0, distanceMi: 3.4, address: '2200 Retail Dr' },
            { name: 'Walgreens', price: 43.9, distanceMi: 0.9, address: '1201 Broadway' },
          ],
        },
      },
      {
        name: 'Fluticasone inhaler',
        form: '110mcg · 120 doses',
        otc: false,
        note: 'Daily controller; not for acute attacks.',
        goodrx: {
          url: 'https://www.goodrx.com/fluticasone-hfa',
          lowestPrice: 38.2,
          pharmacies: [
            { name: 'Kroger Pharmacy', price: 38.2, distanceMi: 1.8, address: '640 Grand Ave' },
            { name: 'CVS Pharmacy', price: 74.5, distanceMi: 0.4, address: '450 Market St' },
          ],
        },
      },
    ],
  },
  {
    // Deliberate fixture for the common backend case: the symptom->disease
    // index knows this condition, but the disease->medication index has no row
    // for it. Treatments still come from the dataset.
    id: 'mononucleosis',
    name: 'Mononucleosis',
    summary:
      'A viral infection, usually Epstein-Barr, causing prolonged fatigue and swollen glands. There is no drug that treats it directly.',
    symptoms: [
      'Extreme fatigue',
      'Sore throat',
      'Swollen lymph nodes',
      'Fever',
      'Headache',
      'Enlarged spleen',
    ],
    treatments: [
      'Rest',
      'Fluids',
      'Avoid contact sports for 4 weeks',
      'Over-the-counter pain relief',
      'Recovery takes 2-4 weeks',
    ],
    medications: [],
  },
  {
    // Fixture for the opposite case: a condition with a long medication list,
    // which the UI collapses rather than burying the rest of the page.
    id: 'type-2-diabetes',
    name: 'Type 2 Diabetes',
    summary:
      'A long-term condition where the body resists insulin, raising blood sugar. Managed with lifestyle change and a wide range of medications.',
    symptoms: [
      'Frequent urination',
      'Excessive thirst',
      'Fatigue',
      'Blurred vision',
      'Slow-healing sores',
      'Unexplained weight loss',
      'Numbness in hands or feet',
    ],
    treatments: [
      'Blood glucose monitoring',
      'Dietary change',
      'Regular exercise',
      'Weight management',
      'Oral glucose-lowering medication',
      'Insulin if needed',
      'Annual eye and foot checks',
    ],
    medications: [
      {
        name: 'Metformin',
        form: '500mg tablet · 60 tablets',
        otc: false,
        note: 'First-line treatment. Take with food.',
        goodrx: {
          url: 'https://www.goodrx.com/metformin',
          lowestPrice: 4.0,
          pharmacies: [
            { name: 'Walmart Pharmacy', price: 4.0, distanceMi: 3.4, address: '2200 Retail Dr' },
            { name: 'Costco Pharmacy', price: 5.6, distanceMi: 2.1, address: '1900 S Coast Hwy' },
            { name: 'CVS Pharmacy', price: 16.4, distanceMi: 0.4, address: '450 Market St' },
          ],
        },
      },
      {
        name: 'Glipizide',
        form: '5mg tablet · 60 tablets',
        otc: false,
        note: 'Sulfonylurea; can cause low blood sugar.',
        goodrx: {
          url: 'https://www.goodrx.com/glipizide',
          lowestPrice: 6.8,
          pharmacies: [
            { name: 'Kroger Pharmacy', price: 6.8, distanceMi: 1.8, address: '640 Grand Ave' },
            { name: 'Walgreens', price: 12.2, distanceMi: 0.9, address: '1201 Broadway' },
          ],
        },
      },
      {
        name: 'Sitagliptin (Januvia)',
        form: '100mg tablet · 30 tablets',
        otc: false,
        note: 'DPP-4 inhibitor. Brand-name pricing.',
        goodrx: {
          url: 'https://www.goodrx.com/sitagliptin',
          lowestPrice: 312.4,
          pharmacies: [
            { name: 'Costco Pharmacy', price: 312.4, distanceMi: 2.1, address: '1900 S Coast Hwy' },
            { name: 'CVS Pharmacy', price: 389.9, distanceMi: 0.4, address: '450 Market St' },
          ],
        },
      },
      {
        name: 'Empagliflozin (Jardiance)',
        form: '10mg tablet · 30 tablets',
        otc: false,
        note: 'SGLT2 inhibitor; also protects the heart and kidneys.',
        goodrx: {
          url: 'https://www.goodrx.com/empagliflozin',
          lowestPrice: 548.0,
          pharmacies: [
            { name: 'Kroger Pharmacy', price: 548.0, distanceMi: 1.8, address: '640 Grand Ave' },
            { name: 'Walgreens', price: 611.3, distanceMi: 0.9, address: '1201 Broadway' },
          ],
        },
      },
      {
        name: 'Insulin glargine (Lantus)',
        form: '100 units/mL · 10mL vial',
        otc: false,
        note: 'Long-acting basal insulin.',
        goodrx: {
          url: 'https://www.goodrx.com/insulin-glargine',
          lowestPrice: 34.5,
          pharmacies: [
            { name: 'Walmart Pharmacy', price: 34.5, distanceMi: 3.4, address: '2200 Retail Dr' },
            { name: 'Costco Pharmacy', price: 41.2, distanceMi: 2.1, address: '1900 S Coast Hwy' },
          ],
        },
      },
      {
        name: 'Pioglitazone',
        form: '30mg tablet · 30 tablets',
        otc: false,
        note: 'Thiazolidinedione. Watch for fluid retention.',
        goodrx: {
          url: 'https://www.goodrx.com/pioglitazone',
          lowestPrice: 9.15,
          pharmacies: [
            { name: 'Costco Pharmacy', price: 9.15, distanceMi: 2.1, address: '1900 S Coast Hwy' },
            { name: 'Rite Aid', price: 18.4, distanceMi: 1.2, address: '88 Elm Ave' },
          ],
        },
      },
      {
        name: 'Glimepiride',
        form: '2mg tablet · 30 tablets',
        otc: false,
        note: 'Sulfonylurea alternative to glipizide.',
        goodrx: {
          url: 'https://www.goodrx.com/glimepiride',
          lowestPrice: 5.25,
          pharmacies: [
            { name: 'Kroger Pharmacy', price: 5.25, distanceMi: 1.8, address: '640 Grand Ave' },
            { name: 'CVS Pharmacy', price: 11.8, distanceMi: 0.4, address: '450 Market St' },
          ],
        },
      },
      {
        name: 'Liraglutide (Victoza)',
        form: '18mg/3mL pen · 2 pens',
        otc: false,
        note: 'GLP-1 injection, taken once daily.',
        goodrx: {
          url: 'https://www.goodrx.com/liraglutide',
          lowestPrice: 489.6,
          pharmacies: [
            { name: 'Walgreens', price: 489.6, distanceMi: 0.9, address: '1201 Broadway' },
          ],
        },
      },
      {
        name: 'Acarbose',
        form: '50mg tablet · 90 tablets',
        otc: false,
        note: 'Taken with the first bite of each meal.',
        goodrx: {
          url: 'https://www.goodrx.com/acarbose',
          lowestPrice: 21.9,
          pharmacies: [
            { name: 'Costco Pharmacy', price: 21.9, distanceMi: 2.1, address: '1900 S Coast Hwy' },
            { name: 'Walmart Pharmacy', price: 26.4, distanceMi: 3.4, address: '2200 Retail Dr' },
          ],
        },
      },
      {
        name: 'Repaglinide',
        form: '1mg tablet · 90 tablets',
        otc: false,
        note: 'Short-acting; skip the dose if you skip the meal.',
        goodrx: {
          url: 'https://www.goodrx.com/repaglinide',
          lowestPrice: 28.7,
          pharmacies: [
            { name: 'Kroger Pharmacy', price: 28.7, distanceMi: 1.8, address: '640 Grand Ave' },
          ],
        },
      },
      {
        // No GoodRx row — exercises the medication-without-pricing path.
        name: 'Insulin aspart (NovoLog)',
        form: '100 units/mL · 10mL vial',
        otc: false,
        note: 'Rapid-acting insulin taken with meals.',
        goodrx: null,
      },
      {
        name: 'Atorvastatin',
        form: '20mg tablet · 30 tablets',
        otc: false,
        note: 'Commonly co-prescribed to lower cardiovascular risk.',
        goodrx: {
          url: 'https://www.goodrx.com/atorvastatin',
          lowestPrice: 4.85,
          pharmacies: [
            { name: 'Walmart Pharmacy', price: 4.85, distanceMi: 3.4, address: '2200 Retail Dr' },
            { name: 'Walgreens', price: 13.5, distanceMi: 0.9, address: '1201 Broadway' },
          ],
        },
      },
    ],
  },
];

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'the', 'my', 'i', 'have', 'has', 'is', 'am', 'of', 'with',
  'feeling', 'feel', 'some', 'lot', 'really', 'very', 'bad', 'in', 'on', 'to',
  'it', 'me', 'been', 'for', 'got', 'get', 'having',
]);

const tokenize = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

/**
 * Naive keyword overlap — stands in for whatever the backend does (Typesense
 * search + ranking). Returns the same shape as the real endpoint.
 *
 * @param {string[]} symptomList
 */
export function mockDiagnose(symptomList) {
  const words = tokenize(symptomList.join(' '));

  const scored = CONDITIONS.map((c) => {
    const matched = c.symptoms.filter((symptom) => {
      const symptomWords = tokenize(symptom);
      return words.some((w) => symptomWords.some((sw) => sw.includes(w) || w.includes(sw)));
    });
    return { condition: c, matched };
  })
    .filter((r) => r.matched.length > 0)
    .sort((a, b) => b.matched.length - a.matched.length);

  // Nothing recognizable typed — show a few conditions anyway so the demo
  // always has something on screen.
  const rows = scored.length
    ? scored
    : CONDITIONS.slice(0, 3).map((c) => ({ condition: c, matched: [] }));

  // How much of the top candidate's symptom list the user actually hit. Gives a
  // confident single answer when the match is clean, and a spread of
  // possibilities when it isn't — which is what drives the hero takeover.
  const best = rows[0].matched.length;

  const results = rows.slice(0, 5).map(({ condition, matched }) => {
    const coverage = matched.length / Math.max(condition.symptoms.length, 1);
    const share = best ? matched.length / best : 0;
    return {
      ...condition,
      matchedSymptoms: matched,
      confidence: matched.length
        ? Math.min(0.97, 0.45 * share + 0.75 * coverage + 0.12 * (matched.length - 1))
        : 0.2,
    };
  });

  results.sort((a, b) => b.confidence - a.confidence);

  // Typesense routinely answers in single-digit milliseconds; mimic that for
  // the demo, and add a little separate "network" delay so the loading state
  // is actually visible.
  const searchTimeMs = Math.round((2 + Math.random() * 6) * 10) / 10;

  return new Promise((resolve) =>
    setTimeout(() => resolve({ results, searchTimeMs }), 260)
  );
}
