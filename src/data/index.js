// Solo NEET SS - Data Index
import { subjects, questions as baseQuestions, achievements, getXPForLevel, getTotalXPForLevel, getRankFromLevel } from './questions.js';
import { expandedQuestions } from './expandedQuestions.js';

// Merge base + expanded questions per subject
const questions = {};
for (const key of Object.keys(baseQuestions)) {
    questions[key] = [...baseQuestions[key], ...(expandedQuestions[key] || [])];
}

export { subjects, questions, achievements, getXPForLevel, getTotalXPForLevel, getRankFromLevel };

// Stats
console.log(`🏥 Solo NEET SS loaded: ${subjects.length} specialties, ${Object.values(questions).reduce((sum, qs) => sum + qs.length, 0)} questions`);
