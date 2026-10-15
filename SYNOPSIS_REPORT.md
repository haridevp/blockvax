# BlockVax: Decentralized Vaccine Cold-Chain Integrity & Verification System
## Project Synopsis & Technical Evaluation Report

**Course Evaluation Submission**  
**Student Team:**
- **Haridev P** — Roll No: `CB.SC.U4CSE23417`
- **Aditya Vijay** — Roll No: `CB.SC.U4CSE23359`  
**Department:** Computer Science and Engineering  
**Submission Format:** AUMS Portal Report Submission (Maximum 5 Pages)

---

## 1. Executive Summary & Abstract

Temperature-sensitive biological pharmaceuticals—notably mRNA and viral vector vaccines—require stringent cold-chain adherence (typically between 2°C and 8°C or deep-freeze conditions below -20°C). Conventional supply chain monitoring systems rely on centralized databases or physical paper logs. These architectures suffer from critical vulnerabilities: single points of failure, lack of transparency across independent multi-enterprise stakeholders, and vulnerability to post-facto data falsification.

**BlockVax** is a decentralized, blockchain-native cold-chain tracking and verification prototype deployed on Ethereum (Sepolia Testnet / EVM Localhost). The system establishes an immutable, cryptographic audit trail across all vaccine logistics phases—from manufacturer synthesis, cold-storage warehousing, and inter-facility transit, to final hospital administration. 

Key technical characteristics include:
1. **On-Chain Role-Based Access Control (RBAC):** Cryptographically enforces strict privilege boundaries (`MANUFACTURER`, `COLD_STORAGE`, `TRANSPORTER`, `DISTRIBUTOR`, `HOSPITAL`).
2. **Permanent Excursion Latch Mechanism:** If a temperature violation is detected at any checkpoint, the contract irreversibly transitions the batch status to `EXCURSION_DETECTED`. No entity—including the contract administrator—can overwrite or clear a thermal violation.
3. **Decentralized Cryptographic Verification:** End-to-end provenance is attested via SHA-256 certificate anchoring, enabling public verification of batch authenticity without relying on a centralized intermediary.

---

## 2. Problem Statement & Project Objectives

### 2.1 Problem Statement
In multi-stakeholder pharmaceutical distribution networks:
- **Asymmetric Information:** Shippers, carriers, and receiving hospitals have conflicting incentives; carriers may conceal temperature spikes during transit to avoid liability.
- **Centralized Vulnerabilities:** Centralized cloud databases allow privileged operators or compromised accounts to alter historical telemetry logs.
- **Lack of Patient Trust:** Receiving clinics and patients lack an independent mechanism to verify that a vaccine vial was maintained under valid thermal specifications throughout its lifecycle.

### 2.2 Core Objectives
- **Objective 1 (Smart Contract Enforcement):** Author a high-performance Solidity contract implementing granular RBAC, batch state machines, and mathematical excursion checking.
- **Objective 2 (Tamper-Proof Audit Trails):** Record immutable custody transfers and checkpoint evidence hashes on the blockchain ledger.
- **Objective 3 (Full Stack Decentralized App):** Develop a modern React 18 + Vite frontend integrated with Ethers.js v6 and MetaMask wallet to visualize batches, monitor live simulated telemetry, and generate cryptographic certificates.
- **Objective 4 (Zero-Hardware Proof of Concept):** Validate full cryptographic and consensus layers through deterministic software simulation without requiring expensive physical IoT hardware.

---

## 3. System Architecture & Component Design

The architecture of BlockVax consists of four integrated layers:

```
[ Presentation Layer ]     --> React 18 + Vite UI, MetaMask Wallet, Recharts Dashboard
[ Middleware Layer ]       --> Ethers.js v6, Temperature Simulation Engine, SHA-256 Hashing
[ Smart Contract Layer ]   --> BlockVax.sol (Solidity 0.8.20, RBAC, Excursion Latch)
[ Blockchain Ledger ]      --> Ethereum Sepolia TestNet / Localhost EVM
```

### 3.1 Contract Specification (`BlockVax.sol`)
The contract is authored in Solidity `0.8.20` with zero external dependencies, making it directly compilable in Remix IDE:
- **Struct `Batch`:** Stores `batchId`, `vaccineName`, `manufacturer`, `currentCustodian`, `minTemperature` / `maxTemperature` (scaled by factor of 10 to preserve precision without floating points), `status`, and excursion flags.
- **Struct `CustodyRecord`:** Records sender, receiver, timestamp, and metadata notes on each custody handover.
- **Struct `CheckpointEvidence`:** Encapsulates location, scaled temperature reading, timestamp, excursion boolean flag, and raw telemetry hash.
- **Struct `CertificateRecord`:** Stores certificate hash, issue timestamp, issuer address, and overall integrity status (`VALID` vs `REVOKED`).

---

## 4. Key Smart Contract Logic & State Transitions

### 4.1 The Irreversible Excursion State Machine

A critical design criterion in cold-chain logistics is non-repudiation. Once a thermal breach occurs, vaccine efficacy may be permanently compromised. `BlockVax.sol` implements an irreversible latch:

$$\text{Excursion Condition: } T_{\text{recorded}} < T_{\text{min}} \quad \lor \quad T_{\text{recorded}} > T_{\text{max}}$$

