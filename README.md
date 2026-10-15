# BlockVax — Software-Only Blockchain-Based Cold Chain Verification System

> **Academic Project Prototype**  
> Demonstrates vaccine cold-chain integrity verification using software-based temperature simulation, Ethereum Sepolia testnet, and smart contracts.

---

## 1. Project Overview & Objective

Vaccines such as Pfizer Comirnaty (-90°C to -60°C), Moderna Spikevax (-25°C to -15°C), and Covishield/Covaxin (2°C to 8°C) are thermally fragile biologics. A single undetected temperature excursion can denature viral proteins or degrade lipid nanoparticles, rendering doses ineffective.

**BlockVax** solves this challenge through a tamper-evident software-only architecture:
1. **Batch Registration**: Unique vaccine batches registered with specific minimum and maximum permissible thermal boundaries.
2. **Role-Based Custody**: Enforces handoffs between Manufacturer, Cold Storage Depot, Transporter, Distributor, and Hospital Pharmacy.
3. **Software Temperature Simulator**: Generates realistic vaccine telemetry in Normal, Excursion, and Manual input modes.
4. **On-Chain Evidence Anchoring**: Checkpoints and Keccak-256 evidence hashes are anchored directly to the Ethereum smart contract.
5. **Permanent Excursion Tracking**: Temperature violations are permanently recorded on-chain and cannot be erased or overwritten.
6. **Digital Certificates**: Generates canonical JSON/Printable compliance reports with cryptographic digests verifiable against smart contract state.

---

## 2. Hardware Restriction Compliance

**CRITICAL NOTICE:** This project operates **100% in software**.  
- No physical IoT sensors (ESP32, Arduino, Raspberry Pi, DS18B20) are required or connected.  
- All temperature readings originate from explicitly labelled software simulation models or manual test consoles.  
- Smart contract records establish cryptographic tamper-evidence of simulated telemetry, not proof of physical sensor calibration.  
- This application is an educational prototype, not a certified clinical device.

---

## 3. Technology Stack

- **Smart Contracts**: Solidity `0.8.20` with optimizer and `viaIR: true`
- **Development & Testing**: Hardhat, Ethers.js v6, Chai / Mocha
- **Blockchain Networks**: Ethereum Sepolia Testnet (Chain ID `11155111`) & Localhost EDR (Chain ID `31337`)
- **Frontend Framework**: React 18 with Vite
- **Styling**: Tailwind CSS with custom pharmaceutical/cold-chain color tokens
- **Data Visualization**: Recharts for live thermal bands and excursion highlights
- **Wallet Integration**: MetaMask (EIP-1193) with automatic network detection and switching
- **Cryptographic Hashes**: Keccak-256 (Ethereum standard)
- **Optional Decentralized Storage**: Pinata IPFS integration

---

## 4. Project Directory Structure

```
blockvax/
├── contracts/
│   └── BlockVax.sol               # Core smart contract
├── scripts/
│   └── deploy.js                  # Automated deployment & role provisioning
├── test/
│   └── BlockVax.test.js           # 22 automated unit & integration tests
├── hardhat.config.js              # Hardhat network & compiler configuration
├── package.json                   # Root package dependencies
├── .env.example                   # Environment variable template
├── .gitignore                     # Git ignore rules
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx         # Header with network badge & brand
│   │   │   ├── Sidebar.jsx        # Navigation & project notice
│   │   │   ├── ConnectWallet.jsx  # MetaMask connection & account drawer
│   │   │   ├── StatusBadge.jsx    # Status indicators (Optimal, Excursion, etc.)
│   │   │   ├── ShipmentTimeline.jsx # Visual custody transfer timeline
│   │   │   └── TemperatureChart.jsx # Recharts line chart with safe band
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx      # Telemetry cards & batch inventory
│   │   │   ├── RegisterBatch.jsx  # Batch registration with vaccine presets
│   │   │   ├── Shipments.jsx      # Custody handoff & transit tracking
│   │   │   ├── TemperatureSimulator.jsx # 3-mode software simulator & live chart
│   │   │   ├── BatchDetails.jsx   # Checkpoint logs, certificates & audit
│   │   │   └── VerifyCertificate.jsx # Public cryptographic verification
│   │   ├── services/
│   │   │   ├── wallet.js          # MetaMask provider & network switcher
│   │   │   ├── contract.js        # Ethers.js contract read/write bindings
│   │   │   ├── temperatureSimulator.js # Simulation mathematical engine
│   │   │   ├── certificate.js     # Canonical JSON & Keccak-256 digest
│   │   │   └── ipfs.js            # Pinata IPFS service with fallback
│   │   ├── hooks/
│   │   │   └── useWallet.js       # React wallet state hook
│   │   ├── abi/
│   │   │   └── BlockVax.json      # Compiled contract ABI
│   │   ├── utils/
│   │   │   └── validation.js      # Input validators & formatting
│   │   ├── App.jsx                # Root layout & page router
│   │   ├── main.jsx               # React entry point
│   │   └── index.css              # Tailwind directives & print styles
│   ├── package.json               # Frontend dependencies
│   ├── vite.config.js             # Vite build configuration
│   └── .env.example               # Frontend environment template
│
└── README.md
```

