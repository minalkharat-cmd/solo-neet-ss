// Clinical Arena Routes - Backend API for Clinical Reasoning Tutor
import { getCases, getRandomCase, getCaseById, getSpecialtyCounts } from './clinicalCases.js';
import { evaluateReasoning, generateClinicalCase, scoreSession, checkStatus as checkMedGemmaStatus } from './medgemma.js';

export function registerClinicalArenaRoutes(app, db, authMiddleware) {

    // ============ CASE MANAGEMENT ============

    // Get available cases (with filters)
    app.get('/api/arena/cases', (req, res) => {
        const { specialty, difficulty } = req.query;
        const cases = getCases({ specialty, difficulty });

        // Don't send full case data (hide diagnosis, keyFindings etc.)
        const safeCases = cases.map(c => ({
            id: c.id,
            specialty: c.specialty,
            difficulty: c.difficulty,
            title: c.title,
            xpReward: c.xpReward
        }));

        res.json({
            total: safeCases.length,
            cases: safeCases,
            specialtyCounts: getSpecialtyCounts()
        });
    });

    // Start a clinical case session
    app.post('/api/arena/start', authMiddleware, async (req, res) => {
        try {
            const { caseId, specialty, difficulty } = req.body;

            let caseData;
            if (caseId) {
                caseData = getCaseById(caseId);
            } else if (specialty) {
                caseData = getRandomCase({ specialty, difficulty });
            } else {
                caseData = getRandomCase({ difficulty });
            }

            if (!caseData) {
                return res.status(404).json({ error: 'No case found matching criteria' });
            }

            // Create a session
            await db.read();
            if (!db.data.arenaSessions) db.data.arenaSessions = [];

            const sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
            const session = {
                id: sessionId,
                userId: req.userId,
                caseId: caseData.id,
                startedAt: new Date().toISOString(),
                currentStep: 'history',
                conversation: [],
                stepsCompleted: [],
                status: 'active'
            };

            db.data.arenaSessions.push(session);
            await db.write();

            // Send case data for the student (hide diagnosis-related fields)
            res.json({
                sessionId,
                case: {
                    id: caseData.id,
                    specialty: caseData.specialty,
                    difficulty: caseData.difficulty,
                    title: caseData.title,
                    presentation: caseData.presentation,
                    // Other data revealed step by step
                },
                currentStep: 'history',
                steps: ['history', 'exam', 'differential', 'investigations', 'diagnosis'],
                xpReward: caseData.xpReward
            });
        } catch (error) {
            console.error('Arena start error:', error);
            res.status(500).json({ error: 'Failed to start case' });
        }
    });

    // Submit reasoning for a step
    app.post('/api/arena/reason', authMiddleware, async (req, res) => {
        try {
            const { sessionId, response: studentResponse, step } = req.body;

            if (!sessionId || !studentResponse) {
                return res.status(400).json({ error: 'sessionId and response required' });
            }

            await db.read();
            if (!db.data.arenaSessions) db.data.arenaSessions = [];

            const session = db.data.arenaSessions.find(
                s => s.id === sessionId && s.userId === req.userId && s.status === 'active'
            );

            if (!session) {
                return res.status(404).json({ error: 'Active session not found' });
            }

            const caseData = getCaseById(session.caseId);
            if (!caseData) {
                return res.status(404).json({ error: 'Case not found' });
            }

            const currentStep = step || session.currentStep;

            // Add student response to conversation
            session.conversation.push({
                role: 'student',
                text: studentResponse,
                step: currentStep,
                timestamp: new Date().toISOString()
            });

            // Get AI feedback using MedGemma
            let feedback;
            try {
                feedback = await evaluateReasoning(
                    caseData,
                    studentResponse,
                    currentStep,
                    session.conversation
                );
            } catch (aiError) {
                console.warn('MedGemma reasoning evaluation failed, using rule-based:', aiError.message);
                feedback = getRuleBasedFeedback(caseData, studentResponse, currentStep);
            }

            // Add tutor response to conversation
            session.conversation.push({
                role: 'tutor',
                text: feedback.feedback,
                quality: feedback.quality,
                hint: feedback.hint,
                step: currentStep,
                timestamp: new Date().toISOString()
            });

            await db.write();

            // Determine what data to reveal for this step
            const revealedData = getRevealedData(caseData, currentStep);

            res.json({
                feedback: feedback.feedback,
                quality: feedback.quality,
                hint: feedback.hint,
                isCorrect: feedback.isCorrect,
                revealedData,
                currentStep
            });
        } catch (error) {
            console.error('Arena reasoning error:', error);
            res.status(500).json({ error: 'Failed to process reasoning' });
        }
    });

    // Advance to next step
    app.post('/api/arena/next-step', authMiddleware, async (req, res) => {
        try {
            const { sessionId } = req.body;

            await db.read();
            const session = db.data.arenaSessions?.find(
                s => s.id === sessionId && s.userId === req.userId && s.status === 'active'
            );

            if (!session) {
                return res.status(404).json({ error: 'Active session not found' });
            }

            const caseData = getCaseById(session.caseId);
            const steps = ['history', 'exam', 'differential', 'investigations', 'diagnosis'];
            const currentIndex = steps.indexOf(session.currentStep);

            if (currentIndex >= steps.length - 1) {
                return res.status(400).json({ error: 'Already at final step' });
            }

            // Mark current step as completed
            if (!session.stepsCompleted.includes(session.currentStep)) {
                session.stepsCompleted.push(session.currentStep);
            }

            // Move to next step
            session.currentStep = steps[currentIndex + 1];
            await db.write();

            // Get data to reveal for the new step
            const revealedData = getRevealedData(caseData, session.currentStep);

            res.json({
                currentStep: session.currentStep,
                stepsCompleted: session.stepsCompleted,
                revealedData,
                isLastStep: session.currentStep === 'diagnosis'
            });
        } catch (error) {
            console.error('Arena next-step error:', error);
            res.status(500).json({ error: 'Failed to advance step' });
        }
    });

    // Complete session and get score
    app.post('/api/arena/complete', authMiddleware, async (req, res) => {
        try {
            const { sessionId } = req.body;

            await db.read();
            const session = db.data.arenaSessions?.find(
                s => s.id === sessionId && s.userId === req.userId && s.status === 'active'
            );

            if (!session) {
                return res.status(404).json({ error: 'Active session not found' });
            }

            const caseData = getCaseById(session.caseId);

            // Score the session
            let score;
            try {
                score = await scoreSession(caseData, session.conversation);
            } catch (scoreError) {
                console.warn('MedGemma scoring failed, using rule-based:', scoreError.message);
                score = getRuleBasedScore(caseData, session);
            }

            // Mark session as complete
            session.status = 'completed';
            session.completedAt = new Date().toISOString();
            session.score = score;

            // Track XP in arena stats
            if (!db.data.arenaStats) db.data.arenaStats = [];
            db.data.arenaStats.push({
                userId: req.userId,
                sessionId: session.id,
                caseId: caseData.id,
                specialty: caseData.specialty,
                difficulty: caseData.difficulty,
                overallScore: score.overallScore,
                grade: score.overallGrade,
                xpAwarded: score.xpAwarded,
                completedAt: new Date().toISOString()
            });

            await db.write();

            res.json({
                score,
                case: {
                    diagnosis: caseData.diagnosis,
                    keyFindings: caseData.keyFindings,
                    teachingPoints: caseData.teachingPoints,
                    differentials: caseData.differentials,
                    references: caseData.references
                }
            });
        } catch (error) {
            console.error('Arena complete error:', error);
            res.status(500).json({ error: 'Failed to complete session' });
        }
    });

    // Get arena stats for a user
    app.get('/api/arena/stats', authMiddleware, async (req, res) => {
        await db.read();
        const stats = (db.data.arenaStats || []).filter(s => s.userId === req.userId);

        const totalSessions = stats.length;
        const avgScore = totalSessions > 0
            ? Math.round(stats.reduce((sum, s) => sum + s.overallScore, 0) / totalSessions)
            : 0;
        const totalXP = stats.reduce((sum, s) => sum + s.xpAwarded, 0);

        const bySpecialty = {};
        stats.forEach(s => {
            if (!bySpecialty[s.specialty]) {
                bySpecialty[s.specialty] = { sessions: 0, avgScore: 0, totalScore: 0 };
            }
            bySpecialty[s.specialty].sessions++;
            bySpecialty[s.specialty].totalScore += s.overallScore;
            bySpecialty[s.specialty].avgScore = Math.round(
                bySpecialty[s.specialty].totalScore / bySpecialty[s.specialty].sessions
            );
        });

        const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
        stats.forEach(s => {
            if (gradeDistribution[s.grade] !== undefined) gradeDistribution[s.grade]++;
        });

        res.json({
            totalSessions,
            avgScore,
            totalXP,
            bySpecialty,
            gradeDistribution,
            recentSessions: stats.slice(-10).reverse()
        });
    });

    // Check MedGemma API status
    app.get('/api/arena/ai-status', async (req, res) => {
        try {
            const status = await checkMedGemmaStatus();
            res.json(status);
        } catch (error) {
            res.json({ available: false, error: error.message });
        }
    });

    // Generate a new clinical case using AI
    app.post('/api/arena/generate-case', authMiddleware, async (req, res) => {
        try {
            const { specialty, difficulty } = req.body;
            const newCase = await generateClinicalCase(specialty || 'general medicine', difficulty || 'medium');
            res.json({ success: true, case: newCase });
        } catch (error) {
            console.error('Case generation error:', error);
            res.status(500).json({ error: 'Failed to generate case: ' + error.message });
        }
    });
}