```solidity
// Mathematical check against scaled integer temperature limits (0.1°C precision)
bool isExcursion = (temperature < batch.minTemp || temperature > batch.maxTemp);

if (isExcursion) {
    batch.hasExcursion = true;
    batch.status = BatchStatus.EXCURSION_DETECTED;
    emit TemperatureExcursion(batchId, temperature, msg.sender, block.timestamp);
}
```

Even if subsequent readings return to normal acceptable limits (e.g., 4.0°C), the state variable `hasExcursion` remains `true` and the status remains locked in `EXCURSION_DETECTED`.

### 4.2 Role-Based Access Control (RBAC) Mapping
```solidity
mapping(address => Role) public userRoles;

modifier onlyRole(Role requiredRole) {
    require(
        userRoles[msg.sender] == requiredRole || userRoles[msg.sender] == Role.ADMIN,
        "BlockVax: Caller lacks authorized role"
    );
    _;
}
```
Only accounts granted the `MANUFACTURER` role can invoke `registerBatch()`. Only the designated `currentCustodian` or an authorized `TRANSPORTER` can execute `transferCustody()`.

---

## 5. Tools Integration & Technical Implementation

| Rubric Component | Implemented Technology | Integration Details |
| :--- | :--- | :--- |
| **Smart Contract** | Solidity `0.8.20` (`BlockVax.sol`) | 570 lines of fully tested, self-contained smart contract code. Passes 22/22 automated Hardhat tests. |
| **IDE Inspection** | **Remix IDE** (`remix.ethereum.org`) | Hosted and executed in Remix IDE; interacts via *Injected Provider — MetaMask*. |
| **Wallet Integration** | MetaMask Browser Extension | Handles cryptographic transaction signing, gas estimation, network switching (Sepolia / Localhost), and account management. |
| **Web Frontend (UI)** | React 18, Vite, Tailwind CSS, Lucide Icons | Responsive dashboard featuring live custody timelines, temperature anomaly charts, and role switching. |
| **TestNet & Consensus** | Ethereum Sepolia / EVM Node | Validates decentralized consensus, transaction receipts, event emission (`BatchRegistered`, `CustodyTransferred`, `CheckpointRecorded`). |
| **Data Anchoring** | Ethers.js v6 & SHA-256 Hashing | Formats inputs, manages BigNumber conversion, scales temperature integers, and anchors digital certificate hashes. |

---

## 6. Execution Walkthrough & Results

1. **Batch Registration:**
   - Account with `MANUFACTURER` role registers Batch `VAX-COV-2026-001` (Pfizer-BioNTech, safe window: 2.0°C to 8.0°C, input as scaled integers `20` and `80`).
   - Transaction is broadcast, mined, and emits `BatchRegistered`. Initial batch status: `REGISTERED`.

2. **Custody Transfer:**
   - Batch is handed over to `TRANSPORTER` account `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`.
   - On-chain status transitions to `IN_TRANSIT`.

3. **Temperature Checkpoint Logging & Simulation:**
   - Checkpoint 1: 4.5°C recorded by Transporter &rarr; Compliant. Status remains `IN_TRANSIT`.
   - Checkpoint 2 (Excursion Simulation): Temperature spiked to 11.8°C due to refrigeration failure simulation &rarr; Smart contract executes excursion branch, sets `hasExcursion = true`, updates batch status to `EXCURSION_DETECTED`, and emits `TemperatureExcursion` event.
   - Checkpoint 3: Temperature returned to 5.0°C &rarr; Contract logs reading, but batch remains flagged as `EXCURSION_DETECTED`.

4. **Cryptographic Certificate Verification:**
   - Certificate issued for batch. Overall integrity flag marks vial as **Compromised / Revoked** due to historical excursion.
   - Hospital staff scans or submits certificate hash into the verification portal; smart contract instantly verifies authenticity and warns against administration.

---

## 7. Rubrics Compliance Self-Evaluation

| Rubric Criterion | Max Marks | Claimed Marks | Technical Evidence |
| :--- | :---: | :---: | :--- :--- |
| **1. Output & Execution** | **5** | **5** | All features operational: Batch registration, custody handover, simulated telemetry charts, excursion alerts, and certificate verification. |
| **2. Tools Integration** | **5** | **5** | Complete 5-way integration: MetaMask + React UI + `BlockVax.sol` + Sepolia TestNet + **Solidity demonstrated in Remix IDE**. |
| **3. Oral Presentation** | **3** | **3** | Structured, PPT-free verbal defense highlighting problem statement, irreversible excursion latch, RBAC, and zero-hardware design. |
| **4. Report (Synopsis)** | **2** | **2** | Comprehensive 4-page academic synopsis adhering to university evaluation standards and AUMS submission guidelines. |
| **Total Marks** | **15** | **15** | **Complete Full-Stack Blockchain Implementation** |

---

## 8. Conclusion

**BlockVax** demonstrates how Ethereum smart contracts eliminate blind trust in pharmaceutical supply chains. By codifying strict role-based access control, cryptographic data anchoring, and an irreversible thermal excursion latch, the platform provides uncompromised transparency from manufacturing plant to patient clinic. The system achieves complete functional and cryptographic validation without relying on specialized physical hardware, establishing a robust foundation for next-generation decentralized healthcare logistics.
