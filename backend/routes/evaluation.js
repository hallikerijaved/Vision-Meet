const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Evaluation = require('../models/Evaluation');
const aiAnalysis = require('../services/aiAnalysis');
const blockchainService = require('../services/blockchain');

// Generate and store evaluation with blockchain certificate
router.post('/generate', auth, async (req, res) => {
  try {
    const { gdId, gdTitle, messageCount, speakingTime, contributions } = req.body;

    if (!gdId || !contributions || contributions.length === 0) {
      return res.status(400).json({ message: 'GD ID and contributions required' });
    }

    const combinedText = contributions.join(' ');
    const analysis = await aiAnalysis.analyzeCommunication(combinedText, req.user.name);

    const evaluation = new Evaluation({
      gdId,
      userId: req.user.id,
      userName: req.user.name,
      gdTitle: gdTitle || 'Group Discussion',
      scores: {
        clarity: analysis.clarity,
        relevance: analysis.relevance,
        engagement: analysis.engagement,
        professionalism: analysis.professionalism,
        totalScore: analysis.totalScore
      },
      feedback: analysis.feedback,
      strengths: analysis.strengths,
      improvements: analysis.improvements,
      messageCount: messageCount || 0,
      speakingTime: speakingTime || 0
    });

    await evaluation.save();

    if (analysis.totalScore >= 60) {
      const certificate = await blockchainService.issueCertificate({
        userName: req.user.name,
        certificateType: 'GD_EVALUATION',
        gdTitle: gdTitle || 'Group Discussion',
        score: analysis.totalScore,
        metadata: { clarity: analysis.clarity, relevance: analysis.relevance, engagement: analysis.engagement, professionalism: analysis.professionalism }
      });

      evaluation.blockchainCertificate = {
        certificateId: certificate.certificateId,
        blockHash: certificate.blockHash,
        blockIndex: certificate.blockIndex,
        timestamp: new Date()
      };
      await evaluation.save();
    }

    res.json({ success: true, evaluation, certificateIssued: analysis.totalScore >= 60 });
  } catch (error) {
    console.error('Evaluation error:', error);
    res.status(500).json({ message: 'Evaluation failed', error: error.message });
  }
});

// Get user's evaluations
router.get('/my-evaluations', auth, async (req, res) => {
  try {
    const evaluations = await Evaluation.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50);
    res.json(evaluations);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch evaluations' });
  }
});

// Get single evaluation
router.get('/:id', auth, async (req, res) => {
  try {
    const evaluation = await Evaluation.findById(req.params.id);
    if (!evaluation) return res.status(404).json({ message: 'Evaluation not found' });
    if (evaluation.userId.toString() !== req.user.id) return res.status(403).json({ message: 'Access denied' });
    res.json(evaluation);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch evaluation' });
  }
});

module.exports = router;
