import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export function PremiumModal({ onClose, onSuccess, user }) {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');
    const [configured, setConfigured] = useState(false);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const res = await fetch(`${API_URL}/api/payment/plans`);
            const data = await res.json();
            setPlans(data.plans);
            setConfigured(data.configured);
        } catch (err) {
            setError('Failed to load plans');
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async (planId) => {
        if (!configured) {
            setError('Payment system is being set up. Please try again later.');
            return;
        }

        setProcessing(true);
        setError('');

        try {
            const token = localStorage.getItem('soloNeetSS_token');

            // Create order
            const orderRes = await fetch(`${API_URL}/api/payment/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ planId })
            });

            if (!orderRes.ok) {
                throw new Error('Failed to create order');
            }

            const { order } = await orderRes.json();

            // Load Razorpay
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            document.body.appendChild(script);

            script.onload = () => {
                const options = {
                    key: order.keyId,
                    amount: order.amount,
                    currency: order.currency,
                    name: 'Solo NEET SS',
                    description: order.planName,
                    order_id: order.orderId,
                    handler: async function (response) {
                        // Verify payment
                        const verifyRes = await fetch(`${API_URL}/api/payment/verify`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                orderId: response.razorpay_order_id,
                                paymentId: response.razorpay_payment_id,
                                signature: response.razorpay_signature,
                                planId
                            })
                        });

                        if (verifyRes.ok) {
                            onSuccess();
                            onClose();
                        } else {
                            setError('Payment verification failed');
                        }
                    },
                    prefill: {
                        email: user?.email || '',
                        name: user?.hunterName || user?.username || ''
                    },
                    theme: {
                        color: '#6366f1'
                    },
                    modal: {
                        ondismiss: function () {
                            setProcessing(false);
                        }
                    }
                };

                const razorpay = new window.Razorpay(options);
                razorpay.open();
            };
        } catch (err) {
            setError(err.message);
            setProcessing(false);
        }
    };

    // Premium features list
    const features = [
        { icon: '♾️', text: 'Unlimited Daily Questions' },
        { icon: '🤖', text: 'AI-Generated MCQs from PubMed' },
        { icon: '🚪', text: 'All 12 Specialty Gates Unlocked' },
        { icon: '⚔️', text: 'Unlimited PvP Battles' },
        { icon: '🚫', text: 'Ad-Free Experience' },
        { icon: '📊', text: 'Advanced Analytics Dashboard' }
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-lg system-window premium-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>

                <div className="premium-header">
                    <div className="premium-badge">👑</div>
                    <h2 className="premium-title">Upgrade to <span className="text-accent">Premium</span></h2>
                    <p className="premium-subtitle">Unlock your full potential, Hunter</p>
                </div>

                <div className="premium-features">
                    {features.map((f, i) => (
                        <div key={i} className="premium-feature">
                            <span className="feature-icon">{f.icon}</span>
                            <span className="feature-text">{f.text}</span>
                        </div>
                    ))}
                </div>

                {error && <div className="premium-error">{error}</div>}

                {loading ? (
                    <div className="premium-loading">Loading plans...</div>
                ) : (
                    <div className="premium-plans">
                        {plans.map(plan => (
                            <div key={plan.id} className={`plan-card ${plan.id === 'yearly' ? 'recommended' : ''}`}>
                                {plan.id === 'yearly' && <div className="plan-badge">Best Value</div>}
                                <h3 className="plan-name">{plan.name}</h3>
                                <div className="plan-price">
                                    <span className="price-amount">₹{plan.amount}</span>
                                    <span className="price-period">/{plan.duration === 30 ? 'month' : 'year'}</span>
                                </div>
                                {plan.id === 'yearly' && (
                                    <div className="plan-savings">Save ₹1,089/year</div>
                                )}
                                <button
                                    className="btn btn-primary plan-btn"
                                    onClick={() => handleSubscribe(plan.id)}
                                    disabled={processing}
                                >
                                    {processing ? 'Processing...' : 'Subscribe'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <p className="premium-note">
                    Secure payment via Razorpay • Cancel anytime
                </p>

                <style>{`
                    .premium-modal {
                        max-width: 500px;
                        text-align: center;
                    }
                    .premium-header {
                        margin-bottom: 24px;
                    }
                    .premium-badge {
                        font-size: 3rem;
                        margin-bottom: 12px;
                    }
                    .premium-title {
                        font-size: 1.8rem;
                        margin-bottom: 8px;
                    }
                    .premium-subtitle {
                        color: var(--text-secondary);
                    }
                    .premium-features {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 12px;
                        margin-bottom: 24px;
                        text-align: left;
                    }
                    .premium-feature {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 8px 12px;
                        background: var(--bg-secondary);
                        border-radius: 8px;
                    }
                    .feature-icon {
                        font-size: 1.2rem;
                    }
                    .feature-text {
                        font-size: 0.9rem;
                    }
                    .premium-plans {
                        display: flex;
                        gap: 16px;
                        justify-content: center;
                        margin-bottom: 16px;
                    }
                    .plan-card {
                        flex: 1;
                        max-width: 200px;
                        padding: 20px;
                        background: var(--bg-secondary);
                        border: 2px solid var(--border);
                        border-radius: 12px;
                        position: relative;
                    }
                    .plan-card.recommended {
                        border-color: var(--accent);
                    }
                    .plan-badge {
                        position: absolute;
                        top: -10px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: var(--accent);
                        color: white;
                        padding: 4px 12px;
                        border-radius: 12px;
                        font-size: 0.75rem;
                        font-weight: bold;
                    }
                    .plan-name {
                        margin-bottom: 8px;
                    }
                    .plan-price {
                        margin-bottom: 8px;
                    }
                    .price-amount {
                        font-size: 1.8rem;
                        font-weight: bold;
                        color: var(--accent);
                    }
                    .price-period {
                        color: var(--text-secondary);
                    }
                    .plan-savings {
                        color: #22c55e;
                        font-size: 0.85rem;
                        margin-bottom: 12px;
                    }
                    .plan-btn {
                        width: 100%;
                    }
                    .premium-error {
                        color: #ef4444;
                        margin-bottom: 16px;
                    }
                    .premium-loading {
                        padding: 40px;
                        color: var(--text-secondary);
                    }
                    .premium-note {
                        font-size: 0.8rem;
                        color: var(--text-secondary);
                    }
                `}</style>
            </div>
        </div>
    );
}

export default PremiumModal;
