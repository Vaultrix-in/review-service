require('dotenv').config();
const connectDB = require('./config/db');
const express   = require('express');
const cors      = require('cors');
const Review    = require('./models/Review');

const app  = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3006;
connectDB();

const ok  = (res, data, status = 200) => res.status(status).json({ success: true, ...data });
const err = (res, message, status = 400) => res.status(status).json({ success: false, message });

// Dynamic review criteria per service type
const REVIEW_CRITERIA = {
    cleaning:    ['cleanliness', 'timeliness', 'professionalism'],
    electronics: ['quality', 'speed', 'value'],
    tutoring:    ['clarity', 'patience', 'knowledge'],
    plumbing:    ['workmanship', 'timeliness', 'value'],
    carpentry:   ['workmanship', 'quality', 'timeliness'],
    painting:    ['neatness', 'quality', 'timeliness'],
    design:      ['creativity', 'quality', 'communication'],
    default:     ['quality', 'timeliness', 'professionalism'],
};

// ── GET /reviews/criteria/:serviceId — Return criteria for a service ─────────
app.get('/reviews/criteria/:serviceId', (req, res) => {
    const key = req.params.serviceId.toLowerCase();
    const criteria = REVIEW_CRITERIA[key] || REVIEW_CRITERIA['default'];
    ok(res, { serviceId: key, criteria });
});

// ── POST /reviews — Submit a review (only if COMPLETED + PAID) ───────────────
app.post('/reviews', async (req, res) => {
    try {
        const { orderId, userId, serviceId, serviceName, ratings, overall, comment } = req.body;
        if (!orderId || !userId || !serviceId || !ratings || !overall)
            return err(res, 'orderId, userId, serviceId, ratings and overall are required');

        // Validate order from order-service
        const ORDER_URL = process.env.ORDER_SERVICE_URL || 'http://order-service:3002';
        const orderRes  = await fetch(`${ORDER_URL}/orders/${orderId}`);
        if (!orderRes.ok) return err(res, 'Order not found', 404);
        const { order } = await orderRes.json();

        if (order.status !== 'COMPLETED')
            return err(res, 'You can only review a COMPLETED order');
        if (order.paymentStatus !== 'PAID')
            return err(res, 'You can only review a PAID order');
        if (String(order.userId) !== String(userId))
            return err(res, 'You can only review your own order', 403);

        // Idempotent
        const existing = await Review.findOne({ orderId });
        if (existing) return err(res, 'You have already reviewed this order');

        const review = await Review.create({ orderId, userId, serviceId, serviceName, ratings, overall: Number(overall), comment });
        ok(res, { review }, 201);
    } catch (e) { err(res, e.message, 500); }
});

// ── GET /reviews/order/:orderId — Get review for a specific order ────────────
app.get('/reviews/order/:orderId', async (req, res) => {
    try {
        const review = await Review.findOne({ orderId: req.params.orderId });
        if (!review) return err(res, 'No review found for this order', 404);
        ok(res, { review });
    } catch (e) { err(res, e.message, 500); }
});

// ── GET /reviews/service/:serviceId — All public reviews for a service type ──
app.get('/reviews/service/:serviceId', async (req, res) => {
    try {
        const reviews = await Review.find({ serviceId: req.params.serviceId }).sort({ createdAt: -1 });
        const avgOverall = reviews.length
            ? (reviews.reduce((s, r) => s + r.overall, 0) / reviews.length).toFixed(1)
            : null;
        ok(res, { reviews, avgOverall, total: reviews.length });
    } catch (e) { err(res, e.message, 500); }
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'review-service' }));
app.listen(PORT, '0.0.0.0', () => console.log(`[review-service] running on port ${PORT}`));
