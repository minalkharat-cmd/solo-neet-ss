// Clinical Cases Library for Clinical Reasoning Tutor
// Pre-built cases across super-specialties with step-by-step reasoning

const clinicalCases = [
    // ============ CARDIOLOGY ============
    {
        id: 'case_cardio_001',
        specialty: 'cardiology',
        difficulty: 'medium',
        title: '58-year-old male with acute chest pain',
        presentation: 'A 58-year-old male presents to the ED with crushing substernal chest pain radiating to the left arm for the past 2 hours. He has a history of hypertension, type 2 diabetes, and smokes 1 pack/day for 30 years. He took 2 sublingual nitroglycerin tablets without relief. He appears diaphoretic and anxious.',
        vitals: 'HR: 102, BP: 88/60, RR: 24, Temp: 98.6°F, SpO2: 94%',
        physicalExam: 'Diaphoretic, pale. S1/S2 present with new S3 gallop. Bibasilar crackles. JVP elevated at 10 cm. No murmurs. Peripheral pulses weak but equal.',
        labs: {
            'Troponin I': '8.5 ng/mL (normal <0.04)',
            'CK-MB': '45 U/L (normal <25)',
            'BNP': '890 pg/mL (normal <100)',
            'BMP': 'Na 138, K 4.2, Cr 1.1, Glucose 210'
        },
        imagingDescription: 'ECG shows ST elevation in leads II, III, aVF with reciprocal ST depression in I, aVL. Chest X-ray shows mild pulmonary congestion with cardiomegaly.',
        imagingModality: 'ECG',
        diagnosis: 'Acute Inferior STEMI with Cardiogenic Shock',
        keyFindings: ['ST elevation in II, III, aVF', 'Hypotension with elevated JVP', 'New S3 gallop', 'Elevated troponin'],
        differentials: ['Acute Inferior STEMI with Cardiogenic Shock', 'Aortic Dissection', 'Massive Pulmonary Embolism', 'Cardiac Tamponade'],
        teachingPoints: [
            'Inferior STEMI involves right coronary artery territory (leads II, III, aVF)',
            'Cardiogenic shock = hypotension + signs of poor perfusion despite adequate volume',
            'Door-to-balloon time target is <90 minutes for primary PCI',
            'Check right-sided ECG leads (V4R) to assess RV involvement'
        ],
        references: 'ACC/AHA STEMI Guidelines 2023',
        reasoningSteps: [
            { step: 'history', keyInsight: 'Crushing chest pain + risk factors (DM, HTN, smoking) = high suspicion for ACS' },
            { step: 'exam', keyInsight: 'Hypotension + S3 gallop + elevated JVP + crackles = cardiogenic shock' },
            { step: 'labs', keyInsight: 'Troponin 8.5 (massively elevated) confirms myocardial injury. BNP elevated = heart failure' },
            { step: 'imaging', keyInsight: 'ST elevation in inferior leads = inferior STEMI, likely RCA occlusion' },
            { step: 'synthesis', keyInsight: 'Inferior STEMI complicated by cardiogenic shock. Urgent PCI needed.' }
        ],
        xpReward: { excellent: 150, good: 100, fair: 75, poor: 50 }
    },

    // ============ NEUROLOGY ============
    {
        id: 'case_neuro_001',
        specialty: 'neurology',
        difficulty: 'medium',
        title: '67-year-old female with sudden-onset weakness',
        presentation: 'A 67-year-old female is brought to the ED by her family after sudden onset of right-sided weakness and difficulty speaking that began 90 minutes ago. She was eating breakfast when her right arm went limp and her speech became slurred. Past history includes atrial fibrillation (not on anticoagulation), hypertension, and hyperlipidemia.',
        vitals: 'HR: 92 irregular, BP: 178/96, RR: 16, Temp: 98.4°F, SpO2: 97%',
        physicalExam: 'Alert but with expressive aphasia. Right facial droop (lower face). Right upper extremity 1/5 strength, right lower extremity 3/5 strength. Left side 5/5. Right-sided neglect present. Irregular heart rhythm. NIHSS score: 14.',
        labs: {
            'CBC': 'Hb 13.2, WBC 8.1, Platelets 245K',
            'Coags': 'PT 12.1, INR 1.0, PTT 28',
            'BMP': 'Glucose 128, Na 140, K 3.9, Cr 0.9',
            'Lipid Panel': 'Total cholesterol 242, LDL 168'
        },
        imagingDescription: 'Non-contrast CT head: No hemorrhage or mass effect. CT angiography shows occlusion of the left middle cerebral artery (M1 segment). CT perfusion shows large ischemic penumbra with small infarct core.',
        imagingModality: 'CT',
        diagnosis: 'Acute Left MCA Ischemic Stroke (Cardioembolic)',
        keyFindings: ['Sudden onset (embolic pattern)', 'Atrial fibrillation without anticoagulation', 'Left MCA territory deficit', 'Large penumbra on CTP'],
        differentials: ['Acute Left MCA Ischemic Stroke', 'Hemorrhagic Stroke', 'Todd Paralysis post-seizure', 'Hypoglycemia'],
        teachingPoints: [
            'AF is the most common cause of cardioembolic stroke',
            'NIHSS ≥6 with large vessel occlusion → consider mechanical thrombectomy up to 24h',
            'IV alteplase within 4.5 hours + thrombectomy for LVO within 24h (if salvageable tissue)',
            'CHA2DS2-VASc score determines anticoagulation need in AF'
        ],
        references: 'AHA/ASA Acute Stroke Guidelines 2023',
        reasoningSteps: [
            { step: 'history', keyInsight: 'Sudden onset during activity + AF = likely cardioembolic stroke' },
            { step: 'exam', keyInsight: 'Expressive aphasia + right face/arm > leg weakness = left MCA territory' },
            { step: 'labs', keyInsight: 'Normal INR confirms not anticoagulated. Normal glucose rules out hypoglycemia.' },
            { step: 'imaging', keyInsight: 'CT clear (no hemorrhage). CTA shows M1 occlusion. Large penumbra = salvageable tissue.' },
            { step: 'synthesis', keyInsight: 'Within 4.5h window → IV tPA + emergent thrombectomy for M1 occlusion.' }
        ],
        xpReward: { excellent: 150, good: 100, fair: 75, poor: 50 }
    },

    // ============ GASTROENTEROLOGY ============
    {
        id: 'case_gastro_001',
        specialty: 'gastroenterology',
        difficulty: 'hard',
        title: '52-year-old male with hematemesis and jaundice',
        presentation: 'A 52-year-old male with a 20-year history of heavy alcohol use presents with 3 episodes of hematemesis (bright red blood, approximately 500ml total). He has noticed progressive abdominal distension and yellowing of eyes over the past month. He also reports dark stools for the past 3 days. He has had no prior endoscopy.',
        vitals: 'HR: 118, BP: 92/58, RR: 22, Temp: 99.1°F, SpO2: 95%',
        physicalExam: 'Jaundiced, cachectic male. Spider angiomata on chest. Caput medusae present. Tense ascites with positive shifting dullness. Splenomegaly palpable. Palmar erythema. No asterixis. Rectal exam shows melena.',
        labs: {
            'CBC': 'Hb 7.2 g/dL, WBC 11.5K, Platelets 68K',
            'LFTs': 'AST 128, ALT 65, ALP 180, Total bilirubin 6.8, Albumin 2.1',
            'Coags': 'INR 2.1, PT 24.5',
            'BMP': 'Na 128, K 3.6, Cr 1.8, BUN 42'
        },
        imagingDescription: 'Ultrasound shows shrunken, nodular liver with increased echogenicity consistent with cirrhosis. Portal vein diameter 16mm. Large volume ascites. Splenomegaly (18cm). No focal hepatic lesions.',
        imagingModality: 'Ultrasound',
        diagnosis: 'Acute Variceal Hemorrhage secondary to Decompensated Alcoholic Cirrhosis',
        keyFindings: ['Active hematemesis with hemodynamic instability', 'Signs of portal hypertension (ascites, splenomegaly, caput medusae)', 'Thrombocytopenia suggesting hypersplenism', 'Coagulopathy (INR 2.1) and low albumin'],
        differentials: ['Esophageal Variceal Hemorrhage', 'Peptic Ulcer Disease', 'Mallory-Weiss Tear', 'Gastric Cancer'],
        teachingPoints: [
            'Variceal bleeding accounts for 70% of UGI bleeds in cirrhotics',
            'Management: IV octreotide + antibiotics (ceftriaxone) + emergent EGD within 12h',
            'Restrictive transfusion (target Hb 7-8 in variceal bleed) reduces rebleeding',
            'Child-Pugh C cirrhosis has 50% 1-year mortality. TIPS if endoscopy fails'
        ],
        references: 'AASLD Practice Guidelines for Variceal Hemorrhage',
        reasoningSteps: [
            { step: 'history', keyInsight: '20 years heavy alcohol + hematemesis + ascites = likely variceal bleed from cirrhosis' },
            { step: 'exam', keyInsight: 'Spider angiomata, caput medusae, ascites, splenomegaly = portal hypertension' },
            { step: 'labs', keyInsight: 'Low Hb (acute bleed), low platelets (hypersplenism), high INR (synthetic failure), AST:ALT >2:1 (alcoholic liver disease)' },
            { step: 'imaging', keyInsight: 'Nodular liver + dilated portal vein + splenomegaly = cirrhosis with portal HTN' },
            { step: 'synthesis', keyInsight: 'Variceal hemorrhage in decompensated cirrhosis. Start octreotide, antibiotics, transfuse, emergent EGD.' }
        ],
        xpReward: { excellent: 200, good: 150, fair: 100, poor: 75 }
    },

    // ============ NEPHROLOGY ============
    {
        id: 'case_nephro_001',
        specialty: 'nephrology',
        difficulty: 'medium',
        title: '45-year-old female with facial swelling and frothy urine',
        presentation: 'A 45-year-old female presents with progressive facial puffiness and bilateral leg swelling for 2 weeks. She noticed her urine has become frothy. She has a 10-year history of poorly controlled type 2 diabetes (HbA1c 9.2%). She denies hematuria, fever, or recent infections. No NSAID use.',
        vitals: 'HR: 78, BP: 152/94, RR: 16, Temp: 98.2°F, SpO2: 98%',
        physicalExam: 'Periorbital edema bilaterally. Bilateral pitting edema to mid-thigh (3+). No rash or joint swelling. Fundoscopy shows background diabetic retinopathy. No costovertebral angle tenderness.',
        labs: {
            'BMP': 'Na 136, K 5.1, Cr 2.4 (baseline 1.2), BUN 38, Glucose 245',
            'Urinalysis': '3+ protein, no RBC, no WBC, oval fat bodies present',
            'Urine Protein:Creatinine Ratio': '5.2 g/g (nephrotic range >3.5)',
            'Albumin': '2.0 g/dL, Total protein 4.8',
            'Lipid Panel': 'Total cholesterol 342, LDL 240, Triglycerides 280',
            'HbA1c': '9.2%'
        },
        imagingDescription: 'Renal ultrasound shows kidneys bilaterally enlarged (13 cm each) with increased cortical echogenicity. No hydronephrosis or stones.',
        imagingModality: 'Ultrasound',
        diagnosis: 'Nephrotic Syndrome secondary to Diabetic Nephropathy',
        keyFindings: ['Nephrotic-range proteinuria (>3.5 g/day)', 'Hypoalbuminemia with anasarca', 'Hyperlipidemia', '10-year uncontrolled DM with retinopathy'],
        differentials: ['Diabetic Nephropathy', 'Membranous Nephropathy', 'Focal Segmental Glomerulosclerosis', 'Minimal Change Disease'],
        teachingPoints: [
            'Nephrotic syndrome triad: proteinuria >3.5g, hypoalbuminemia, edema + hyperlipidemia',
            'Diabetic nephropathy is #1 cause of ESRD worldwide',
            'Presence of diabetic retinopathy strongly supports diabetic nephropathy (biopsy may not be needed)',
            'Management: ACEi/ARB, SGLT2 inhibitor (proven renoprotection), strict glycemic control, statin'
        ],
        references: 'KDIGO Glomerular Diseases Guideline 2021',
        reasoningSteps: [
            { step: 'history', keyInsight: 'Frothy urine + edema + 10yr DM = nephrotic syndrome likely from diabetic nephropathy' },
            { step: 'exam', keyInsight: 'Anasarca + diabetic retinopathy (same microvascular process affects kidneys and eyes)' },
            { step: 'labs', keyInsight: 'Proteinuria 5.2g + albumin 2.0 + hyperlipidemia = textbook nephrotic syndrome' },
            { step: 'imaging', keyInsight: 'Large kidneys (early diabetic nephropathy) with increased echogenicity (renal parenchymal disease)' },
            { step: 'synthesis', keyInsight: 'Nephrotic syndrome + long-standing DM + retinopathy = diabetic nephropathy. No biopsy needed if typical presentation.' }
        ],
        xpReward: { excellent: 150, good: 100, fair: 75, poor: 50 }
    },

    // ============ PULMONOLOGY ============
    {
        id: 'case_pulm_001',
        specialty: 'pulmonology',
        difficulty: 'medium',
        title: '62-year-old male with progressive dyspnea and dry cough',
        presentation: 'A 62-year-old retired construction worker presents with progressive exertional dyspnea over 18 months, now occurring with minimal activity. He has a persistent dry cough. He worked with asbestos insulation for 25 years. He is a never-smoker. He has noticed bilateral finger clubbing recently.',
        vitals: 'HR: 88, BP: 130/80, RR: 22, Temp: 98.4°F, SpO2: 88% on room air',
        physicalExam: 'Digital clubbing bilateral. Fine bibasilar inspiratory crackles ("Velcro crackles") extending to mid-zones. No wheezing. No cyanosis at rest. JVP not elevated.',
        labs: {
            'CBC': 'Normal',
            'BMP': 'Normal',
            'PFTs': 'FVC 58% predicted, FEV1 62% predicted, FEV1/FVC 0.85 (normal), DLCO 38% predicted',
            'ABG': 'pH 7.44, pCO2 36, pO2 62, HCO3 24'
        },
        imagingDescription: 'HRCT chest shows bilateral, predominantly basal and peripheral reticular opacities with honeycombing and traction bronchiectasis. No ground glass opacity. Bilateral pleural plaques present.',
        imagingModality: 'CT',
        diagnosis: 'Idiopathic Pulmonary Fibrosis (UIP pattern) with Asbestosis',
        keyFindings: ['Restrictive PFT pattern (low FVC, normal ratio)', 'Severely reduced DLCO', 'UIP pattern on HRCT (honeycombing, basilar predominance)', 'Asbestos exposure history with pleural plaques'],
        differentials: ['Idiopathic Pulmonary Fibrosis', 'Asbestosis', 'Hypersensitivity Pneumonitis', 'Nonspecific Interstitial Pneumonia (NSIP)'],
        teachingPoints: [
            'UIP pattern on HRCT: basal, peripheral honeycombing + traction bronchiectasis = sufficient for IPF diagnosis without biopsy',
            'Asbestos exposure with pleural plaques + UIP pattern = asbestosis (occupational UIP)',
            'Antifibrotics (pirfenidone, nintedanib) slow FVC decline but don\'t reverse fibrosis',
            'Severely reduced DLCO (<40%) with preserved volumes suggests pulmonary vascular involvement'
        ],
        references: 'ATS/ERS/JRS/ALAT IPF Guidelines 2022',
        reasoningSteps: [
            { step: 'history', keyInsight: 'Progressive dyspnea + dry cough + asbestos exposure + clubbing = chronic ILD' },
            { step: 'exam', keyInsight: 'Velcro crackles bibasally + clubbing = classic IPF/UIP presentation' },
            { step: 'labs', keyInsight: 'Restrictive pattern (low FVC, normal ratio) + severely low DLCO = advanced fibrotic ILD' },
            { step: 'imaging', keyInsight: 'Basal honeycombing + traction bronchiectasis = definite UIP pattern. Pleural plaques = asbestos.' },
            { step: 'synthesis', keyInsight: 'UIP pattern with asbestos exposure. Start antifibrotic, refer for transplant evaluation given severe DLCO reduction.' }
        ],
        xpReward: { excellent: 150, good: 100, fair: 75, poor: 50 }
    },

    // ============ ONCOLOGY ============
    {
        id: 'case_onco_001',
        specialty: 'oncology',
        difficulty: 'hard',
        title: '55-year-old female with weight loss and pancytopenia',
        presentation: 'A 55-year-old female presents with 3 months of progressive fatigue, unintentional weight loss of 8 kg, night sweats, and early satiety. She has noticed a feeling of fullness in the left upper abdomen. She has no significant past medical history. No family history of hematologic malignancy.',
        vitals: 'HR: 92, BP: 118/72, RR: 16, Temp: 100.2°F, SpO2: 97%',
        physicalExam: 'Pale, thin female. Massive splenomegaly extending to right iliac fossa (20 cm below costal margin). Liver palpable 4 cm below costal margin. No lymphadenopathy. Petechiae on lower extremities. No gum hypertrophy.',
        labs: {
            'CBC': 'WBC 125,000/µL, Hb 8.4 g/dL, Platelets 95K',
            'Differential': 'Blasts 2%, Promyelocytes 5%, Myelocytes 18%, Metamyelocytes 12%, Bands 10%, Neutrophils 35%, Basophils 8%, Eosinophils 4%',
            'LDH': '580 U/L (elevated)',
            'Uric acid': '9.8 mg/dL (elevated)',
            'BMP': 'K 4.5, Cr 1.0, Ca 9.2'
        },
        imagingDescription: 'CT abdomen shows massive splenomegaly (28 cm craniocaudal). Hepatomegaly. No lymphadenopathy.',
        imagingModality: 'CT',
        diagnosis: 'Chronic Myeloid Leukemia (CML) in Chronic Phase',
        keyFindings: ['Marked leukocytosis with left shift (full myeloid maturation)', 'Massive splenomegaly', 'Basophilia (8%)', 'Low blast count (<10%) = chronic phase'],
        differentials: ['Chronic Myeloid Leukemia', 'Myelofibrosis', 'Leukemoid Reaction', 'Chronic Myelomonocytic Leukemia'],
        teachingPoints: [
            'CML hallmark: BCR-ABL1 fusion (Philadelphia chromosome) - must order cytogenetics/FISH/PCR',
            'Peripheral smear shows full maturation (unlike AML which has maturation arrest)',
            'Basophilia is characteristic of CML and helps differentiate from leukemoid reaction',
            'First-line treatment: TKIs (imatinib, dasatinib, nilotinib). Deep molecular response may allow TKI discontinuation'
        ],
        references: 'NCCN Guidelines CML 2024',
        reasoningSteps: [
            { step: 'history', keyInsight: 'B symptoms + early satiety + left upper quadrant fullness = massive splenomegaly, think myeloproliferative' },
            { step: 'exam', keyInsight: 'Massive splenomegaly (20cm below costal margin) = think CML or myelofibrosis' },
            { step: 'labs', keyInsight: 'WBC 125K with full myeloid maturation + basophilia = CML. Low blasts (<10%) = chronic phase' },
            { step: 'imaging', keyInsight: 'Massive spleen, no lymphadenopathy (rules out lymphoma)' },
            { step: 'synthesis', keyInsight: 'CML chronic phase. Confirm with BCR-ABL1 testing. Start TKI. Monitor for blast crisis.' }
        ],
        xpReward: { excellent: 200, good: 150, fair: 100, poor: 75 }
    },

    // ============ ENDOCRINOLOGY ============
    {
        id: 'case_endo_001',
        specialty: 'endocrinology',
        difficulty: 'medium',
        title: '38-year-old female with palpitations and tremor',
        presentation: 'A 38-year-old female presents with 2 months of palpitations, unintentional weight loss of 6 kg despite increased appetite, heat intolerance, and fine tremor in her hands. She has also noticed increased frequency of bowel movements. Her mother had thyroid disease. She recently gave birth 4 months ago.',
        vitals: 'HR: 112, BP: 148/72, RR: 18, Temp: 99.4°F, SpO2: 99%',
        physicalExam: 'Anxious-appearing female. Lid lag and mild proptosis bilateral. Diffusely enlarged thyroid gland (2x normal) with an audible bruit. Fine resting tremor. Warm, moist skin. Brisk DTRs. No pretibial myxedema.',
        labs: {
            'TSH': '<0.01 mIU/L (normal 0.4-4.0)',
            'Free T4': '5.8 ng/dL (normal 0.8-1.8)',
            'Free T3': '12.4 pg/mL (normal 2.3-4.2)',
            'TSH Receptor Antibodies (TRAb)': 'Positive (4.2 IU/L)',
            'CBC': 'Normal',
            'LFTs': 'AST 42, ALT 48 (mildly elevated)'
        },
        imagingDescription: 'Thyroid uptake scan shows diffusely increased uptake (45%, normal 10-30%) throughout both lobes.',
        imagingModality: 'Other',
        diagnosis: "Graves' Disease (Thyrotoxicosis)",
        keyFindings: ['Suppressed TSH with markedly elevated T3/T4', 'Positive TRAb (pathognomonic for Graves)', 'Diffuse goiter with bruit', 'Ophthalmopathy (lid lag, proptosis)'],
        differentials: ["Graves' Disease", 'Toxic Multinodular Goiter', 'Postpartum Thyroiditis', 'Factitious Thyrotoxicosis'],
        teachingPoints: [
            "Graves' disease is the most common cause of hyperthyroidism in young women",
            'TRAb is pathognomonic and differentiates from postpartum thyroiditis (which has negative TRAb and low uptake)',
            'Treatment options: antithyroid drugs (methimazole first-line), radioactive iodine, or surgery',
            "Postpartum timing (4 months) could suggest thyroiditis, but thyroid bruit and TRAb confirm Graves'"
        ],
        references: 'ATA Guidelines for Hyperthyroidism 2016',
        reasoningSteps: [
            { step: 'history', keyInsight: 'Hyperthyroid symptoms (weight loss, palpitations, tremor) + family history + postpartum = Graves or postpartum thyroiditis' },
            { step: 'exam', keyInsight: 'Diffuse goiter with bruit + ophthalmopathy = Graves disease specifically (not just hyperthyroidism)' },
            { step: 'labs', keyInsight: 'TSH suppressed + elevated T3/T4 + positive TRAb = confirmed Graves (TRAb is specific)' },
            { step: 'imaging', keyInsight: 'Diffusely increased uptake distinguishes Graves from thyroiditis (which has LOW uptake)' },
            { step: 'synthesis', keyInsight: "Graves' disease confirmed by TRAb + diffuse uptake. Start methimazole + beta-blocker for symptom control." }
        ],
        xpReward: { excellent: 150, good: 100, fair: 75, poor: 50 }
    },

    // ============ INFECTIOUS DISEASES ============
    {
        id: 'case_id_001',
        specialty: 'infectious',
        difficulty: 'hard',
        title: '32-year-old male with fever and altered sensorium',
        presentation: 'A 32-year-old male is brought to the ED with high-grade fever for 5 days, severe headache, neck stiffness, and progressive confusion over the past 24 hours. He recently returned from a trip to rural India 2 weeks ago. He has no significant past medical history and is not immunocompromised. He did not take malaria prophylaxis.',
        vitals: 'HR: 120, BP: 100/60, RR: 24, Temp: 104.2°F, SpO2: 96%',
        physicalExam: 'Appears toxic. GCS 12 (E3V4M5). Marked neck rigidity. Positive Kernig and Brudzinski signs. No focal neurological deficits. No papilledema. Petechial rash on trunk and extremities. No hepatosplenomegaly.',
        labs: {
            'CBC': 'WBC 18,500/µL (88% neutrophils), Hb 12.8, Platelets 110K',
            'BMP': 'Na 130, K 4.0, Cr 1.3, Glucose 68',
            'Blood cultures': 'Pending',
            'CSF': 'Opening pressure 32 cmH2O, WBC 2800 (92% PMNs), Protein 280 mg/dL, Glucose 18 mg/dL (serum 68)',
            'CSF Gram stain': 'Gram-negative diplococci',
            'Procalcitonin': '12.5 ng/mL'
        },
        imagingDescription: 'CT head without contrast: No mass lesion, hemorrhage, or hydrocephalus. Mild meningeal enhancement.',
        imagingModality: 'CT',
        diagnosis: 'Acute Bacterial Meningitis (Neisseria meningitidis)',
        keyFindings: ['Meningeal signs with altered sensorium', 'CSF: PMN pleocytosis, low glucose, high protein', 'Gram-negative diplococci on CSF Gram stain', 'Petechial rash (characteristic of meningococcemia)'],
        differentials: ['Bacterial Meningitis (Meningococcal)', 'Cerebral Malaria', 'Viral Encephalitis', 'Tuberculous Meningitis'],
        teachingPoints: [
            'Meningococcal meningitis: Gram-negative diplococci + petechial rash = pathognomonic',
            'CSF glucose:serum ratio <0.4 strongly suggests bacterial meningitis',
            'Treatment: IV ceftriaxone 2g q12h + dexamethasone (before or with first antibiotic dose)',
            'Close contacts need chemoprophylaxis (ciprofloxacin or rifampin)'
        ],
        references: 'IDSA Bacterial Meningitis Guidelines 2024',
        reasoningSteps: [
            { step: 'history', keyInsight: 'Fever + headache + neck stiffness + confusion = meningitis until proven otherwise. Travel history raises malaria concern.' },
            { step: 'exam', keyInsight: 'Kernig/Brudzinski positive + petechial rash = bacterial meningitis, likely meningococcal' },
            { step: 'labs', keyInsight: 'CSF: PMN-predominant, very low glucose (ratio <0.3), high protein = bacterial. Gram-neg diplococci = N. meningitidis' },
            { step: 'imaging', keyInsight: 'CT clear (safe to LP). No mass or hydrocephalus.' },
            { step: 'synthesis', keyInsight: 'Meningococcal meningitis confirmed. IV ceftriaxone + dexamethasone immediately. Notify public health for contact prophylaxis.' }
        ],
        xpReward: { excellent: 200, good: 150, fair: 100, poor: 75 }
    },

    // ============ CRITICAL CARE ============
    {
        id: 'case_cc_001',
        specialty: 'critical',
        difficulty: 'hard',
        title: '70-year-old male with septic shock from pneumonia',
        presentation: 'A 70-year-old male nursing home resident is transferred to the ICU from the floor. He was admitted yesterday for community-acquired pneumonia. Despite IV antibiotics and 3L normal saline, he has become progressively hypotensive and oliguric. He has a history of COPD and CHF (EF 35%). He was last seen well 3 days ago.',
        vitals: 'HR: 128, BP: 72/42 (MAP 52), RR: 32, Temp: 103.8°F, SpO2: 84% on 15L NRB, Urine output: 10mL/hr for 4 hours',
        physicalExam: 'Confused, diaphoretic. Using accessory muscles. Bilateral coarse crackles worse on right. Mottled extremities. Capillary refill >4 seconds. Warm peripheries (warm shock).',
        labs: {
            'ABG': 'pH 7.22, pCO2 32, pO2 55, HCO3 13, Lactate 6.8 mmol/L',
            'CBC': 'WBC 22K (15% bands), Hb 10.2, Platelets 78K',
            'BMP': 'Na 142, K 5.4, Cr 3.2 (baseline 1.4), BUN 58',
            'Procalcitonin': '28 ng/mL',
            'LFTs': 'AST 220, ALT 180, Bilirubin 2.8'
        },
        imagingDescription: 'CXR shows right lower lobe consolidation with bilateral diffuse infiltrates. Bilateral pleural effusions. PaO2/FiO2 ratio = 55 (severe ARDS).',
        imagingModality: 'CXR',
        diagnosis: 'Septic Shock with Multi-Organ Dysfunction Syndrome (MODS) secondary to Pneumonia and ARDS',
        keyFindings: ['MAP <65 despite fluid resuscitation = vasopressor needed', 'Lactate 6.8 = severe tissue hypoperfusion', 'P/F ratio 55 = severe ARDS', 'AKI, thrombocytopenia, hepatic dysfunction = MODS'],
        differentials: ['Septic Shock', 'Cardiogenic Shock (acute on chronic CHF)', 'Mixed Shock (septic + cardiogenic)', 'Massive PE'],
        teachingPoints: [
            'Sepsis-3: Septic shock = sepsis + vasopressors to maintain MAP ≥65 + lactate >2 despite adequate fluids',
            'Hour-1 bundle: cultures, broad-spectrum antibiotics, 30mL/kg crystalloid, vasopressors if MAP <65, remeasure lactate',
            'ARDS ventilation: Low tidal volume (6 mL/kg IBW), plateau pressure <30, target SpO2 88-95%',
            'Pre-existing CHF (EF 35%) = be cautious with fluids, early vasopressor, consider echo to guide management'
        ],
        references: 'Surviving Sepsis Campaign 2021',
        reasoningSteps: [
            { step: 'history', keyInsight: 'Pneumonia → refractory hypotension despite fluids = septic shock. CHF complicates fluid management.' },
            { step: 'exam', keyInsight: 'Warm shock (vasodilatory) with mottled extremities = late septic shock. Accessory muscles = respiratory failure.' },
            { step: 'labs', keyInsight: 'Lactate 6.8 = severe hypoperfusion. HAGMA (pH 7.22, HCO3 13). P/F 55 = severe ARDS. AKI, LFT elevation, thrombocytopenia = MODS.' },
            { step: 'imaging', keyInsight: 'Right lower lobe consolidation (source) + bilateral infiltrates + effusions = pneumonia complicated by ARDS' },
            { step: 'synthesis', keyInsight: 'Septic shock with MODS from pneumonia. Start norepinephrine, intubate with lung-protective ventilation, broad-spectrum antibiotics, renal replacement if needed.' }
        ],
        xpReward: { excellent: 200, good: 150, fair: 100, poor: 75 }
    },

    // ============ HEMATOLOGY ============
    {
        id: 'case_heme_001',
        specialty: 'hematology',
        difficulty: 'medium',
        title: '28-year-old female with fatigue and bruising',
        presentation: 'A 28-year-old previously healthy female presents with 2 weeks of progressive fatigue, easy bruising, and bleeding gums. She noticed petechiae on her legs 3 days ago. She reports no fever, weight loss, or bone pain. She has no significant past medical history. No recent medication changes or new drugs.',
        vitals: 'HR: 88, BP: 110/70, RR: 16, Temp: 98.6°F, SpO2: 99%',
        physicalExam: 'Pale conjunctivae. Multiple petechiae on bilateral lower extremities. Several ecchymoses on arms and trunk. Gingival bleeding noted. No hepatosplenomegaly. No lymphadenopathy. No bone tenderness.',
        labs: {
            'CBC': 'WBC 2.1K, Hb 7.8 g/dL, MCV 98 fL, Platelets 12K, Reticulocyte count 0.3%',
            'Peripheral smear': 'Pancytopenia with markedly reduced cellularity. No blasts. No schistocytes. Occasional macrocytes.',
            'BMP': 'Normal',
            'LDH': 'Normal',
            'Iron studies': 'Normal',
            'B12/Folate': 'Normal'
        },
        imagingDescription: 'Bone marrow biopsy shows markedly hypocellular marrow (<10% cellularity). Fat spaces predominate. No fibrosis. No abnormal infiltrates. Remaining hematopoietic cells appear morphologically normal.',
        imagingModality: 'Other',
        diagnosis: 'Severe Aplastic Anemia',
        keyFindings: ['Pancytopenia (all 3 cell lines reduced)', 'Hypocellular bone marrow (<10%)', 'Low reticulocyte count (marrow failure, not destruction)', 'No blasts or fibrosis (rules out leukemia/MDS)'],
        differentials: ['Aplastic Anemia', 'Myelodysplastic Syndrome', 'Acute Leukemia (aleukemic)', 'Megaloblastic Anemia'],
        teachingPoints: [
            'Severe aplastic anemia: 2 of 3 → ANC <500, platelets <20K, reticulocytes <20K (or <1%)',
            'Bone marrow biopsy (not just aspirate) is essential - shows cellularity',
            'Young patient (<40) with matched sibling donor → allogeneic stem cell transplant is first-line',
            'Without donor: horse ATG + cyclosporine + eltrombopag (70-80% response rate)'
        ],
        references: 'ASH Guidelines for Aplastic Anemia 2024',
        reasoningSteps: [
            { step: 'history', keyInsight: 'Young woman + fatigue + bleeding + bruising = pancytopenia until proven otherwise' },
            { step: 'exam', keyInsight: 'Petechiae + ecchymoses (low platelets) + pallor (anemia) + no organomegaly (argues against leukemia/lymphoma)' },
            { step: 'labs', keyInsight: 'Pancytopenia + low reticulocytes = marrow failure (not peripheral destruction). Normal B12/folate rules out megaloblastic.' },
            { step: 'imaging', keyInsight: 'Bone marrow <10% cellularity with fat replacement = aplastic anemia. No blasts rules out leukemia.' },
            { step: 'synthesis', keyInsight: 'Severe aplastic anemia. HLA-type patient and siblings. If matched donor → transplant. If not → immunosuppression.' }
        ],
        xpReward: { excellent: 150, good: 100, fair: 75, poor: 50 }
    }
];

/**
 * Get cases filtered by specialty and/or difficulty
 */
function getCases(filters = {}) {
    let filtered = [...clinicalCases];

    if (filters.specialty) {
        filtered = filtered.filter(c => c.specialty === filters.specialty);
    }
    if (filters.difficulty) {
        filtered = filtered.filter(c => c.difficulty === filters.difficulty);
    }

    return filtered;
}

/**
 * Get a random case, optionally filtered
 */
function getRandomCase(filters = {}) {
    const cases = getCases(filters);
    if (cases.length === 0) return null;
    return cases[Math.floor(Math.random() * cases.length)];
}

/**
 * Get a specific case by ID
 */
function getCaseById(id) {
    return clinicalCases.find(c => c.id === id) || null;
}

/**
 * Get all available specialties with case counts
 */
function getSpecialtyCounts() {
    const counts = {};
    clinicalCases.forEach(c => {
        counts[c.specialty] = (counts[c.specialty] || 0) + 1;
    });
    return counts;
}

export { clinicalCases, getCases, getRandomCase, getCaseById, getSpecialtyCounts };
