const crypto = require('crypto');

class BlockchainService {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 2;
    this.certificates = {};
  }

  createGenesisBlock() {
    return {
      index: 0,
      timestamp: new Date().toISOString(),
      data: 'Genesis Block',
      previousHash: '0',
      hash: this.calculateHash(0, new Date().toISOString(), 'Genesis Block', '0', 0),
      nonce: 0
    };
  }

  calculateHash(index, timestamp, data, previousHash, nonce) {
    return crypto
      .createHash('sha256')
      .update(`${index}${timestamp}${JSON.stringify(data)}${previousHash}${nonce}`)
      .digest('hex');
  }

  mineBlock(data) {
    const previousBlock = this.chain[this.chain.length - 1];
    const index = this.chain.length;
    const timestamp = new Date().toISOString();
    let nonce = 0;
    let hash = '';

    while (!hash.startsWith('0'.repeat(this.difficulty))) {
      nonce++;
      hash = this.calculateHash(index, timestamp, data, previousBlock.hash, nonce);
    }

    const block = { index, timestamp, data, previousHash: previousBlock.hash, hash, nonce };
    this.chain.push(block);
    return block;
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];
      const recalculated = this.calculateHash(current.index, current.timestamp, current.data, current.previousHash, current.nonce);
      if (current.hash !== recalculated || current.previousHash !== previous.hash) return false;
    }
    return true;
  }

  async issueCertificate({ userName, certificateType, gdTitle, role, score, metadata }) {
    const certificateId = `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const certData = { certificateId, userName, certificateType, gdTitle: gdTitle || role, score, metadata, timestamp: new Date().toISOString() };
    const block = this.mineBlock(certData);
    const certificate = { ...certData, blockHash: block.hash, blockIndex: block.index };
    this.certificates[certificateId] = certificate;
    return certificate;
  }

  verifyCertificate(certificateId) {
    const certificate = this.certificates[certificateId];
    if (!certificate) return { valid: false };
    const block = this.chain[certificate.blockIndex];
    if (!block) return { valid: false };
    return { valid: true, certificate, block, chainValid: this.isChainValid() };
  }

  getUserCertificates(userName) {
    return Object.values(this.certificates).filter(c => c.userName === userName);
  }

  getChainInfo() {
    return { length: this.chain.length, isValid: this.isChainValid(), difficulty: this.difficulty };
  }
}

module.exports = new BlockchainService();
