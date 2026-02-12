import { Router } from 'express';
import { searchAndFetchAbstracts } from '../pubmed.js';
import { generateQuestionsFromArticles } from '../questionGenerator.js';
import { generateQuestionsFromArticles as generateWithOllama, checkOllamaStatus } from '../ollamaClient.js';
import logger from '../lib/logger.js';

export function createQuestionRoutes({ dal, authMiddleware, adminMiddleware, getLlmProvider, setLlmProvider }) {
    const router = Router();

    // Search PubMed articles
    router.post('/pubmed/search', authMiddleware, async (req, res) => {
        try {
            const { query, limit = 5 } = req.body;
            if (!query || query.length < 3) {
                return res.status(400).json({ error: 'Query must be at least 3 characters' });
            }
            const result = await searchAndFetchAbstracts(query, Math.min(limit, 10));
            res.json({
                success: true,
                query: result.query,
                count: result.count,
                articles: result.articles.map(a => ({
                    pmid: a.pmid,
                    title: a.title,
                    abstract: a.abstract.slice(0, 500) + (a.abstract.length > 500 ? '...' : ''),
                    authors: a.authors,
                    journal: a.journal,
                    year: a.year
                }))
            });
        } catch (error) {
            logger.error('PubMed search failed', { error: error.message });
            res.status(500).json({ error: 'Failed to search PubMed' });
        }
    });

    // Generate questions from articles
    router.post('/pubmed/generate', authMiddleware, async (req, res) => {
        try {
            const { pmids, specialty = 'general', provider } = req.body;
            if (!pmids || !Array.isArray(pmids) || pmids.length === 0) {
                return res.status(400).json({ error: 'PMIDs array required' });
            }

            const { articles } = await searchAndFetchAbstracts(`${pmids.join(' OR ')}[uid]`, pmids.length);
            if (articles.length === 0) {
                return res.status(404).json({ error: 'No articles found for provided PMIDs' });
            }

            const useProvider = provider || getLlmProvider();
            let result;
            if (useProvider === 'ollama') {
                result = await generateWithOllama(articles, specialty);
            } else {
                result = await generateQuestionsFromArticles(articles, specialty);
            }

            for (const question of result.questions) {
                question.generatedBy = req.userId;
                question.generatedAt = new Date().toISOString();
                question.llmProvider = useProvider;
                await dal.generatedQuestions.add(question);
            }

            res.json({
                success: true,
                provider: useProvider,
                model: result.model || (useProvider === 'gemini' ? 'gemini-1.5-flash' : 'llama3:70b'),
                generated: result.totalGenerated,
                errors: result.totalErrors,
                questions: result.questions,
                errorDetails: result.errors
            });
        } catch (error) {
            logger.error('Question generation failed', { error: error.message });
            res.status(500).json({ error: 'Failed to generate questions' });
        }
    });

    // Get LLM status
    router.get('/llm/status', async (req, res) => {
        const ollamaStatus = await checkOllamaStatus();
        const geminiConfigured = !!process.env.GEMINI_API_KEY;
        res.json({
            currentProvider: getLlmProvider(),
            ollama: ollamaStatus,
            gemini: { configured: geminiConfigured, model: 'gemini-1.5-flash' }
        });
    });

    // Switch LLM provider (admin only)
    router.post('/llm/provider', authMiddleware, adminMiddleware, async (req, res) => {
        const { provider } = req.body;
        if (!['ollama', 'gemini'].includes(provider)) {
            return res.status(400).json({ error: 'Provider must be "ollama" or "gemini"' });
        }
        if (provider === 'ollama') {
            const status = await checkOllamaStatus();
            if (!status.available) {
                return res.status(503).json({ error: 'Ollama server not available', details: status.error });
            }
        }
        if (provider === 'gemini' && !process.env.GEMINI_API_KEY) {
            return res.status(503).json({ error: 'Gemini API key not configured' });
        }
        setLlmProvider(provider);
        res.json({
            success: true,
            provider,
            model: provider === 'ollama' ? (process.env.OLLAMA_MODEL || 'llama3:70b') : 'gemini-1.5-flash'
        });
    });

    // Get generated questions
    router.get('/questions/generated', authMiddleware, async (req, res) => {
        const reviewed = req.query.reviewed === 'true' ? true : req.query.reviewed === 'false' ? false : undefined;
        const filtered = await dal.generatedQuestions.list({ reviewed });
        res.json({ total: filtered.length, questions: filtered.slice(-50) });
    });

    // Approve/reject a generated question
    router.patch('/questions/generated/:id', authMiddleware, async (req, res) => {
        const { id } = req.params;
        const { approved, specialty } = req.body;
        const result = await dal.generatedQuestions.review(id, {
            approved,
            reviewedBy: req.userId,
            specialty
        });
        if (!result) {
            return res.status(404).json({ error: 'Question not found' });
        }
        res.json({ success: true });
    });

    return router;
}
