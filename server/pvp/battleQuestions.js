// Super Specialty PvP Battle Questions — 30 questions across 12 specialties

export const battleQuestions = [
    // CARDIOLOGY
    {
        id: 'ss_pvp_001',
        question: 'Drug of choice for rate control in atrial fibrillation with HFrEF?',
        options: ['Diltiazem', 'Verapamil', 'Bisoprolol', 'Digoxin'],
        correct: 2,
        subject: 'Cardiology',
        explanation: 'Beta-blockers (bisoprolol, metoprolol, carvedilol) are preferred for rate control in AF with HFrEF. CCBs are contraindicated in reduced EF. Digoxin is second-line.',
        reference: "ESC Guidelines 2024, AF Management"
    },
    {
        id: 'ss_pvp_002',
        question: 'TIMI risk score is used for:',
        options: ['STEMI only', 'UA/NSTEMI', 'Heart failure', 'Pulmonary embolism'],
        correct: 1,
        subject: 'Cardiology',
        explanation: 'TIMI risk score stratifies patients with UA/NSTEMI. GRACE score is also used for ACS. For PE, Wells and Geneva scores are used.',
        reference: "Braunwald's Heart Disease, 12th Ed."
    },
    {
        id: 'ss_pvp_003',
        question: 'Target LDL in very high CV risk patient is:',
        options: ['<100 mg/dL', '<70 mg/dL', '<55 mg/dL', '<40 mg/dL'],
        correct: 2,
        subject: 'Cardiology',
        explanation: 'ESC 2021 guidelines recommend LDL <55 mg/dL for very high-risk patients (prior CVD, DM with TOD). For extreme risk, <40 mg/dL may be considered.',
        reference: "ESC Dyslipidemia Guidelines 2021"
    },
    // NEUROLOGY
    {
        id: 'ss_pvp_004',
        question: 'Window period for IV thrombolysis in acute ischemic stroke:',
        options: ['3 hours', '4.5 hours', '6 hours', '24 hours'],
        correct: 1,
        subject: 'Neurology',
        explanation: 'IV alteplase can be given within 4.5 hours of symptom onset. Mechanical thrombectomy extends to 24h in selected patients with salvageable tissue.',
        reference: "AHA/ASA Stroke Guidelines 2023"
    },
    {
        id: 'ss_pvp_005',
        question: 'Most common cause of SAH is:',
        options: ['AVM rupture', 'Trauma', 'Berry aneurysm rupture', 'Hypertensive bleed'],
        correct: 2,
        subject: 'Neurology',
        explanation: 'Ruptured saccular (berry) aneurysms cause ~85% of spontaneous SAH. Most occur at circle of Willis bifurcations, especially AComm.',
        reference: "Adams & Victor's Neurology, 11th Ed."
    },
    {
        id: 'ss_pvp_006',
        question: 'CSF finding in bacterial meningitis:',
        options: ['Low protein, high glucose', 'High protein, low glucose', 'Normal protein and glucose', 'High protein, high glucose'],
        correct: 1,
        subject: 'Neurology',
        explanation: 'Bacterial meningitis shows PMN pleocytosis, elevated protein (>100 mg/dL), and low glucose (<40 mg/dL or CSF:serum <0.4). Opens under high pressure.',
        reference: "Harrison's Neurology, 4th Ed."
    },
    // GASTROENTEROLOGY
    {
        id: 'ss_pvp_007',
        question: 'Barcelona staging is used for:',
        options: ['Colorectal cancer', 'Hepatocellular carcinoma', 'Pancreatic cancer', 'Gastric cancer'],
        correct: 1,
        subject: 'Gastroenterology',
        explanation: 'BCLC (Barcelona Clinic Liver Cancer) staging incorporates tumor burden, liver function (Child-Pugh), and performance status to guide HCC treatment.',
        reference: "EASL-EORTC HCC Guidelines"
    },
    {
        id: 'ss_pvp_008',
        question: 'Capsule endoscopy is contraindicated in:',
        options: ['Crohn\'s disease', 'GI bleeding', 'Suspected stricture', 'Celiac disease'],
        correct: 2,
        subject: 'Gastroenterology',
        explanation: 'Capsule endoscopy is contraindicated in known/suspected strictures due to risk of retention. Patency capsule can be used to assess beforehand.',
        reference: "ASGE Guidelines 2023"
    },
    {
        id: 'ss_pvp_009',
        question: 'First-line treatment for Helicobacter pylori:',
        options: ['PPI + Amoxicillin + Metronidazole', 'Bismuth quadruple therapy', 'PPI + Amoxicillin + Clarithromycin', 'PPI + Levofloxacin + Amoxicillin'],
        correct: 2,
        subject: 'Gastroenterology',
        explanation: 'PPI-based triple therapy (PPI + Amox + Clarithro) for 14 days is standard first-line where clarithromycin resistance is <15%.',
        reference: "ACG Clinical Guidelines 2023"
    },
    // NEPHROLOGY
    {
        id: 'ss_pvp_010',
        question: 'Target BP in diabetic nephropathy:',
        options: ['<140/90 mmHg', '<130/80 mmHg', '<120/80 mmHg', '<110/70 mmHg'],
        correct: 1,
        subject: 'Nephrology',
        explanation: 'KDIGO 2021 recommends BP <130/80 in adults with diabetes and CKD. ACEi/ARBs are first-line for their renoprotective effects.',
        reference: "KDIGO CKD Guidelines 2021"
    },
    {
        id: 'ss_pvp_011',
        question: 'Calcineurin inhibitor nephrotoxicity causes:',
        options: ['Membranous nephropathy', 'Thrombotic microangiopathy', 'IgA nephropathy', 'Minimal change disease'],
        correct: 1,
        subject: 'Nephrology',
        explanation: 'CNIs (tacrolimus, cyclosporine) can cause TMA with arteriolar hyalinosis and thrombosis. Also cause chronic tubulointerstitial fibrosis.',
        reference: "Brenner & Rector's The Kidney, 11th Ed."
    },
    {
        id: 'ss_pvp_012',
        question: 'Indication for urgent dialysis:',
        options: ['GFR 10 mL/min asymptomatic', 'Refractory hyperkalemia', 'Serum creatinine 8 mg/dL', 'Mild metabolic acidosis'],
        correct: 1,
        subject: 'Nephrology',
        explanation: 'Urgent dialysis indications: refractory hyperkalemia, severe metabolic acidosis, uremic encephalopathy/pericarditis, volume overload, toxins (AEIOU).',
        reference: "KDIGO AKI Guidelines"
    },
    // PULMONOLOGY
    {
        id: 'ss_pvp_013',
        question: 'GOLD criteria for COPD diagnosis requires:',
        options: ['FEV1/FVC <70% pre-bronchodilator', 'FEV1/FVC <70% post-bronchodilator', 'FEV1 <80% predicted', 'Peak flow <70% predicted'],
        correct: 1,
        subject: 'Pulmonology',
        explanation: 'COPD is defined by persistent airflow limitation with FEV1/FVC <0.70 after bronchodilator. Severity is graded by FEV1 % predicted.',
        reference: "GOLD Report 2024"
    },
    {
        id: 'ss_pvp_014',
        question: 'First-line treatment for idiopathic pulmonary fibrosis:',
        options: ['Prednisone', 'Azathioprine', 'Pirfenidone', 'Cyclophosphamide'],
        correct: 2,
        subject: 'Pulmonology',
        explanation: 'Antifibrotics (pirfenidone and nintedanib) slow FVC decline in IPF. Immunosuppressants are harmful in IPF, unlike other ILDs.',
        reference: "ATS/ERS IPF Guidelines 2022"
    },
    // ONCOLOGY
    {
        id: 'ss_pvp_015',
        question: 'Tumor marker for monitoring colon cancer:',
        options: ['CA 19-9', 'CEA', 'AFP', 'CA 125'],
        correct: 1,
        subject: 'Medical Oncology',
        explanation: 'CEA is used for post-treatment surveillance in colorectal cancer. Rising CEA may indicate recurrence. CA 19-9 is for pancreatic cancer.',
        reference: "NCCN Guidelines 2024"
    },
    {
        id: 'ss_pvp_016',
        question: 'BRCA mutation is associated with increased risk of:',
        options: ['Lung cancer', 'Ovarian and breast cancer', 'Gastric cancer', 'Thyroid cancer'],
        correct: 1,
        subject: 'Medical Oncology',
        explanation: 'BRCA1/2 mutations increase lifetime risk of breast (45-65%) and ovarian (10-40%) cancers. Also associated with prostate and pancreatic cancer.',
        reference: "NCCN Genetic/Familial High-Risk Assessment"
    },
    // ENDOCRINOLOGY
    {
        id: 'ss_pvp_017',
        question: 'First-line drug for type 2 diabetes with HbA1c 8%:',
        options: ['Glimepiride', 'Metformin', 'Insulin', 'Sitagliptin'],
        correct: 1,
        subject: 'Endocrinology',
        explanation: 'Metformin is first-line for T2DM regardless of HbA1c. SGLT2i or GLP-1RA added if ASCVD, HF, or CKD present.',
        reference: "ADA Standards of Care 2024"
    },
    {
        id: 'ss_pvp_018',
        question: 'Target TSH in differentiated thyroid cancer post-thyroidectomy:',
        options: ['0.5-2 mIU/L', '<0.1 mIU/L', '2-4 mIU/L', '0.5-1 mIU/L'],
        correct: 1,
        subject: 'Endocrinology',
        explanation: 'Initial TSH suppression to <0.1 mIU/L in high-risk DTC. After remission, target is relaxed based on risk stratification.',
        reference: "ATA Thyroid Cancer Guidelines 2015"
    },
    // RHEUMATOLOGY
    {
        id: 'ss_pvp_019',
        question: 'Anti-CCP antibody is specific for:',
        options: ['SLE', 'Rheumatoid arthritis', 'Psoriatic arthritis', 'Ankylosing spondylitis'],
        correct: 1,
        subject: 'Rheumatology',
        explanation: 'Anti-CCP has >95% specificity for RA and predicts erosive disease. Unlike RF, it rarely occurs in non-RA conditions.',
        reference: "Kelley & Firestein's Rheumatology, 11th Ed."
    },
    {
        id: 'ss_pvp_020',
        question: 'First-line DMARD for rheumatoid arthritis:',
        options: ['Hydroxychloroquine', 'Sulfasalazine', 'Methotrexate', 'Leflunomide'],
        correct: 2,
        subject: 'Rheumatology',
        explanation: 'Methotrexate is anchor DMARD for RA. Start 15-25 mg/week with folic acid. Add biologics (TNFi, IL-6i) if inadequate response.',
        reference: "ACR RA Guidelines 2021"
    },
    // HEMATOLOGY
    {
        id: 'ss_pvp_021',
        question: 'Philadelphia chromosome is seen in:',
        options: ['AML', 'ALL', 'CML', 'CLL'],
        correct: 2,
        subject: 'Hematology',
        explanation: 'Ph chromosome t(9;22) creating BCR-ABL1 is pathognomonic of CML. Also seen in 25% of adult ALL (poor prognosis).',
        reference: "Williams Hematology, 10th Ed."
    },
    {
        id: 'ss_pvp_022',
        question: 'Direct Coombs test detects:',
        options: ['Free antibodies in serum', 'Antibodies on RBC surface', 'Complement activation', 'Platelet antibodies'],
        correct: 1,
        subject: 'Hematology',
        explanation: 'DAT (direct Coombs) detects IgG/complement bound to RBCs. Positive in AIHA, HDN, and transfusion reactions. IAT detects serum antibodies.',
        reference: "AABB Technical Manual, 20th Ed."
    },
    // INFECTIOUS DISEASES
    {
        id: 'ss_pvp_023',
        question: 'ART should be initiated in HIV at what CD4 count?',
        options: ['<500 cells/\u00B5L', '<350 cells/\u00B5L', '<200 cells/\u00B5L', 'Any CD4 count'],
        correct: 3,
        subject: 'Infectious Diseases',
        explanation: 'WHO/DHHS recommend ART for all HIV+ individuals regardless of CD4 count (Treat All). Early ART improves outcomes and reduces transmission.',
        reference: "WHO HIV Guidelines 2021"
    },
    {
        id: 'ss_pvp_024',
        question: 'Drug of choice for MRSA skin infection:',
        options: ['Vancomycin IV', 'TMP-SMX oral', 'Ceftriaxone', 'Amoxicillin-clavulanate'],
        correct: 1,
        subject: 'Infectious Diseases',
        explanation: 'For uncomplicated CA-MRSA SSTIs, oral TMP-SMX or doxycycline is effective. Vancomycin IV is reserved for severe/invasive infections.',
        reference: "IDSA SSTI Guidelines 2014"
    },
    // CRITICAL CARE
    {
        id: 'ss_pvp_025',
        question: 'Target SpO2 in ARDS patients:',
        options: ['98-100%', '94-98%', '88-95%', '80-85%'],
        correct: 2,
        subject: 'Critical Care',
        explanation: 'Conservative oxygen targets (SpO2 88-95%, PaO2 55-80 mmHg) in ARDS. Hyperoxia may cause harm. ARDSNet protocol recommends low tidal volume.',
        reference: "ARDSNet Protocol"
    },
    {
        id: 'ss_pvp_026',
        question: 'Septic shock requires all EXCEPT:',
        options: ['Infection source', 'Vasopressor need despite fluid resuscitation', 'Lactate >2 mmol/L', 'Temperature >38.5\u00B0C'],
        correct: 3,
        subject: 'Critical Care',
        explanation: 'Septic shock = sepsis + vasopressor requirement + lactate >2 mmol/L despite adequate fluid resuscitation. Fever is common but not required.',
        reference: "Sepsis-3 Definitions (JAMA 2016)"
    },
    // NEONATOLOGY
    {
        id: 'ss_pvp_027',
        question: 'First-line surfactant administration route:',
        options: ['Aerosolized', 'Intratracheal via ETT', 'Nebulized', 'Intravenous'],
        correct: 1,
        subject: 'Neonatology',
        explanation: 'Surfactant is given intratracheally via ETT. INSURE (INtubate-SURfactant-Extubate) or LISA (Less Invasive Surfactant Administration) techniques preferred.',
        reference: "AAP Surfactant Guidelines"
    },
    {
        id: 'ss_pvp_028',
        question: 'Target SpO2 in preterm neonates:',
        options: ['98-100%', '95-99%', '91-95%', '85-90%'],
        correct: 2,
        subject: 'Neonatology',
        explanation: 'Target SpO2 91-95% in preterm infants to balance ROP risk (high O2) and mortality (low O2). Avoid hyperoxia and hypoxia.',
        reference: "SUPPORT Trial, AAP Guidelines"
    },
    {
        id: 'ss_pvp_029',
        question: 'Therapeutic hypothermia in HIE is started within:',
        options: ['1 hour', '6 hours', '12 hours', '24 hours'],
        correct: 1,
        subject: 'Neonatology',
        explanation: 'Therapeutic hypothermia (33.5\u00B0C for 72h) must be initiated within 6 hours of birth for moderate-severe HIE. Improves neurological outcomes.',
        reference: "AAP HIE Guidelines"
    },
    {
        id: 'ss_pvp_030',
        question: 'Exchange transfusion in neonatal hyperbilirubinemia is done at:',
        options: ['Bilirubin 10 mg/dL', 'Bilirubin 15 mg/dL', 'Near phototherapy threshold', 'Near exchange threshold on Bhutani nomogram'],
        correct: 3,
        subject: 'Neonatology',
        explanation: 'Exchange transfusion thresholds are plotted on AAP nomogram based on gestational age and risk factors. Immediate exchange if acute bilirubin encephalopathy.',
        reference: "AAP Hyperbilirubinemia Guidelines 2022"
    }
];
