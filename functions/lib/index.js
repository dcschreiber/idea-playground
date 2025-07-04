"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.health = exports.validateTitle = exports.reorderIdeas = exports.deleteIdea = exports.updateIdea = exports.createIdea = exports.getDimensions = exports.getIdeas = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const cors = require("cors");
// Initialize Firebase Admin
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
// CORS middleware
const corsHandler = cors({ origin: true });
// Helper function to wrap Firebase Functions with CORS
function withCors(handler) {
    return (req, res) => {
        return corsHandler(req, res, () => handler(req, res));
    };
}
// GET /ideas - Get all ideas
exports.getIdeas = (0, https_1.onRequest)(withCors(async (req, res) => {
    try {
        const ideasCollection = db.collection('ideas');
        const snapshot = await ideasCollection.orderBy('order').get();
        const ideas = {};
        snapshot.forEach((doc) => {
            ideas[doc.id] = doc.data();
        });
        res.json({ ideas });
    }
    catch (error) {
        console.error('Error fetching ideas:', error);
        res.status(500).json({ error: 'Failed to fetch ideas' });
    }
}));
// GET /dimensions - Get dimensions registry
exports.getDimensions = (0, https_1.onRequest)(withCors(async (req, res) => {
    try {
        const dimensionsDoc = await db.collection('config').doc('dimensions').get();
        if (!dimensionsDoc.exists) {
            // Return default dimensions if not found
            const defaultDimensions = {
                dimensions_registry: {
                    core_dimensions: {
                        max_dimensions: 4,
                        fields: ["technology", "business", "research", "personal"]
                    },
                    readiness_scale: {
                        levels: 5,
                        labels: ["idea", "concept", "prototype", "beta", "production"]
                    },
                    complexity_scale: {
                        levels: 5,
                        labels: ["trivial", "easy", "medium", "hard", "expert"]
                    }
                }
            };
            res.json(defaultDimensions);
        }
        else {
            res.json(dimensionsDoc.data());
        }
    }
    catch (error) {
        console.error('Error fetching dimensions:', error);
        res.status(500).json({ error: 'Failed to fetch dimensions' });
    }
}));
// POST /ideas - Create new idea
exports.createIdea = (0, https_1.onRequest)(withCors(async (req, res) => {
    try {
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }
        const ideaData = req.body;
        // Validate title uniqueness
        const existingIdeas = await db.collection('ideas').where('title', '==', ideaData.title).get();
        if (!existingIdeas.empty) {
            res.status(400).json({ error: 'Title already exists' });
            return;
        }
        // Get next order number
        const allIdeas = await db.collection('ideas').orderBy('order', 'desc').limit(1).get();
        const nextOrder = allIdeas.empty ? 1 : (allIdeas.docs[0].data().order + 1);
        // Add timestamps and order
        const newIdea = Object.assign(Object.assign({}, ideaData), { order: nextOrder, createdAt: firestore_1.FieldValue.serverTimestamp(), updatedAt: firestore_1.FieldValue.serverTimestamp() });
        const docRef = await db.collection('ideas').add(newIdea);
        res.json(Object.assign({ id: docRef.id }, newIdea));
    }
    catch (error) {
        console.error('Error creating idea:', error);
        res.status(500).json({ error: 'Failed to create idea' });
    }
}));
// PUT /ideas/:id - Update idea
exports.updateIdea = (0, https_1.onRequest)(withCors(async (req, res) => {
    try {
        if (req.method !== 'PUT') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }
        const ideaId = req.query.id;
        if (!ideaId) {
            res.status(400).json({ error: 'Idea ID required' });
            return;
        }
        const updateData = req.body;
        // Check if title changed and if new title already exists
        if (updateData.title) {
            const existingIdeas = await db.collection('ideas')
                .where('title', '==', updateData.title)
                .get();
            if (!existingIdeas.empty && existingIdeas.docs[0].id !== ideaId) {
                res.status(400).json({ error: 'Title already exists' });
                return;
            }
        }
        // Update with timestamp
        const updatedIdea = Object.assign(Object.assign({}, updateData), { updatedAt: firestore_1.FieldValue.serverTimestamp() });
        await db.collection('ideas').doc(ideaId).update(updatedIdea);
        res.json(Object.assign({ id: ideaId }, updatedIdea));
    }
    catch (error) {
        console.error('Error updating idea:', error);
        res.status(500).json({ error: 'Failed to update idea' });
    }
}));
// DELETE /ideas/:id - Delete idea
exports.deleteIdea = (0, https_1.onRequest)(withCors(async (req, res) => {
    try {
        if (req.method !== 'DELETE') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }
        const ideaId = req.query.id;
        if (!ideaId) {
            res.status(400).json({ error: 'Idea ID required' });
            return;
        }
        await db.collection('ideas').doc(ideaId).delete();
        res.json({ message: 'Idea deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting idea:', error);
        res.status(500).json({ error: 'Failed to delete idea' });
    }
}));
// PUT /ideas/reorder - Reorder ideas
exports.reorderIdeas = (0, https_1.onRequest)(withCors(async (req, res) => {
    try {
        if (req.method !== 'PUT') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }
        const { reorderedIds } = req.body;
        if (!Array.isArray(reorderedIds)) {
            res.status(400).json({ error: 'reorderedIds must be an array' });
            return;
        }
        // Update orders in batch
        const batch = db.batch();
        reorderedIds.forEach((id, index) => {
            const ideaRef = db.collection('ideas').doc(id);
            batch.update(ideaRef, {
                order: index + 1,
                updatedAt: firestore_1.FieldValue.serverTimestamp()
            });
        });
        await batch.commit();
        res.json({ message: 'Ideas reordered successfully' });
    }
    catch (error) {
        console.error('Error reordering ideas:', error);
        res.status(500).json({ error: 'Failed to reorder ideas' });
    }
}));
// GET /validate-title - Validate title uniqueness
exports.validateTitle = (0, https_1.onRequest)(withCors(async (req, res) => {
    try {
        const title = req.query.title;
        const excludeId = req.query.excludeId;
        if (!title) {
            res.status(400).json({ error: 'Title parameter required' });
            return;
        }
        let query = db.collection('ideas').where('title', '==', title);
        const snapshot = await query.get();
        // If excludeId is provided, check if the found idea is the same one being edited
        const isValid = snapshot.empty ||
            (excludeId && snapshot.docs.length === 1 && snapshot.docs[0].id === excludeId);
        res.json({ isValid });
    }
    catch (error) {
        console.error('Error validating title:', error);
        res.status(500).json({ error: 'Failed to validate title' });
    }
}));
// Health check endpoint
exports.health = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            service: 'Firebase Functions'
        });
    }
    catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
//# sourceMappingURL=index.js.map