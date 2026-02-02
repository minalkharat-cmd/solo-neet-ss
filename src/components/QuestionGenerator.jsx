import { useState, useEffect } from 'react';
import api from '../services/api';

// Question Generator - PubMed Integration Component
export default function QuestionGenerator({ onClose, onQuestionGenerated }) {
    const [query, setQuery] = useState('');
    const [articles, setArticles] = useState([]);
    const [selectedPmids, setSelectedPmids] = useState([]);
    const [specialty, setSpecialty] = useState('general');
    const [generatedQuestions, setGeneratedQuestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState('search'); // search, preview, generate, review

    const specialties = [
        { id: 'general', name: 'General' },
        { id: 'cardiology', name: 'Cardiology' },
        { id: 'neurology', name: 'Neurology' },
        { id: 'gastroenterology', name: 'Gastroenterology' },
        { id: 'nephrology', name: 'Nephrology' },
        { id: 'pulmonology', name: 'Pulmonology' },
        { id: 'oncology', name: 'Oncology' },
        { id: 'endocrinology', name: 'Endocrinology' },
        { id: 'rheumatology', name: 'Rheumatology' },
        { id: 'hematology', name: 'Hematology' },
        { id: 'infectious', name: 'Infectious Diseases' },
        { id: 'critical', name: 'Critical Care' },
        { id: 'neonatology', name: 'Neonatology' },
    ];

    const handleSearch = async () => {
        if (!query.trim() || query.length < 3) {
            setError('Enter at least 3 characters');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/pubmed/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, limit: 5 }),
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error);

            setArticles(data.articles);
            setSelectedPmids([]);
            setStep('preview');
        } catch (err) {
            setError(err.message || 'Failed to search PubMed');
        } finally {
            setLoading(false);
        }
    };

    const toggleArticle = (pmid) => {
        setSelectedPmids(prev =>
            prev.includes(pmid)
                ? prev.filter(id => id !== pmid)
                : [...prev, pmid]
        );
    };

    const handleGenerate = async () => {
        if (selectedPmids.length === 0) {
            setError('Select at least one article');
            return;
        }

        setGenerating(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/pubmed/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ pmids: selectedPmids, specialty }),
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error);

            setGeneratedQuestions(data.questions);
            setStep('review');

            if (onQuestionGenerated) {
                onQuestionGenerated(data.questions);
            }
        } catch (err) {
            setError(err.message || 'Failed to generate questions');
        } finally {
            setGenerating(false);
        }
    };

    const resetSearch = () => {
        setQuery('');
        setArticles([]);
        setSelectedPmids([]);
        setGeneratedQuestions([]);
        setStep('search');
        setError('');
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal system-window question-generator" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
                <button className="modal-close" onClick={onClose}>×</button>

                <h2 className="modal-title">🧬 PubMed Question Generator</h2>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>
                    Generate high-yield MCQs from latest medical literature
                </p>

                {error && (
                    <div style={{ background: 'rgba(255,71,87,0.2)', border: '1px solid var(--color-danger)', padding: '10px', borderRadius: '8px', marginBottom: '15px', color: 'var(--color-danger)' }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* Step 1: Search */}
                {step === 'search' && (
                    <div className="search-step">
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="e.g., STEMI management 2024, diabetic nephropathy treatment..."
                                style={{
                                    flex: 1,
                                    padding: '12px 16px',
                                    fontSize: '1rem',
                                    border: '2px solid var(--color-primary)',
                                    borderRadius: '8px',
                                    background: 'var(--color-bg-elevated)',
                                    color: 'var(--color-text-primary)',
                                    outline: 'none'
                                }}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            <button
                                className="btn btn-primary"
                                onClick={handleSearch}
                                disabled={loading}
                                style={{ minWidth: '120px' }}
                            >
                                {loading ? '🔄 Searching...' : '🔍 Search'}
                            </button>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Specialty:</label>
                            <select
                                value={specialty}
                                onChange={(e) => setSpecialty(e.target.value)}
                                style={{
                                    marginLeft: '10px',
                                    padding: '8px 12px',
                                    border: '1px solid var(--color-primary)',
                                    borderRadius: '6px',
                                    background: 'var(--color-bg-elevated)',
                                    color: 'var(--color-text-primary)'
                                }}
                            >
                                {specialties.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                            <p style={{ fontSize: '3rem', marginBottom: '10px' }}>📚</p>
                            <p>Search PubMed for recent medical literature to generate MCQs</p>
                        </div>
                    </div>
                )}

                {/* Step 2: Preview Articles */}
                {step === 'preview' && (
                    <div className="preview-step">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <span style={{ color: 'var(--color-text-secondary)' }}>
                                Found {articles.length} articles for "{query}"
                            </span>
                            <button className="btn btn-secondary" onClick={resetSearch} style={{ fontSize: '0.8rem' }}>
                                ← New Search
                            </button>
                        </div>

                        <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '15px' }}>
                            {articles.map((article) => (
                                <div
                                    key={article.pmid}
                                    onClick={() => toggleArticle(article.pmid)}
                                    style={{
                                        padding: '15px',
                                        marginBottom: '10px',
                                        background: selectedPmids.includes(article.pmid) ? 'rgba(123,104,238,0.2)' : 'var(--color-bg-elevated)',
                                        border: selectedPmids.includes(article.pmid) ? '2px solid var(--color-primary)' : '1px solid rgba(123,104,238,0.2)',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                        <div style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '4px',
                                            border: '2px solid var(--color-primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            background: selectedPmids.includes(article.pmid) ? 'var(--color-primary)' : 'transparent'
                                        }}>
                                            {selectedPmids.includes(article.pmid) && <span style={{ color: '#fff' }}>✓</span>}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ margin: '0 0 5px', fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>{article.title}</h4>
                                            <p style={{ margin: '0 0 5px', fontSize: '0.8rem', color: 'var(--color-accent)' }}>{article.authors}</p>
                                            <p style={{ margin: '0 0 8px', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{article.journal} ({article.year}) | PMID: {article.pmid}</p>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{article.abstract}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                                {selectedPmids.length} article(s) selected
                            </span>
                            <button
                                className="btn btn-primary"
                                onClick={handleGenerate}
                                disabled={generating || selectedPmids.length === 0}
                                style={{ minWidth: '180px' }}
                            >
                                {generating ? '🧬 Generating...' : '✨ Generate MCQs'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Review Generated Questions */}
                {step === 'review' && (
                    <div className="review-step">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <span style={{ color: 'var(--color-success)' }}>
                                ✅ Generated {generatedQuestions.length} question(s)
                            </span>
                            <button className="btn btn-secondary" onClick={resetSearch} style={{ fontSize: '0.8rem' }}>
                                Generate More
                            </button>
                        </div>

                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {generatedQuestions.map((q, idx) => (
                                <div key={q.id || idx} style={{
                                    padding: '15px',
                                    marginBottom: '15px',
                                    background: 'var(--color-bg-elevated)',
                                    border: '1px solid rgba(123,104,238,0.3)',
                                    borderRadius: '8px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <span style={{
                                            background: q.difficulty === 'hard' ? 'var(--color-danger)' : q.difficulty === 'easy' ? 'var(--color-success)' : 'var(--color-primary)',
                                            color: '#fff',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600
                                        }}>
                                            {q.difficulty?.toUpperCase()} • {q.xp} XP
                                        </span>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
                                            PMID: {q.source?.pmid}
                                        </span>
                                    </div>

                                    <p style={{ margin: '0 0 12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{q.question}</p>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                                        {q.options.map((opt, i) => (
                                            <div key={i} style={{
                                                padding: '8px 12px',
                                                borderRadius: '4px',
                                                fontSize: '0.85rem',
                                                background: i === q.correct ? 'rgba(46,213,115,0.2)' : 'rgba(0,0,0,0.2)',
                                                border: i === q.correct ? '1px solid var(--color-success)' : '1px solid transparent',
                                                color: i === q.correct ? 'var(--color-success)' : 'var(--color-text-secondary)'
                                            }}>
                                                {String.fromCharCode(65 + i)}. {opt}
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{
                                        padding: '10px',
                                        background: 'rgba(0,212,255,0.1)',
                                        borderRadius: '4px',
                                        fontSize: '0.85rem',
                                        color: 'var(--color-accent)'
                                    }}>
                                        💡 {q.explanation}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '15px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                            Questions have been saved and will appear in the question bank after review.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