---

## 5. Prerequisites & Installation

### Prerequisites
- Node.js `v18+` or `v20+` (Tested on `v22.22.2`)
- npm `v9+` or `v10+`
- MetaMask browser extension installed

### Step 1: Install Dependencies
```bash
# Navigate to project root
cd blockvax

# Install Hardhat root dependencies
npm install

# Install Frontend dependencies
cd frontend
npm install
cd ..
```

---

## 6. Smart Contract Compilation & Automated Testing

BlockVax includes 22 automated tests covering role management, batch registration, duplicate rejection, custody transfer enforcement, temperature checkpoint evaluation, excursion persistence, certificate hashing, and verification.

```bash
# Compile contracts
npx hardhat compile

# Run the test suite
npx hardhat test
```

Expected test results:
```
  BlockVax Smart Contract Suite
    1. Role Management & Access Control
      ✔ should set deployer as admin with ADMIN role
      ✔ should allow admin to assign and revoke roles
      ✔ should reject non-admin assigning roles
      ✔ should reject revoking admin role
    2. Batch Registration
      ✔ should successfully register a batch with valid manufacturer
      ✔ should reject duplicate batch ID
      ✔ should reject batch registration by unauthorized entity
      ✔ should reject invalid temperature range (min >= max)
      ✔ should reject expired timestamp during registration
    3. Custody Transfer & Supply Chain Journey
      ✔ should permit current custodian to transfer custody to cold storage
      ✔ should reject custody transfer initiated by non-custodian
      ✔ should reject transfer to an address without an authorized role
      ✔ should reject self-transfer
      ✔ should update status to DELIVERED when custody reaches HOSPITAL
    4. Temperature Checkpoints & Excursion Persistence
      ✔ should record normal temperature checkpoint without excursion
      ✔ should detect temperature excursion when max temperature exceeds boundary
      ✔ should NEVER erase excursion status even if subsequent checkpoints normalize
    5. Certificate Anchoring & Verification
      ✔ should anchor certificate hash and optional IPFS CID on-chain
      ✔ should successfully verify authentic certificate hash
      ✔ should fail verification if certificate content is tampered with
      ✔ should reject empty certificate hash
    6. Batch Enumeration and Lookup
      ✔ should return all registered batch IDs

  22 passing
```

---

## 7. Local Deployment & Running the Application

### Option A: Running with Local Hardhat Node (Fastest for testing)

1. Start a local Ethereum node in terminal 1:
```bash
npx hardhat node
```
This generates 20 local test accounts with 10,000 ETH each at `http://127.0.0.1:8545` (Chain ID `31337`).

2. Deploy the contract in terminal 2:
```bash
npm run deploy:local
```
The deploy script automatically provisions mock roles (`Manufacturer`, `Cold Storage`, `Transporter`, `Hospital`) to the first 4 Hardhat test accounts and exports the ABI and address to `frontend/src/contractAddress.json`.