/**
 * Get data to reveal at each reasoning step
 */
function getRevealedData(caseData, step) {
    switch (step) {
        case 'history':
            return {
                presentation: caseData.presentation,
                vitals: caseData.vitals
            };
        case 'exam':
            return {
                physicalExam: caseData.physicalExam
            };
        case 'differential':
            return {
                hint: `Consider the key findings so far: ${caseData.keyFindings.slice(0, 2).join(', ')}...`
            };
        case 'investigations':
            return {
                labs: caseData.labs,
                imagingDescription: caseData.imagingDescription,
                imagingModality: caseData.imagingModality
            };
        case 'diagnosis':
            return {
                allData: true
            };
        default:
            return {};
    }
}

/**
 * Rule-based feedback when MedGemma is unavailable
 */
function getRuleBasedFeedback(caseData, studentResponse, step) {
    const response = studentResponse.toLowerCase();
    const diagnosis = caseData.diagnosis.toLowerCase();
    const keyTerms = caseData.keyFindings.map(f => f.toLowerCase());

    let matchedTerms = 0;
    keyTerms.forEach(term => {
        const words = term.split(' ').filter(w => w.length > 3);
        if (words.some(w => response.includes(w))) matchedTerms++;
    });

    const matchRatio = keyTerms.length > 0 ? matchedTerms / keyTerms.length : 0;

    if (step === 'diagnosis') {
        const diagWords = diagnosis.split(' ').filter(w => w.length > 3);
        const isCorrect = diagWords.some(w => response.includes(w));

        return {
            feedback: isCorrect
                ? `Excellent! You correctly identified ${caseData.diagnosis}. ${caseData.teachingPoints[0]}`
                : `Not quite. The diagnosis is ${caseData.diagnosis}. Key findings that point to this: ${caseData.keyFindings.join(', ')}. ${caseData.teachingPoints[0]}`,
            quality: isCorrect ? 'excellent' : 'fair',
            hint: null,
            isCorrect
        };
    }

    const stepData = caseData.reasoningSteps.find(s => s.step === step);

    if (matchRatio >= 0.5) {
        return {
            feedback: `Good thinking! You've identified some key elements. ${stepData ? stepData.keyInsight : 'Keep building your differential.'}`,
            quality: 'good',
            hint: null,
            isCorrect: null
        };
    } else if (matchRatio > 0) {
        return {
            feedback: `You're on the right track but missing some important findings. What else do you notice about the ${step === 'history' ? 'patient history' : step === 'exam' ? 'physical examination' : 'clinical data'}?`,
            quality: 'fair',
            hint: stepData ? stepData.keyInsight : null,
            isCorrect: null
        };
    } else {
        return {
            feedback: `Let's think about this more carefully. Review the ${step === 'history' ? 'clinical presentation' : step === 'exam' ? 'physical exam findings' : 'available data'} again. What stands out as abnormal?`,
            quality: 'poor',
            hint: stepData ? stepData.keyInsight : `Look for: ${caseData.keyFindings[0]}`,
            isCorrect: null
        };
    }
}

