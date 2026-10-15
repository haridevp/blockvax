const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlockVax Smart Contract Suite", function () {
  let blockVax;
  let admin, manufacturer, coldStorage, transporter, hospital, unauthorized;

  // Enum Role mirrors contract
  const Role = {
    NONE: 0,
    ADMIN: 1,
    MANUFACTURER: 2,
    COLD_STORAGE: 3,
    TRANSPORTER: 4,
    DISTRIBUTOR: 5,
    HOSPITAL: 6,
  };

  // Enum BatchStatus mirrors contract
  const BatchStatus = {
    REGISTERED: 0,
    IN_TRANSIT: 1,
    DELIVERED: 2,
    EXCURSION_DETECTED: 3,
    UNDER_REVIEW: 4,
  };

  beforeEach(async function () {
    [admin, manufacturer, coldStorage, transporter, hospital, unauthorized] =
      await ethers.getSigners();

    const BlockVax = await ethers.getContractFactory("BlockVax");
    blockVax = await BlockVax.deploy();
    await blockVax.waitForDeployment();

    // Assign roles to mock supply chain actors
    await blockVax.assignRole(manufacturer.address, Role.MANUFACTURER);
    await blockVax.assignRole(coldStorage.address, Role.COLD_STORAGE);
    await blockVax.assignRole(transporter.address, Role.TRANSPORTER);
    await blockVax.assignRole(hospital.address, Role.HOSPITAL);
  });

  describe("1. Role Management & Access Control", function () {
    it("should set deployer as admin with ADMIN role", async function () {
      expect(await blockVax.admin()).to.equal(admin.address);
      expect(await blockVax.userRoles(admin.address)).to.equal(Role.ADMIN);
    });

    it("should allow admin to assign and revoke roles", async function () {
      const dummy = unauthorized.address;
      await blockVax.assignRole(dummy, Role.DISTRIBUTOR);
      expect(await blockVax.userRoles(dummy)).to.equal(Role.DISTRIBUTOR);

      await blockVax.revokeRole(dummy);
      expect(await blockVax.userRoles(dummy)).to.equal(Role.NONE);
    });

    it("should reject non-admin assigning roles", async function () {
      await expect(
        blockVax.connect(unauthorized).assignRole(unauthorized.address, Role.MANUFACTURER)
      ).to.be.revertedWith("BlockVax: Only admin can execute");
    });

    it("should reject revoking admin role", async function () {
      await expect(
        blockVax.connect(admin).revokeRole(admin.address)
      ).to.be.revertedWith("BlockVax: Cannot revoke admin role");
    });
  });

  describe("2. Batch Registration", function () {
    const batchId = "VAX-COV2-001";
    const vaccineName = "Covishield (AstraZeneca)";
    const minTemp = 2; // 2°C
    const maxTemp = 8; // 8°C
    let expiryDate;

    beforeEach(async function () {
      const blockNum = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNum);
      expiryDate = block.timestamp + 365 * 24 * 3600; // 1 year ahead
    });

    it("should successfully register a batch with valid manufacturer", async function () {
      await expect(
        blockVax
          .connect(manufacturer)
          .registerBatch(batchId, vaccineName, expiryDate, minTemp, maxTemp)
      )
        .to.emit(blockVax, "BatchRegistered")
        .withArgs(batchId, vaccineName, manufacturer.address, minTemp, maxTemp, expiryDate);

      const batch = await blockVax.getBatch(batchId);
      expect(batch.batchId).to.equal(batchId);
      expect(batch.vaccineName).to.equal(vaccineName);
      expect(batch.manufacturer).to.equal(manufacturer.address);
      expect(batch.currentCustodian).to.equal(manufacturer.address);
      expect(batch.minTemp).to.equal(minTemp);
      expect(batch.maxTemp).to.equal(maxTemp);
      expect(batch.hasExcursion).to.equal(false);
      expect(batch.status).to.equal(BatchStatus.REGISTERED);

      // Verify custody history has initial production record
      const custody = await blockVax.getCustodyHistory(batchId);
      expect(custody.length).to.equal(1);
      expect(custody[0].to).to.equal(manufacturer.address);
      expect(custody[0].from).to.equal(ethers.ZeroAddress);
    });

    it("should reject duplicate batch ID", async function () {
      await blockVax
        .connect(manufacturer)
        .registerBatch(batchId, vaccineName, expiryDate, minTemp, maxTemp);

      await expect(
        blockVax
          .connect(manufacturer)
          .registerBatch(batchId, "Duplicate", expiryDate, minTemp, maxTemp)
      ).to.be.revertedWith("BlockVax: Batch ID already registered");
    });

    it("should reject batch registration by unauthorized entity", async function () {
      await expect(
        blockVax
          .connect(unauthorized)
          .registerBatch(batchId, vaccineName, expiryDate, minTemp, maxTemp)
      ).to.be.revertedWith("BlockVax: Only manufacturer or admin can register batch");
    });

    it("should reject invalid temperature range (min >= max)", async function () {
      await expect(
        blockVax
          .connect(manufacturer)
          .registerBatch(batchId, vaccineName, expiryDate, 10, 2)
      ).to.be.revertedWith("BlockVax: Min temp must be less than max temp");
    });

    it("should reject expired timestamp during registration", async function () {
      const pastTime = Math.floor(Date.now() / 1000) - 1000;
      await expect(
        blockVax
          .connect(manufacturer)
          .registerBatch(batchId, vaccineName, pastTime, minTemp, maxTemp)
      ).to.be.revertedWith("BlockVax: Expiry date must be in future");
    });
  });

  describe("3. Custody Transfer & Supply Chain Journey", function () {
    const batchId = "VAX-JOURNEY-002";
    let expiryDate;

    beforeEach(async function () {
      const block = await ethers.provider.getBlock("latest");
      expiryDate = block.timestamp + 180 * 24 * 3600;

      await blockVax
        .connect(manufacturer)
        .registerBatch(batchId, "Moderna mRNA-1273", expiryDate, -25, -15);
    });

    it("should permit current custodian to transfer custody to cold storage", async function () {
      await expect(
        blockVax
          .connect(manufacturer)
          .transferCustody(
            batchId,
            coldStorage.address,
            "Central Cold Depot Hub A",
            "Transferred into ultra-low freezers"
          )
      )
        .to.emit(blockVax, "CustodyTransferred")
        .withArgs(
          batchId,
          manufacturer.address,
          coldStorage.address,
          Role.MANUFACTURER,
          Role.COLD_STORAGE,
          await ethers.provider.getBlock("latest").then((b) => b.timestamp + 1),
          "Central Cold Depot Hub A"
        );

      const batch = await blockVax.getBatch(batchId);
      expect(batch.currentCustodian).to.equal(coldStorage.address);
      expect(batch.status).to.equal(BatchStatus.IN_TRANSIT);

      const history = await blockVax.getCustodyHistory(batchId);
      expect(history.length).to.equal(2);
      expect(history[1].from).to.equal(manufacturer.address);
      expect(history[1].to).to.equal(coldStorage.address);
    });

    it("should reject custody transfer initiated by non-custodian", async function () {
      await expect(
        blockVax
          .connect(unauthorized)
          .transferCustody(batchId, coldStorage.address, "Hub A", "Unauthorized")
      ).to.be.revertedWith("BlockVax: Only current custodian or admin authorized");
    });

    it("should reject transfer to an address without an authorized role", async function () {
      await expect(
        blockVax
          .connect(manufacturer)
          .transferCustody(batchId, unauthorized.address, "Hub A", "Invalid Recipient")
      ).to.be.revertedWith("BlockVax: Recipient must have an authorized role");
    });

    it("should reject self-transfer", async function () {
      await expect(
        blockVax
          .connect(manufacturer)
          .transferCustody(batchId, manufacturer.address, "Hub A", "Self")
      ).to.be.revertedWith("BlockVax: Cannot transfer to self");
    });

    it("should update status to DELIVERED when custody reaches HOSPITAL", async function () {
      // Transfer: Manufacturer -> Transporter
      await blockVax
        .connect(manufacturer)
        .transferCustody(batchId, transporter.address, "Transit Fleet 04", "En route");

      // Transfer: Transporter -> Hospital
      await blockVax
        .connect(transporter)
        .transferCustody(batchId, hospital.address, "Memorial Hospital Pharmacy", "Final Delivery");

      const batch = await blockVax.getBatch(batchId);
      expect(batch.currentCustodian).to.equal(hospital.address);
      expect(batch.status).to.equal(BatchStatus.DELIVERED);
    });
  });

  describe("4. Temperature Checkpoints & Excursion Persistence", function () {
    const batchId = "VAX-COLD-003";
    const minLimit = 2; // 2°C
    const maxLimit = 8; // 8°C

    beforeEach(async function () {
      const block = await ethers.provider.getBlock("latest");
      const expiryDate = block.timestamp + 300 * 24 * 3600;

      await blockVax
        .connect(manufacturer)
        .registerBatch(batchId, "Pfizer Comirnaty", expiryDate, minLimit, maxLimit);
    });

    it("should record normal temperature checkpoint without excursion", async function () {
      const mockEvidenceHash = ethers.keccak256(ethers.toUtf8Bytes("SIMULATED_READINGS_BATCH_1"));
      
      await expect(
        blockVax
          .connect(manufacturer)
          .recordCheckpoint(
            batchId,
            "Hub 1 Cold Room",
            3, // min 3°C (in range)
            6, // max 6°C (in range)
            4, // avg 4°C
            50, // sample count
            false,
            mockEvidenceHash,
            "Routine 2-hour software simulation test"
          )
      )
        .to.emit(blockVax, "CheckpointRecorded")
        .withArgs(
          batchId,
          manufacturer.address,
          await ethers.provider.getBlock("latest").then((b) => b.timestamp + 1),
          mockEvidenceHash,
          false,
          3,
          6
        );

      const batch = await blockVax.getBatch(batchId);
      expect(batch.hasExcursion).to.equal(false);
      expect(batch.excursionCount).to.equal(0);
      expect(batch.status).to.equal(BatchStatus.REGISTERED);

      const checkpoints = await blockVax.getCheckpoints(batchId);
      expect(checkpoints.length).to.equal(1);
      expect(checkpoints[0].evidenceHash).to.equal(mockEvidenceHash);
    });

    it("should detect temperature excursion when max temperature exceeds boundary", async function () {
      const mockEvidenceHash = ethers.keccak256(ethers.toUtf8Bytes("EXCURSION_HIGH_READINGS"));

      await expect(
        blockVax
          .connect(manufacturer)
          .recordCheckpoint(
            batchId,
            "Transit Route Highway A1",
            4, // min in range
            14, // max 14°C > 8°C EXCURSION!
            9, // avg 9°C
            60,
            false,
            mockEvidenceHash,
            "Cooling unit malfunction in simulated test"
          )
      )
        .to.emit(blockVax, "ExcursionRecorded")
        .withArgs(
          batchId,
          manufacturer.address,
          await ethers.provider.getBlock("latest").then((b) => b.timestamp + 1),
          "Transit Route Highway A1",
          4,
          14
        );

      const batch = await blockVax.getBatch(batchId);
      expect(batch.hasExcursion).to.equal(true);
      expect(batch.excursionCount).to.equal(1);
      expect(batch.status).to.equal(BatchStatus.EXCURSION_DETECTED);
    });

    it("should NEVER erase excursion status even if subsequent checkpoints normalize", async function () {
      const hash1 = ethers.keccak256(ethers.toUtf8Bytes("EXCURSION_EVENT"));
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("NORMALIZED_READINGS"));

      // 1. Record an excursion (e.g. freezing -2°C below 2°C min)
      await blockVax
        .connect(manufacturer)
        .recordCheckpoint(batchId, "Checkpoint 1", -2, 4, 1, 20, false, hash1, "Freezing alert");

      let batch = await blockVax.getBatch(batchId);
      expect(batch.hasExcursion).to.equal(true);
      expect(batch.excursionCount).to.equal(1);

      // 2. Record subsequent perfectly normal checkpoint (4°C - 5°C)
      await blockVax
        .connect(manufacturer)
        .recordCheckpoint(batchId, "Checkpoint 2", 4, 5, 4, 30, false, hash2, "Back to normal");

      batch = await blockVax.getBatch(batchId);
      // EXCURSION MUST PERSIST PERMANENTLY!
      expect(batch.hasExcursion).to.equal(true);
      expect(batch.excursionCount).to.equal(1);

      const checkpoints = await blockVax.getCheckpoints(batchId);
      expect(checkpoints.length).to.equal(2);
      expect(checkpoints[0].excursionDetected).to.equal(true);
      expect(checkpoints[1].excursionDetected).to.equal(false);
    });
  });

  describe("5. Certificate Anchoring & Verification", function () {
    const batchId = "VAX-CERT-004";
    const sampleCertificateJson = JSON.stringify({
      batchId: "VAX-CERT-004",
      vaccineName: "Rabies Inactivated",
      minPermitted: 2,
      maxPermitted: 8,
      readingsCount: 120,
      minObserved: 3.1,
      maxObserved: 6.8,
      avgObserved: 4.5,
      excursions: 0,
      timestamp: 1720000000,
      disclaimer: "Software-simulated prototype certificate",
    });

    const certHash = ethers.keccak256(ethers.toUtf8Bytes(sampleCertificateJson));
    const ipfsCid = "QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx";

    beforeEach(async function () {
      const block = await ethers.provider.getBlock("latest");
      await blockVax
        .connect(manufacturer)
        .registerBatch(batchId, "Rabies Inactivated", block.timestamp + 500000, 2, 8);
    });

    it("should anchor certificate hash and optional IPFS CID on-chain", async function () {
      await expect(
        blockVax
          .connect(manufacturer)
          .recordCertificate(batchId, certHash, ipfsCid, "Initial release certificate")
      )
        .to.emit(blockVax, "CertificateIssued")
        .withArgs(
          batchId,
          certHash,
          ipfsCid,
          manufacturer.address,
          await ethers.provider.getBlock("latest").then((b) => b.timestamp + 1)
        );

      const batch = await blockVax.getBatch(batchId);
      expect(batch.latestCertificateHash).to.equal(certHash);
      expect(batch.latestIpfsCid).to.equal(ipfsCid);

      const certs = await blockVax.getCertificates(batchId);
      expect(certs.length).to.equal(1);
      expect(certs[0].certificateHash).to.equal(certHash);
      expect(certs[0].ipfsCid).to.equal(ipfsCid);
    });

    it("should successfully verify authentic certificate hash", async function () {
      await blockVax
        .connect(manufacturer)
        .recordCertificate(batchId, certHash, ipfsCid, "Audit release");

      const [isValid, issuedAt, issuedBy, returnedCid] =
        await blockVax.verifyCertificateHash(batchId, certHash);

      expect(isValid).to.equal(true);
      expect(issuedBy).to.equal(manufacturer.address);
      expect(returnedCid).to.equal(ipfsCid);
      expect(issuedAt).to.be.gt(0);
    });

    it("should fail verification if certificate content is tampered with", async function () {
      await blockVax
        .connect(manufacturer)
        .recordCertificate(batchId, certHash, ipfsCid, "Audit release");

      // Tampered certificate bytes
      const tamperedJson = JSON.stringify({
        batchId: "VAX-CERT-004",
        tamperedField: "Malicious modification",
      });
      const tamperedHash = ethers.keccak256(ethers.toUtf8Bytes(tamperedJson));

      const [isValid] = await blockVax.verifyCertificateHash(batchId, tamperedHash);
      expect(isValid).to.equal(false);
    });

    it("should reject empty certificate hash", async function () {
      await expect(
        blockVax
          .connect(manufacturer)
          .recordCertificate(batchId, ethers.ZeroHash, ipfsCid, "Invalid")
      ).to.be.revertedWith("BlockVax: Invalid certificate hash");
    });
  });

  describe("6. Batch Enumeration and Lookup", function () {
    it("should return all registered batch IDs", async function () {
      const block = await ethers.provider.getBlock("latest");
      const expiry = block.timestamp + 100000;

      await blockVax.connect(manufacturer).registerBatch("BATCH-A", "Vax A", expiry, 2, 8);
      await blockVax.connect(manufacturer).registerBatch("BATCH-B", "Vax B", expiry, -20, -10);

      const count = await blockVax.getBatchesCount();
      expect(count).to.equal(2);

      const ids = await blockVax.getAllBatchIds();
      expect(ids).to.deep.equal(["BATCH-A", "BATCH-B"]);

      expect(await blockVax.batchExists("BATCH-A")).to.equal(true);
      expect(await blockVax.batchExists("NON-EXISTENT")).to.equal(false);
    });
  });
});
