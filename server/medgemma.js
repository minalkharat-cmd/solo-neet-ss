// MedGemma Integration Service for Clinical Reasoning Tutor
// Uses Google's MedGemma model via Kaggle Models API / Vertex AI

const MEDGEMMA_API_URL = process.env.MEDGEMMA_API_URL || 'https://generativelanguage.googleapis.com/v1beta';
const MEDGEMMA_API_KEY = process.env.MEDGEMMA_API_KEY || process.env.GEMINI_API_KEY;
const MEDGEMMA_MODEL = process.env.MEDGEMMA_MODEL || 'medgemma-27b-text-it';

// Fallback to Gemini if MedGemma not available
const FALLBACK_MODEL = 'gemini-2.0-flash';

/**
 * Call MedGemma (or Gemini fallback) with a prompt
 */
async function callMedGemma(prompt, options = {}) {
    const apiKey = MEDGEMMA_API_KEY;
    if (!apiKey) {
        throw new Error('MEDGEMMA_API_KEY or GEMINI_API_KEY not configured');
    }

    const model = options.model || MEDGEMMA_MODEL;
    const url = `${MEDGEMMA_API_URL}/models/${model}:generateContent?key=${apiKey}`;

    const body = {
        contents: [{
            parts: [{ text: prompt }]
        }],
        generationConfig: {
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.maxTokens || 2048,
            topP: 0.95,
        },
        safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ]
    };

    // Add image if provided (multimodal)
    if (options.imageBase64) {
        body.contents[0].parts.unshift({
            inlineData: {
                mimeType: options.imageMimeType || 'image/jpeg',
                data: options.imageBase64
            }
        });
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.text();
            // Try fallback model
            if (model !== FALLBACK_MODEL) {
                console.warn(`MedGemma call failed (${model}), falling back to ${FALLBACK_MODEL}`);
                return callMedGemma(prompt, { ...options, model: FALLBACK_MODEL });
            }
            throw new Error(`MedGemma API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Empty response from MedGemma');

        return {
            text,
            model,
            tokensUsed: data.usageMetadata?.totalTokenCount || 0
        };
    } catch (error) {
        if (model !== FALLBACK_MODEL) {
            console.warn(`MedGemma error, falling back: ${error.message}`);
            return callMedGemma(prompt, { ...options, model: FALLBACK_MODEL });
        }
        throw error;
    }
}

/**
 * Generate Socratic feedback for a student's reasoning step
 */
async function evaluateReasoning(caseData, studentResponse, step, conversationHistory = []) {
    const historyText = conversationHistory.map(h =>
        `${h.role === 'student' ? 'Student' : 'Tutor'}: ${h.text}`
    ).join('\n');

    const prompt = `You are an expert clinical reasoning tutor using Socratic method. You are teaching a medical student to think through a clinical case systematically.

CLINICAL CASE:
${caseData.presentation}

PATIENT VITALS: ${caseData.vitals || 'Not yet obtained'}
LAB RESULTS: ${JSON.stringify(caseData.labs || 'Not yet ordered')}
IMAGING: ${caseData.imagingDescription || 'Not yet ordered'}

CURRENT STEP: ${step}
${historyText ? `\nCONVERSATION SO FAR:\n${historyText}` : ''}

STUDENT'S RESPONSE: "${studentResponse}"

CORRECT DIAGNOSIS: ${caseData.diagnosis} (DO NOT reveal this directly)

Instructions:
- If the student is on the right track, encourage them and guide deeper with follow-up questions
- If they are wrong or missing key findings, ask leading questions that help them discover the error
- Never give the answer directly - help them reason through it
- Keep responses concise (2-4 sentences)
- If this is the "differential" step, evaluate their differential diagnosis list
- If this is the "final_diagnosis" step, reveal whether they are correct and explain why
- Reference specific clinical findings from the case to support teaching points
- Use clinical reasoning frameworks (e.g., "What are the most common causes of X in this demographic?")

Respond as JSON: {"feedback": "your response", "quality": "excellent|good|fair|poor", "hint": "optional subtle hint if struggling", "isCorrect": true/false (only for final_diagnosis step)}`;

    const result = await callMedGemma(prompt, { temperature: 0.6, maxTokens: 512 });

    try {
        // Try to parse JSON from the response
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (e) {
        // Fallback: return raw text as feedback
    }

    return {
        feedback: result.text,
        quality: 'good',
        hint: null,
        isCorrect: null
    };
}

/**
 * Generate a clinical case from a specialty and difficulty
 */
async function generateClinicalCase(specialty, difficulty = 'medium') {
    const prompt = `Generate a clinical case for medical education in ${specialty} at ${difficulty} difficulty level.

Create a realistic clinical vignette that tests diagnostic reasoning. Return ONLY valid JSON in this exact format:

{
    "id": "case_${Date.now()}",
    "specialty": "${specialty}",
    "difficulty": "${difficulty}",
    "title": "Brief case title (e.g., '45-year-old with acute chest pain')",
    "presentation": "Detailed clinical vignette (3-5 sentences) including chief complaint, HPI, relevant PMH. Include specific clinical details that are diagnostically important.",
    "vitals": "HR: X, BP: X/X, RR: X, Temp: X°F, SpO2: X%",
    "physicalExam": "Key positive and negative physical exam findings (2-3 sentences)",
    "labs": {
        "CBC": "Key values",
        "BMP": "Key values",
        "Other": "Relevant lab values for this case"
    },
    "imagingDescription": "Description of relevant imaging findings (what the image would show)",
    "imagingModality": "CXR|CT|MRI|ECG|Echocardiogram|Endoscopy|Other",
    "diagnosis": "The correct diagnosis",
    "keyFindings": ["finding1", "finding2", "finding3"],
    "differentials": ["correct_diagnosis", "plausible_differential_1", "plausible_differential_2", "plausible_differential_3"],
    "teachingPoints": ["point1", "point2", "point3"],
    "references": "Relevant medical reference",
    "reasoningSteps": [
        {"step": "history", "keyInsight": "What the student should notice in the history"},
        {"step": "exam", "keyInsight": "What the physical exam reveals"},
        {"step": "labs", "keyInsight": "What lab findings are critical"},
        {"step": "imaging", "keyInsight": "What imaging shows"},
        {"step": "synthesis", "keyInsight": "How findings come together for diagnosis"}
    ]
}`;

    const result = await callMedGemma(prompt, { temperature: 0.8, maxTokens: 2048 });

    try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const caseData = JSON.parse(jsonMatch[0]);
            caseData.generatedBy = 'medgemma';
            caseData.model = result.model;
            caseData.generatedAt = new Date().toISOString();
            return caseData;
        }
    } catch (e) {
        console.error('Failed to parse generated case:', e);
    }

    throw new Error('Failed to generate valid clinical case');
}

/**
 * Score a completed clinical reasoning session
 */
async function scoreSession(caseData, conversationHistory) {
    const historyText = conversationHistory.map(h =>
        `${h.role === 'student' ? 'Student' : 'Tutor'}: ${h.text}`
    ).join('\n');

    const prompt = `Score this medical student's clinical reasoning session.

CASE: ${caseData.title}
CORRECT DIAGNOSIS: ${caseData.diagnosis}

FULL CONVERSATION:
${historyText}

Score the student on these dimensions (0-100 each):
1. History gathering: Did they ask relevant questions?
2. Physical exam interpretation: Did they identify key findings?
3. Differential diagnosis: Was their differential appropriate and ranked?
4. Test ordering: Were investigations appropriate and efficient?
5. Clinical reasoning: Was their reasoning logical and systematic?
6. Final diagnosis: Did they reach the correct diagnosis?

Return ONLY valid JSON:
{
    "scores": {
        "history": 0-100,
        "physicalExam": 0-100,
        "differential": 0-100,
        "investigations": 0-100,
        "reasoning": 0-100,
        "diagnosis": 0-100
    },
    "overallScore": 0-100,
    "overallGrade": "A|B|C|D|F",
    "strengths": ["strength1", "strength2"],
    "areasToImprove": ["area1", "area2"],
    "summary": "2-3 sentence summary of performance",
    "xpAwarded": number between 50-200 based on performance
}`;

    const result = await callMedGemma(prompt, { temperature: 0.3, maxTokens: 1024 });

    try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (e) {
        console.error('Failed to parse session score:', e);
    }

    return {
        scores: { history: 50, physicalExam: 50, differential: 50, investigations: 50, reasoning: 50, diagnosis: 50 },
        overallScore: 50,
        overallGrade: 'C',
        strengths: ['Completed the session'],
        areasToImprove: ['Practice more clinical cases'],
        summary: 'Session completed. Continue practicing clinical reasoning skills.',
        xpAwarded: 75
    };
}

/**
 * Analyze a medical image with MedGemma
 */
async function analyzeMedicalImage(imageBase64, mimeType, context = '') {
    const prompt = `You are a medical imaging expert. Analyze this medical image and provide findings.
${context ? `Clinical context: ${context}` : ''}

Describe:
1. Modality and view
2. Key findings (positive and negative)
3. Differential diagnosis based on imaging
4. Recommended next steps

Be specific and use proper medical terminology.`;

    return callMedGemma(prompt, {
        imageBase64,
        imageMimeType: mimeType,
        temperature: 0.4,
        maxTokens: 1024
    });
}

/**
 * Check if MedGemma API is configured and accessible
 */
async function checkStatus() {
    const configured = !!MEDGEMMA_API_KEY;
    if (!configured) {
        return { available: false, error: 'API key not configured' };
    }

    try {
        const result = await callMedGemma('Respond with "OK" if you are working.', {
            maxTokens: 10,
            temperature: 0
        });
        return {
            available: true,
            model: result.model,
            tokensUsed: result.tokensUsed
        };
    } catch (error) {
        return { available: false, error: error.message };
    }
}

export {
    callMedGemma,
    evaluateReasoning,
    generateClinicalCase,
    scoreSession,
    analyzeMedicalImage,
    checkStatus
};