3. Start the Vite Frontend in terminal 3:
```bash
cd frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

4. Configure MetaMask for Localhost:
- Network Name: `Hardhat Localhost`
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency Symbol: `ETH`
- Import Account #0 or Account #1 private key from the `npx hardhat node` terminal output.

---

## 8. Deployment to Ethereum Sepolia Testnet

1. Obtain Sepolia Test ETH from any public faucet:
- [Google Cloud Web3 Sepolia Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
- [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)

2. Configure Root `.env`:
```bash
cp .env.example .env
```
Fill in your details:
```env
PRIVATE_KEY=your_deployer_wallet_private_key_without_quotes
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
ETHERSCAN_API_KEY=your_etherscan_api_key_optional
```

3. Deploy to Sepolia:
```bash
npm run deploy:sepolia
```

4. Configure Frontend `.env`:
```bash
cd frontend
cp .env.example .env
```
Set `VITE_CONTRACT_ADDRESS` to the deployed Sepolia contract address.

5. Start the frontend:
```bash
npm run dev
```

---

## 9. IPFS Setup (Optional)

If you wish to upload digital cold-chain certificates to IPFS:
1. Create a free account at [Pinata Cloud](https://www.pinata.cloud/).
2. Generate an API Key and Secret Key.
3. Add them to `frontend/.env`:
```env
VITE_PINATA_API_KEY=your_pinata_api_key
VITE_PINATA_SECRET_KEY=your_pinata_secret_key
VITE_PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs/
```
*Note: If IPFS keys are not configured, certificates are downloaded locally as JSON and printed as PDF. The application never fabricates fake CIDs.*

---

## 10. User Journey & Feature Walkthrough

### 1. Dashboard
- Displays real-time metrics: Total Batches, Shipments in Transit, Excursion Alerts, Certificates.
- Filterable vaccine batch inventory with direct links to audit and simulation.

### 2. Register Batch
- Choose vaccine presets (Covishield, Covaxin, Moderna, Pfizer Ultra-Cold, or Custom).
- Auto-generate compliant batch IDs.
- Validates that expiry is in the future and minimum temperature < maximum temperature.
- Sends `registerBatch()` on-chain transaction.

### 3. Shipment Tracking & Custody Handoffs
- View full custody timeline: Manufacturer &rarr; Cold Storage &rarr; Transporter &rarr; Hospital.
- Execute custody transfer to next authorized role address using `transferCustody()`.
- Validates that only the current custodian or admin can transfer custody.

### 4. Software Temperature Simulator
- **Normal Mode**: Bounded random walk simulating normal refrigeration.
- **Excursion Mode**: Injects thermal spikes or cooling failures breaching safe boundaries.
- **Manual Mode**: Enter exact temperatures to simulate specific testing scenarios.
- Live interactive Recharts graph with permitted band shading and excursion alarm indicators.
- **Anchor Checkpoint to Blockchain**: Computes Keccak-256 evidence hash of readings and records `recordCheckpoint()` on Ethereum.

### 5. Batch Details & Certificate Generation
- Deep audit view of checkpoint evidence history.
- Compile digital cold-chain certificate with canonical cryptographic digest.
- Download JSON report or trigger printable PDF.
- Anchor certificate hash on-chain using `recordCertificate()`.

### 6. Public Certificate Verification
- Upload JSON certificate file or input Batch ID and Hash.
- Recomputes SHA3/Keccak-256 hash from canonical certificate bytes.
- Queries `verifyCertificateHash()` on the smart contract.
- Confirms authenticity or flags data tampering with micro-animations.

---

## 11. Security & Prototype Integrity Disclaimers

- **Never Commit Private Keys**: Always use `.env` (included in `.gitignore`).
- **No Hardware Dependencies**: Designed exclusively for software demonstration.
- **Immutable Excursion History**: A recorded violation remains permanently linked to a batch ID to prevent falsification of cold chain integrity records.
- **Cryptographic Verification**: Proves digital tamper-evidence of simulated telemetry, not biological safety of real vaccines.

---

## 12. License

MIT License. Designed and developed for academic cold chain verification research.
