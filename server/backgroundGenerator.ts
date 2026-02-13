// Background PubMed Question Generator
// Continuously monitors medical literature and generates questions

import { searchAndFetchAbstracts } from './pubmed.js';
import { generateQuestionsFromArticles } from './questionGenerator.js';
import logger from './lib/logger.js';
import type { DAL, BackgroundGenerator, GeneratorStats, PubMedArticle, GenerationResult } from './types.js';

// Topics to monitor for each specialty - high-yield NEET SS topics
const SPECIALTY_TOPICS: Record<string, string[]> = {
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
let processedPmids: Set<string> = new Set();

// Generator state
let isRunning: boolean = false;
let lastRunTime: string | null = null;
let stats: GeneratorStats = {
    totalGenerated: 0,
    totalErrors: 0,
    lastSpecialty: null,
    questionsToday: 0
};

/**
 * Initialize the background generator
 * @param {object} dal — Data Access Layer
 */
export function initBackgroundGenerator(dal: DAL, intervalMinutes: number = 30): BackgroundGenerator {
    logger.info('Background PubMed generator initialized', { intervalMinutes });

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
async function loadProcessedPmids(dal: DAL): Promise<void> {
    processedPmids = await dal.generatedQuestions.getProcessedPmids();
    logger.info('Loaded previously processed PMIDs', { count: processedPmids.size });
}

/**
 * Run a full generation cycle across all specialties
 */
async function runGenerationCycle(dal: DAL): Promise<void> {
    if (isRunning) {
        logger.info('Generation cycle already in progress, skipping');
        return;
    }

    if (!process.env.GEMINI_API_KEY) {
        logger.info('Background generation disabled', { reason: 'GEMINI_API_KEY not set' });
        return;
    }

    isRunning = true;
    lastRunTime = new Date().toISOString();
    logger.info('Starting PubMed generation cycle', { startTime: lastRunTime });

    const specialties: string[] = Object.keys(SPECIALTY_TOPICS);
    let cycleGenerated: number = 0;
    let cycleErrors: number = 0;

    for (const specialty of specialties) {
        try {
            const result: { generated: number; errors: number } = await generateForSpecialty(dal, specialty);
            cycleGenerated += result.generated;
            cycleErrors += result.errors;
            stats.lastSpecialty = specialty;

            await sleep(5000);
        } catch (error: any) {
            logger.error('Error generating for specialty', { specialty, error: error.message });
            cycleErrors++;
        }
    }

    stats.totalGenerated += cycleGenerated;
    stats.totalErrors += cycleErrors;
    stats.questionsToday += cycleGenerated;

    logger.info('Generation cycle complete', { questionsGenerated: cycleGenerated, errors: cycleErrors });
    isRunning = false;
}

/**
 * Generate questions for a specific specialty
 */
async function generateForSpecialty(dal: DAL, specialty: string): Promise<{ generated: number; errors: number }> {
    const topics: string[] | undefined = SPECIALTY_TOPICS[specialty];
    if (!topics || topics.length === 0) return { generated: 0, errors: 0 };

    const topic: string = topics[Math.floor(Math.random() * topics.length)];
    logger.info('Searching PubMed topic', { topic, specialty });

    try {
        const { articles } = await searchAndFetchAbstracts(topic, 3);
        const newArticles: PubMedArticle[] = articles.filter(a => !processedPmids.has(a.pmid));

        if (newArticles.length === 0) {
            logger.info('No new articles found', { specialty });
            return { generated: 0, errors: 0 };
        }

        logger.info('Found new articles', { count: newArticles.length });
        await sleep(2000);

        const result: GenerationResult = await generateQuestionsFromArticles(newArticles, specialty);

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

        logger.info('Generated questions for specialty', { count: result.questions.length, specialty });

        return {
            generated: result.questions.length,
            errors: result.errors?.length || 0
        };
    } catch (error: any) {
        logger.error('Error generating questions', { error: error.message });
        return { generated: 0, errors: 1 };
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Reset daily stats at midnight — tracks last reset date to avoid missed windows
let lastResetDate: string = new Date().toDateString();
setInterval(() => {
    const today: string = new Date().toDateString();
    if (today !== lastResetDate) {
        lastResetDate = today;
        stats.questionsToday = 0;
        logger.info('Daily question stats reset');
    }
}, 60000);

export default {
    initBackgroundGenerator,
    SPECIALTY_TOPICS
};
