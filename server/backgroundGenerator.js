// Background PubMed Question Generator
// Continuously monitors medical literature and generates questions

import { searchAndFetchAbstracts } from './pubmed.js';
import { generateQuestionsFromArticles } from './questionGenerator.js';

// Topics to monitor for each specialty - high-yield NEET SS topics
const SPECIALTY_TOPICS = {
    cardiology: [
        'acute coronary syndrome management 2024',
        'heart failure treatment guidelines',
        'atrial fibrillation anticoagulation',
        'interventional cardiology STEMI',
        'cardiomyopathy diagnosis'
    ],
    neurology: [
        'acute ischemic stroke thrombolysis',
        'epilepsy treatment guidelines',
        'multiple sclerosis disease modifying',
        'Parkinson disease management',
        'myasthenia gravis treatment'
    ],
    gastroenterology: [
        'inflammatory bowel disease biologic',
        'hepatocellular carcinoma treatment',
        'acute pancreatitis management',
        'cirrhosis complications portal hypertension',
        'Barrett esophagus surveillance'
    ],
    nephrology: [
        'chronic kidney disease KDIGO 2024',
        'dialysis initiation guidelines',
        'glomerulonephritis treatment',
        'acute kidney injury prevention',
        'diabetic nephropathy SGLT2'
    ],
    pulmonology: [
        'COPD management GOLD 2024',
        'idiopathic pulmonary fibrosis antifibrotic',
        'asthma biologic therapy',
        'pulmonary hypertension treatment',
        'lung cancer screening LDCT'
    ],
    oncology: [
        'immunotherapy checkpoint inhibitors',
        'targeted therapy cancer',
        'CAR-T cell therapy lymphoma',
        'breast cancer hormone receptor',
        'colorectal cancer screening'
    ],
    endocrinology: [
        'type 2 diabetes GLP-1 agonist',
        'thyroid cancer management',
        'adrenal insufficiency treatment',
        'osteoporosis bisphosphonate',
        'pituitary adenoma management'
    ],
    rheumatology: [
        'rheumatoid arthritis biologic DMARD',
        'systemic lupus erythematosus',
        'ankylosing spondylitis TNF',
        'gout urate lowering therapy',
        'vasculitis treatment'
    ],
    hematology: [
        'acute myeloid leukemia treatment',
        'multiple myeloma proteasome inhibitor',
        'hemophilia gene therapy',
        'sickle cell disease hydroxyurea',
        'thrombotic thrombocytopenic purpura'
    ],
    infectious: [
        'antibiotic resistance mechanisms',
        'HIV antiretroviral therapy 2024',
        'tuberculosis drug resistant',
        'fungal infection immunocompromised',
        'COVID-19 long-term effects'
    ],
    critical: [
        'sepsis surviving sepsis campaign',
        'ARDS lung protective ventilation',
        'shock resuscitation vasopressor',
        'acute respiratory failure NIV',
        'ICU delirium prevention'
    ],
    neonatology: [
        'preterm infant surfactant',
        'neonatal hyperbilirubinemia phototherapy',
        'hypoxic ischemic encephalopathy cooling',
        'necrotizing enterocolitis prevention',
        'bronchopulmonary dysplasia'
    ],
    surgery: [
        'acute abdomen emergency surgery',
        'laparoscopic cholecystectomy complications',
        'bariatric surgery outcomes metabolic',
        'surgical site infection prevention',
        'enhanced recovery after surgery ERAS'
    ],
    orthopedics: [
        'fracture fixation AO principles',
        'total joint replacement hip knee',
        'spine surgery degenerative disc',
        'sports medicine ACL reconstruction',
        'pediatric orthopedics hip dysplasia'
    ],
    neurosurgery: [
        'brain tumor glioblastoma surgery',
        'cerebral aneurysm clipping coiling',
        'spine decompression laminectomy',
        'neurotrauma traumatic brain injury',
        'deep brain stimulation movement disorders'
    ],
    cardiothoracic: [
        'coronary artery bypass grafting CABG',
        'heart valve replacement surgical',
        'lung cancer resection VATS',
        'thoracic trauma management',
        'ECMO extracorporeal membrane oxygenation'
    ],
    radiology: [
        'CT imaging protocols contrast',
        'MRI brain sequences interpretation',
        'interventional radiology embolization',
        'PET CT oncology staging',
        'ultrasound guided procedures'
    ],
    psychiatry: [
        'schizophrenia antipsychotic treatment',
        'major depression SSRI therapy',
        'bipolar disorder mood stabilizers',
        'anxiety disorders benzodiazepines',
        'substance use disorder addiction treatment'
    ],
    dermatology: [
        'psoriasis biologic therapy',
        'melanoma staging treatment',
        'atopic dermatitis management',
        'autoimmune blistering diseases pemphigus',
        'skin cancer Mohs surgery'
    ],
    emergency: [
        'cardiac arrest resuscitation ACLS',
        'toxicology poisoning antidotes',
        'polytrauma damage control surgery',
        'sepsis early goal directed therapy',
        'stroke thrombolysis window'
    ]
};

