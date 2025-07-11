import { Router, Request, Response } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreDb } from '../services/firestore';
import { asyncHandler, createApiError } from '../middleware/errorHandler';
import { Idea, ReorderRequest, ValidationResponse } from '../types';

const router = Router();

// GET /api/ideas - Get all ideas
router.get('/', asyncHandler(async (req, res) => {
  const db = getFirestoreDb();
  const ideasCollection = db.collection('ideas');
  const snapshot = await ideasCollection.orderBy('order').get();
  
  const ideas: Record<string, Idea> = {};
  snapshot.forEach((doc) => {
    ideas[doc.id] = doc.data() as Idea;
  });

  res.json({ ideas });
}));

// POST /api/ideas - Create new idea
router.post('/', asyncHandler(async (req, res) => {
  const db = getFirestoreDb();
  const ideaData = req.body as Idea;
  
  // Validate required fields
  if (!ideaData.title || !ideaData.content) {
    throw createApiError('Title and content are required', 400);
  }
  
  // Validate title uniqueness
  const existingIdeas = await db.collection('ideas').where('title', '==', ideaData.title).get();
  if (!existingIdeas.empty) {
    throw createApiError('Title already exists', 400);
  }

  // Get next order number
  const allIdeas = await db.collection('ideas').orderBy('order', 'desc').limit(1).get();
  const nextOrder = allIdeas.empty ? 1 : (allIdeas.docs[0].data().order + 1);

  // Add timestamps and order
  const newIdea: Idea = {
    ...ideaData,
    order: nextOrder,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };

  const docRef = await db.collection('ideas').add(newIdea);
  res.status(201).json({ id: docRef.id, ...newIdea });
}));

// GET /api/ideas/:id - Get specific idea
router.get('/:id', asyncHandler(async (req, res) => {
  const db = getFirestoreDb();
  const ideaDoc = await db.collection('ideas').doc(req.params.id).get();
  
  if (!ideaDoc.exists) {
    throw createApiError('Idea not found', 404);
  }
  
  res.json({ id: ideaDoc.id, ...ideaDoc.data() });
}));

// PUT /api/ideas/:id - Update idea
router.put('/:id', asyncHandler(async (req, res) => {
  const db = getFirestoreDb();
  const ideaId = req.params.id;
  const updateData = req.body as Partial<Idea>;
  
  // Check if idea exists
  const ideaDoc = await db.collection('ideas').doc(ideaId).get();
  if (!ideaDoc.exists) {
    throw createApiError('Idea not found', 404);
  }
  
  // Check if title changed and if new title already exists
  if (updateData.title) {
    const existingIdeas = await db.collection('ideas')
      .where('title', '==', updateData.title)
      .get();
    
    if (!existingIdeas.empty && existingIdeas.docs[0].id !== ideaId) {
      throw createApiError('Title already exists', 400);
    }
  }

  // Update with timestamp
  const updatedIdea = {
    ...updateData,
    updatedAt: FieldValue.serverTimestamp()
  };

  await db.collection('ideas').doc(ideaId).update(updatedIdea);
  res.json({ id: ideaId, ...updatedIdea });
}));

// DELETE /api/ideas/:id - Delete idea
router.delete('/:id', asyncHandler(async (req, res) => {
  const db = getFirestoreDb();
  const ideaId = req.params.id;
  
  // Check if idea exists
  const ideaDoc = await db.collection('ideas').doc(ideaId).get();
  if (!ideaDoc.exists) {
    throw createApiError('Idea not found', 404);
  }
  
  await db.collection('ideas').doc(ideaId).delete();
  res.json({ message: 'Idea deleted successfully' });
}));

// PUT /api/ideas/reorder - Reorder ideas
router.put('/reorder', asyncHandler(async (req, res) => {
  const db = getFirestoreDb();
  const { reorderedIds } = req.body as ReorderRequest;
  
  if (!Array.isArray(reorderedIds)) {
    throw createApiError('reorderedIds must be an array', 400);
  }

  // Update orders in batch
  const batch = db.batch();
  reorderedIds.forEach((id: string, index: number) => {
    const ideaRef = db.collection('ideas').doc(id);
    batch.update(ideaRef, { 
      order: index + 1,
      updatedAt: FieldValue.serverTimestamp()
    });
  });

  await batch.commit();
  res.json({ message: 'Ideas reordered successfully' });
}));

// POST /api/ideas/validate-title - Validate title uniqueness
router.post('/validate-title', asyncHandler(async (req, res) => {
  const db = getFirestoreDb();
  const { title, excludeId } = req.body as { title: string; excludeId?: string };

  if (!title) {
    throw createApiError('Title is required', 400);
  }

  const existingIdeas = await db.collection('ideas')
    .where('title', '==', title)
    .get();

  let isValid = true;
  let conflictingId: string | undefined;
  let conflictingTitle: string | undefined;

  if (!existingIdeas.empty) {
    const conflictingDoc = existingIdeas.docs.find(doc => doc.id !== excludeId);
    if (conflictingDoc) {
      isValid = false;
      conflictingId = conflictingDoc.id;
      conflictingTitle = conflictingDoc.data().title;
    }
  }

  const response: ValidationResponse = {
    isValid,
    conflictingId,
    conflictingTitle
  };

  res.json(response);
}));

export { router as ideasRouter }; 