/**
 * Rule-based scoring when MedGemma is unavailable
 */
function getRuleBasedScore(caseData, session) {
    const responses = session.conversation.filter(c => c.role === 'student');
    const tutorFeedback = session.conversation.filter(c => c.role === 'tutor');

    let qualityScores = { excellent: 100, good: 75, fair: 50, poor: 25 };
    let totalQuality = 0;
    let feedbackCount = 0;

    tutorFeedback.forEach(f => {
        if (f.quality && qualityScores[f.quality] !== undefined) {
            totalQuality += qualityScores[f.quality];
            feedbackCount++;
        }
    });

    const avgQuality = feedbackCount > 0 ? Math.round(totalQuality / feedbackCount) : 50;
    const stepsComplete = session.stepsCompleted.length;
    const completionBonus = Math.round((stepsComplete / 5) * 20);

    const overallScore = Math.min(100, avgQuality + completionBonus);
    const grade = overallScore >= 90 ? 'A' : overallScore >= 75 ? 'B' : overallScore >= 60 ? 'C' : overallScore >= 45 ? 'D' : 'F';

    const xpMap = { A: 150, B: 100, C: 75, D: 50, F: 25 };

    return {
        scores: {
            history: avgQuality,
            physicalExam: avgQuality,
            differential: avgQuality,
            investigations: avgQuality,
            reasoning: avgQuality,
            diagnosis: avgQuality
        },
        overallScore,
        overallGrade: grade,
        strengths: responses.length > 3 ? ['Thorough approach', 'Engaged with all steps'] : ['Completed the session'],
        areasToImprove: overallScore < 75 ? ['Review key clinical findings', 'Practice systematic reasoning'] : ['Continue practicing complex cases'],
        summary: `You scored ${overallScore}/100 on this case. ${grade === 'A' || grade === 'B' ? 'Strong clinical reasoning demonstrated.' : 'Keep practicing to improve your diagnostic approach.'}`,
        xpAwarded: xpMap[grade] || 50
    };
}
