// AI-Powered Question Generator
// Converts PubMed abstracts into high-yield MCQs using Gemini API

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Generate MCQs from a PubMed abstract using Gemini AI
 * @param {Object} article - Article data from PubMed
 * @param {string} specialty - Medical specialty category
 * @returns {Promise<Array<{question, options, correct, explanation, difficulty, source}>>}
 */
export async function generateQuestionsFromAbstract(article, specialty = 'general') {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('GEMINI_API_KEY not configured. Add it to your .env file.');
    }

    if (!article.abstract || article.abstract.length < 100) {
        throw new Error('Abstract too short to generate meaningful questions');
    }

    const prompt = buildQuestionPrompt(article, specialty);

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
            },
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        throw new Error('No response from Gemini API');
    }

    return parseGeneratedQuestions(text, article);
}

/**
 * Build the prompt for MCQ generation
 */
function buildQuestionPrompt(article, specialty) {
    return `You are a medical education expert creating MCQs for super-specialty NEET SS exam preparation.

Based on this PubMed article, generate 2-3 high-yield multiple choice questions:

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

OUTPUT FORMAT (JSON array):
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
 * Parse Gemini response to extract questions
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
            };

            // Generate unique ID
            q.id = `pubmed_${article.pmid}_${index}_${Date.now()}`;

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
 * Generate questions from multiple articles
 */
export async function generateQuestionsFromArticles(articles, specialty = 'general') {
    const allQuestions = [];
    const errors = [];

    for (const article of articles) {
        try {
            // Rate limit: 1 request per second for Gemini free tier
            await new Promise(resolve => setTimeout(resolve, 1000));

            const questions = await generateQuestionsFromAbstract(article, specialty);
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
    };
}

export default {
    generateQuestionsFromAbstract,
    generateQuestionsFromArticles,
};
