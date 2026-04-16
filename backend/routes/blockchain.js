const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const blockchainService = require('../services/blockchain');

// Issue certificate (called internally, but exposed for direct use)
router.post('/issue-certificate', auth, async (req, res) => {
  try {
    const { certificateType, gdTitle, role, score, metadata } = req.body;
    const certificate = await blockchainService.issueCertificate({
      userName: req.user.name,
      certificateType,
      gdTitle,
      role,
      score,
      metadata
    });
    res.json({ success: true, certificate });
  } catch (error) {
    res.status(500).json({ message: 'Failed to issue certificate', error: error.message });
  }
});

// Verify certificate (public)
router.get('/verify-certificate/:certificateId', async (req, res) => {
  try {
    const result = blockchainService.verifyCertificate(req.params.certificateId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Verification failed', error: error.message });
  }
});

// Get user's certificates
router.get('/my-certificates', auth, async (req, res) => {
  try {
    const certificates = blockchainService.getUserCertificates(req.user.name);
    res.json(certificates);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch certificates' });
  }
});

// Get blockchain info
router.get('/blockchain-info', auth, async (req, res) => {
  try {
    res.json(blockchainService.getChainInfo());
  } catch (error) {
    res.status(500).json({ message: 'Failed to get blockchain info' });
  }
});

module.exports = router;