// Track processed PMIDs to avoid duplicates
let processedPmids = new Set();

// Generator state
let isRunning = false;
let lastRunTime = null;
let stats = {
    totalGenerated: 0,
    totalErrors: 0,
    lastSpecialty: null,
    questionsToday: 0
};

/**
 * Initialize the background generator
 * @param {object} dal — Data Access Layer
 */
export function initBackgroundGenerator(dal, intervalMinutes = 30) {
    console.log(`🧬 Background PubMed Generator initialized (interval: ${intervalMinutes}min)`);

    loadProcessedPmids(dal);
    runGenerationCycle(dal);

    setInterval(() => {
        runGenerationCycle(dal);
    }, intervalMinutes * 60 * 1000);

    return {
        getStats: () => ({ ...stats, isRunning, lastRunTime, processedCount: processedPmids.size }),
        forceRun: () => runGenerationCycle(dal),
        stop: () => { isRunning = false; }
    };
}

/**
 * Load already processed PMIDs to avoid duplicates
 */
async function loadProcessedPmids(dal) {
    processedPmids = await dal.generatedQuestions.getProcessedPmids();
    console.log(`📚 Loaded ${processedPmids.size} previously processed PMIDs`);
}

/**
 * Run a full generation cycle across all specialties
 */
async function runGenerationCycle(dal) {
    if (isRunning) {
        console.log('⏳ Generation cycle already in progress, skipping...');
        return;
    }

    if (!process.env.GEMINI_API_KEY) {
        console.log('⚠️ GEMINI_API_KEY not set - background generation disabled');
        return;
    }

    isRunning = true;
    lastRunTime = new Date().toISOString();
    console.log(`\n🔄 Starting PubMed generation cycle at ${lastRunTime}`);

    const specialties = Object.keys(SPECIALTY_TOPICS);
    let cycleGenerated = 0;
    let cycleErrors = 0;

    for (const specialty of specialties) {
        try {
            const result = await generateForSpecialty(dal, specialty);
            cycleGenerated += result.generated;
            cycleErrors += result.errors;
            stats.lastSpecialty = specialty;

            await sleep(5000);
        } catch (error) {
            console.error(`❌ Error generating for ${specialty}:`, error.message);
            cycleErrors++;
        }
    }

    stats.totalGenerated += cycleGenerated;
    stats.totalErrors += cycleErrors;
    stats.questionsToday += cycleGenerated;

    console.log(`✅ Generation cycle complete: ${cycleGenerated} questions, ${cycleErrors} errors\n`);
    isRunning = false;
}

/**
 * Generate questions for a specific specialty
 */
async function generateForSpecialty(dal, specialty) {
    const topics = SPECIALTY_TOPICS[specialty];
    if (!topics || topics.length === 0) return { generated: 0, errors: 0 };

    const topic = topics[Math.floor(Math.random() * topics.length)];
    console.log(`📖 Searching: "${topic}" for ${specialty}`);

    try {
        const { articles } = await searchAndFetchAbstracts(topic, 3);
        const newArticles = articles.filter(a => !processedPmids.has(a.pmid));

        if (newArticles.length === 0) {
            console.log(`   No new articles found for ${specialty}`);
            return { generated: 0, errors: 0 };
        }

        console.log(`   Found ${newArticles.length} new article(s)`);
        await sleep(2000);

        const result = await generateQuestionsFromArticles(newArticles, specialty);

        for (const question of result.questions) {
            question.generatedBy = 'background_service';
            question.generatedAt = new Date().toISOString();
            question.specialty = specialty;
            question.autoGenerated = true;

            await dal.generatedQuestions.add(question);

            if (question.source?.pmid) {
                processedPmids.add(question.source.pmid);
            }
        }

        console.log(`   ✨ Generated ${result.questions.length} question(s) for ${specialty}`);

        return {
            generated: result.questions.length,
            errors: result.errors?.length || 0
        };
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        return { generated: 0, errors: 1 };
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Reset daily stats at midnight — tracks last reset date to avoid missed windows
let lastResetDate = new Date().toDateString();
setInterval(() => {
    const today = new Date().toDateString();
    if (today !== lastResetDate) {
        lastResetDate = today;
        stats.questionsToday = 0;
        console.log('🌅 Daily question stats reset');
    }
}, 60000);

export default {
    initBackgroundGenerator,
    SPECIALTY_TOPICS
};
