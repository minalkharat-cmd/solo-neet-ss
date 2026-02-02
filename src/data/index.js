// Solo NEET SS - Data Index
import { subjects, questions, achievements, getXPForLevel, getTotalXPForLevel, getRankFromLevel } from './questions.js';

export { subjects, questions, achievements, getXPForLevel, getTotalXPForLevel, getRankFromLevel };

// Stats
console.log(`🏥 Solo NEET SS loaded: ${subjects.length} specialties, ${Object.values(questions).reduce((sum, qs) => sum + qs.length, 0)} questions`);
