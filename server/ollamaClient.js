// Ollama LLM Client for Solo NEET SS
// Connects to local Ollama server for MCQ generation using Llama 3

const OLLAMA_API_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3:70b';

/**
 * Check if Ollama is running and the model is available
 */
export async function checkOllamaStatus() {
    try {
        const response = await fetch(`${OLLAMA_API_URL}/api/tags`);
        if (!response.ok) {
            return { available: false, error: 'Ollama server not responding' };
        }
        
        const data = await response.json();
        const models = data.models || [];
        const hasModel = models.some(m => m.name.includes('llama3'));
        
        return { 
            available: true, 
            models: models.map(m => m.name),
            hasLlama3: hasModel,
            defaultModel: DEFAULT_MODEL
        };
    } catch (error) {
        return { available: false, error: error.message };
    }
}

/**
 * Generate text using Ollama API (chat endpoint for better instruction following)
 * @param {string} prompt - The prompt to send
 * @param {Object} options - Generation options
 */
export async function generateWithOllama(prompt, options = {}) {
    const model = options.model || DEFAULT_MODEL;
    
    const requestBody = {
        model,
        messages: [
            {
                role: 'system',
                content: 'You are a medical education expert specializing in super-specialty NEET SS exam preparation. Generate accurate, clinically relevant MCQs based on research articles.'
            },
            {
                role: 'user', 
                content: prompt
            }
        ],
        stream: false,
        options: {
            temperature: options.temperature || 0.7,
            top_k: options.topK || 40,
            top_p: options.topP || 0.95,
            num_predict: options.maxTokens || 2048,
        }
    };

    const response = await fetch(`${OLLAMA_API_URL}/api/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.message?.content || '';
}

/**
 * Generate MCQs from a PubMed abstract using Ollama (Llama 3)
 * @param {Object} article - Article data from PubMed
 * @param {string} specialty - Medical specialty category
 */
export async function generateQuestionsWithOllama(article, specialty = 'general') {
    if (!article.abstract || article.abstract.length < 100) {
        throw new Error('Abstract too short to generate meaningful questions');
    }

    const prompt = buildQuestionPrompt(article, specialty);
    const text = await generateWithOllama(prompt);

    if (!text) {
        throw new Error('No response from Ollama');
    }

    return parseGeneratedQuestions(text, article);
}

/**
 * Build the prompt for MCQ generation
 */
function buildQuestionPrompt(article, specialty) {
    return `Based on this PubMed article, generate 2-3 high-yield multiple choice questions for NEET SS exam preparation.

ARTICLE TITLE: ${article.title}
AUTHORS: ${article.authors}
JOURNAL: ${article.journal} (${article.year})
PMID: ${article.pmid}

ABSTRACT:
${article.abstract}

SPECIALTY: ${specialty}

REQUIREMENTS:
1. Questions should test clinical decision-making, not just recall
2. Each question must have exactly 4 options (A, B, C, D)
3. Difficulty levels: easy (10 XP), medium (25 XP), hard (50 XP)
4. Include brief but informative explanations
5. Questions must be factually accurate based on the abstract

OUTPUT FORMAT (respond ONLY with valid JSON array, no extra text):
[
  {
    "question": "Clinical scenario or direct question here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "difficulty": "medium",
    "xp": 25,
    "explanation": "Brief explanation of why this is correct, citing the study."
  }
]

Generate the questions now:`;
}

/**
 * Parse LLM response to extract questions
 */
function parseGeneratedQuestions(text, article) {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
        console.error('Could not find JSON in response:', text);
        throw new Error('Failed to parse AI response - no valid JSON found');
    }

    try {
        const questions = JSON.parse(jsonMatch[0]);

        // Validate and enhance each question
        return questions.map((q, index) => {
            // Validate structure
            if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
                throw new Error(`Invalid question structure at index ${index}`);
            }

            // Ensure correct is a valid index
            const correctIndex = typeof q.correct === 'number' ? q.correct : 0;
            if (correctIndex < 0 || correctIndex > 3) {
                q.correct = 0;
            }

            // Validate difficulty
            const validDifficulties = ['easy', 'medium', 'hard'];
            if (!validDifficulties.includes(q.difficulty)) {
                q.difficulty = 'medium';
            }

            // Set XP based on difficulty
            const xpMap = { easy: 10, medium: 25, hard: 50 };
            q.xp = xpMap[q.difficulty];

            // Add source metadata
            q.source = {
                type: 'pubmed',
                pmid: article.pmid,
                title: article.title,
                journal: article.journal,
                year: article.year,
                generatedAt: new Date().toISOString(),
                llmProvider: 'ollama',
                llmModel: DEFAULT_MODEL
            };

            // Generate unique ID
            q.id = `ollama_${article.pmid}_${index}_${Date.now()}`;

            // Mark as AI-generated for review
            q.aiGenerated = true;
            q.reviewed = false;

            return q;
        });
    } catch (error) {
        console.error('JSON parse error:', error, 'Text:', jsonMatch[0]);
        throw new Error(`Failed to parse AI response: ${error.message}`);
    }
}

/**
 * Generate questions from multiple articles using Ollama
 */
export async function generateQuestionsFromArticles(articles, specialty = 'general') {
    const allQuestions = [];
    const errors = [];

    for (const article of articles) {
        try {
            // Ollama is local, so we can be more aggressive with requests
            // But still add a small delay for stability
            await new Promise(resolve => setTimeout(resolve, 500));

            const questions = await generateQuestionsWithOllama(article, specialty);
            allQuestions.push(...questions);
        } catch (error) {
            errors.push({
                pmid: article.pmid,
                title: article.title,
                error: error.message,
            });
        }
    }

    return {
        questions: allQuestions,
        errors,
        totalGenerated: allQuestions.length,
        totalErrors: errors.length,
        provider: 'ollama',
        model: DEFAULT_MODEL
    };
}

export default {
    checkOllamaStatus,
    generateWithOllama,
    generateQuestionsWithOllama,
    generateQuestionsFromArticles,
};
