// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title BlockVax - Software-Only Cold Chain Verification Smart Contract
 * @notice College project prototype for vaccine cold-chain verification on Ethereum / Sepolia.
 * @dev Manages batch registration, role-based custody transfers, temperature checkpoint anchoring,
 *      permanent excursion tracking, and cryptographic certificate verification.
 *      NOTE: All temperature data anchored herein derives from software simulators or manual test inputs.
 */
contract BlockVax {
    // -------------------------------------------------------------
    // Enums
    // -------------------------------------------------------------
    enum Role {
        NONE,
        ADMIN,
        MANUFACTURER,
        COLD_STORAGE,
        TRANSPORTER,
        DISTRIBUTOR,
        HOSPITAL
    }

    enum BatchStatus {
        REGISTERED,
        IN_TRANSIT,
        DELIVERED,
        EXCURSION_DETECTED,
        UNDER_REVIEW
    }

    // -------------------------------------------------------------
    // Structs
    // -------------------------------------------------------------
    struct Batch {
        string batchId;
        string vaccineName;
        uint256 expiryDate;
        int256 minTemp; // Configured minimum temperature (Celsius)
        int256 maxTemp; // Configured maximum temperature (Celsius)
        address manufacturer;
        address currentCustodian;
        BatchStatus status;
        bool hasExcursion; // Permanent flag: true if violation ever occurred
        uint256 excursionCount;
        uint256 registrationTime;
        bytes32 latestCertificateHash;
        string latestIpfsCid;
    }

    struct CustodyRecord {
        address from;
        address to;
        Role fromRole;
        Role toRole;
        uint256 timestamp;
        string location;
        string notes;
    }

    struct CheckpointEvidence {
        uint256 timestamp;
        address recordedBy;
        string locationOrStage;
        int256 minObservedTemp;
        int256 maxObservedTemp;
        int256 avgObservedTemp;
        uint256 sampleCount;
        bool excursionDetected;
        bytes32 evidenceHash; // Keccak256 hash of batch sensor readings
        string notes;
    }

    struct CertificateRecord {
        bytes32 certificateHash;
        string ipfsCid;
        uint256 issuedAt;
        address issuedBy;
        string notes;
    }

    // -------------------------------------------------------------
    // State Variables
    // -------------------------------------------------------------
    address public admin;

    // Mapping of user address to their active supply chain role
    mapping(address => Role) public userRoles;

    // Batches storage
    mapping(string => Batch) private batches;
    mapping(string => bool) private batchExistsMap;
    string[] private batchIds;

    // Historical records per batch
    mapping(string => CustodyRecord[]) private custodyHistories;
    mapping(string => CheckpointEvidence[]) private checkpointHistories;
    mapping(string => CertificateRecord[]) private certificateHistories;

    // -------------------------------------------------------------
    // Events
    // -------------------------------------------------------------
    event RoleAssigned(address indexed account, Role role, address indexed assignedBy);
    event RoleRevoked(address indexed account, address indexed revokedBy);
    
    event BatchRegistered(
        string indexed batchId,
        string vaccineName,
        address indexed manufacturer,
        int256 minTemp,
        int256 maxTemp,
        uint256 expiryDate
    );

    event CustodyTransferred(
        string indexed batchId,
        address indexed from,
        address indexed to,
        Role fromRole,
        Role toRole,
        uint256 timestamp,
        string location
    );

    event CheckpointRecorded(
        string indexed batchId,
        address indexed recordedBy,
        uint256 timestamp,
        bytes32 evidenceHash,
        bool excursionDetected,
        int256 minObservedTemp,
        int256 maxObservedTemp
    );

    event ExcursionRecorded(
        string indexed batchId,
        address indexed recordedBy,
        uint256 timestamp,
        string location,
        int256 minObservedTemp,
        int256 maxObservedTemp
    );

    event CertificateIssued(
        string indexed batchId,
        bytes32 certificateHash,
        string ipfsCid,
        address indexed issuedBy,
        uint256 timestamp
    );

    event BatchStatusUpdated(
        string indexed batchId,
        BatchStatus oldStatus,
        BatchStatus newStatus,
        string reason
    );

    // -------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------
    modifier onlyAdmin() {
        require(msg.sender == admin, "BlockVax: Only admin can execute");
        _;
    }

    modifier onlyRole(Role requiredRole) {
        require(
            userRoles[msg.sender] == requiredRole || msg.sender == admin,
            "BlockVax: Caller lacks required role"
        );
        _;
    }

    modifier onlyAuthorizedCustodian(string memory batchId) {
        require(batchExistsMap[batchId], "BlockVax: Batch does not exist");
        require(
            batches[batchId].currentCustodian == msg.sender || msg.sender == admin,
            "BlockVax: Only current custodian or admin authorized"
        );
        _;
    }

    modifier batchMustExist(string memory batchId) {
        require(batchExistsMap[batchId], "BlockVax: Batch does not exist");
        _;
    }

    // -------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------
    constructor() {
        admin = msg.sender;
        userRoles[msg.sender] = Role.ADMIN;
        emit RoleAssigned(msg.sender, Role.ADMIN, msg.sender);
    }

    // -------------------------------------------------------------
    // Role Management
    // -------------------------------------------------------------
    /**
     * @notice Assign a supply chain role to an address.
     * @param account Target wallet address
     * @param role Target role
     */
    function assignRole(address account, Role role) external onlyAdmin {
        require(account != address(0), "BlockVax: Invalid account address");
        userRoles[account] = role;
        emit RoleAssigned(account, role, msg.sender);
    }

    /**
     * @notice Revoke role from an address.
     * @param account Target wallet address
     */
    function revokeRole(address account) external onlyAdmin {
        require(account != address(0), "BlockVax: Invalid account address");
        require(account != admin, "BlockVax: Cannot revoke admin role");
        userRoles[account] = Role.NONE;
        emit RoleRevoked(account, msg.sender);
    }

    // -------------------------------------------------------------
    // Batch Registration
    // -------------------------------------------------------------
    /**
     * @notice Register a newly manufactured vaccine batch.
     * @param batchId Unique identifier (e.g., "VAX-2024-001")
     * @param vaccineName Name/type of the vaccine (e.g. "Covishield", "Comirnaty")
     * @param expiryDate Expiration timestamp (must be in the future)
     * @param minTemp Permitted minimum temperature in Celsius
     * @param maxTemp Permitted maximum temperature in Celsius
     */
    function registerBatch(
        string calldata batchId,
        string calldata vaccineName,
        uint256 expiryDate,
        int256 minTemp,
        int256 maxTemp
    ) external {
        require(
            userRoles[msg.sender] == Role.MANUFACTURER ||
            userRoles[msg.sender] == Role.ADMIN ||
            msg.sender == admin,
            "BlockVax: Only manufacturer or admin can register batch"
        );
        require(bytes(batchId).length > 0, "BlockVax: Batch ID cannot be empty");
        require(bytes(vaccineName).length > 0, "BlockVax: Vaccine name cannot be empty");
        require(!batchExistsMap[batchId], "BlockVax: Batch ID already registered");
        require(expiryDate > block.timestamp, "BlockVax: Expiry date must be in future");
        require(minTemp < maxTemp, "BlockVax: Min temp must be less than max temp");

        batches[batchId] = Batch({
            batchId: batchId,
            vaccineName: vaccineName,
            expiryDate: expiryDate,
            minTemp: minTemp,
            maxTemp: maxTemp,
            manufacturer: msg.sender,
            currentCustodian: msg.sender,
            status: BatchStatus.REGISTERED,
            hasExcursion: false,
            excursionCount: 0,
            registrationTime: block.timestamp,
            latestCertificateHash: bytes32(0),
            latestIpfsCid: ""
        });

        batchExistsMap[batchId] = true;
        batchIds.push(batchId);

        // Record initial custody by manufacturer
        custodyHistories[batchId].push(
            CustodyRecord({
                from: address(0),
                to: msg.sender,
                fromRole: Role.NONE,
                toRole: userRoles[msg.sender],
                timestamp: block.timestamp,
                location: "Manufacturing Facility",
                notes: "Initial Batch Production & Registration"
            })
        );

        emit BatchRegistered(batchId, vaccineName, msg.sender, minTemp, maxTemp, expiryDate);
    }

    // -------------------------------------------------------------
    // Custody Transfer
    // -------------------------------------------------------------
    /**
     * @notice Transfer custody of a batch to another authorized supply-chain entity.
     * @dev Only the current custodian or admin may transfer custody.
     * @param batchId Target batch identifier
     * @param to Recipient address
     * @param location Checkpoint or transfer hub description
     * @param notes Additional comments or handoff notes
     */
    function transferCustody(
        string calldata batchId,
        address to,
        string calldata location,
        string calldata notes
    ) external onlyAuthorizedCustodian(batchId) {
        require(to != address(0), "BlockVax: Cannot transfer to zero address");
        require(to != msg.sender, "BlockVax: Cannot transfer to self");

        Role recipientRole = userRoles[to];
        require(recipientRole != Role.NONE, "BlockVax: Recipient must have an authorized role");

        Batch storage batch = batches[batchId];
        address previousCustodian = batch.currentCustodian;
        Role previousRole = userRoles[previousCustodian];

        batch.currentCustodian = to;

        // Update status according to recipient stage if not under review / excursion
        if (recipientRole == Role.HOSPITAL) {
            batch.status = BatchStatus.DELIVERED;
        } else if (batch.status == BatchStatus.REGISTERED) {
            batch.status = BatchStatus.IN_TRANSIT;
        }

        custodyHistories[batchId].push(
            CustodyRecord({
                from: previousCustodian,
                to: to,
                fromRole: previousRole,
                toRole: recipientRole,
                timestamp: block.timestamp,
                location: location,
                notes: notes
            })
        );

        emit CustodyTransferred(
            batchId,
            previousCustodian,
            to,
            previousRole,
            recipientRole,
            block.timestamp,
            location
        );
    }

    // -------------------------------------------------------------
    // Checkpoint & Temperature Excursion Recording
    // -------------------------------------------------------------
    /**
     * @notice Anchor a periodic temperature checkpoint and evidence hash on-chain.
     * @dev Only current custodian or admin can record checkpoint.
     *      Calculates violation against configured batch temperature boundaries.
     *      Permanent excursion flag is never erased even if temperature later normalizes.
     * @param batchId Target batch identifier
     * @param locationOrStage Shipment leg or cold storage checkpoint description
     * @param minObserved Minimum recorded temperature in the checkpoint window
     * @param maxObserved Maximum recorded temperature in the checkpoint window
     * @param avgObserved Average recorded temperature in the checkpoint window
     * @param sampleCount Number of software simulated readings in this batch
     * @param manualExcursionFlag Explicit excursion flag reported by validator
     * @param evidenceHash Cryptographic Keccak256 hash of the detailed simulated readings
     * @param notes Checkpoint observations
     */
    function recordCheckpoint(
        string calldata batchId,
        string calldata locationOrStage,
        int256 minObserved,
        int256 maxObserved,
        int256 avgObserved,
        uint256 sampleCount,
        bool manualExcursionFlag,
        bytes32 evidenceHash,
        string calldata notes
    ) external onlyAuthorizedCustodian(batchId) {
        Batch storage batch = batches[batchId];

        // Evaluate out-of-range condition against batch's specific configured limits
        bool isExcursion = manualExcursionFlag ||
            (minObserved < batch.minTemp) ||
            (maxObserved > batch.maxTemp);

        if (isExcursion) {
            batch.hasExcursion = true;
            batch.excursionCount += 1;
            batch.status = BatchStatus.EXCURSION_DETECTED;

            emit ExcursionRecorded(
                batchId,
                msg.sender,
                block.timestamp,
                locationOrStage,
                minObserved,
                maxObserved
            );
        }

        checkpointHistories[batchId].push(
            CheckpointEvidence({
                timestamp: block.timestamp,
                recordedBy: msg.sender,
                locationOrStage: locationOrStage,
                minObservedTemp: minObserved,
                maxObservedTemp: maxObserved,
                avgObservedTemp: avgObserved,
                sampleCount: sampleCount,
                excursionDetected: isExcursion,
                evidenceHash: evidenceHash,
                notes: notes
            })
        );

        emit CheckpointRecorded(
            batchId,
            msg.sender,
            block.timestamp,
            evidenceHash,
            isExcursion,
            minObserved,
            maxObserved
        );
    }

    /**
     * @notice Update batch review status after an excursion or audit.
     * @param batchId Target batch identifier
     * @param newStatus New status to set (e.g. UNDER_REVIEW or DELIVERED)
     * @param reason Quality assessment / prototype assessment rationale
     */
    function updateBatchStatus(
        string calldata batchId,
        BatchStatus newStatus,
        string calldata reason
    ) external onlyAdmin batchMustExist(batchId) {
        Batch storage batch = batches[batchId];
        BatchStatus oldStatus = batch.status;
        batch.status = newStatus;

        emit BatchStatusUpdated(batchId, oldStatus, newStatus, reason);
    }

    // -------------------------------------------------------------
    // Certificate Management
    // -------------------------------------------------------------
    /**
     * @notice Store a digital certificate content hash and optional IPFS CID for a batch.
     * @dev Computes cryptographic anchor. Cannot be forged or altered off-chain.
     * @param batchId Target batch identifier
     * @param certificateHash Cryptographic hash (Keccak256 or SHA-256) of canonical certificate JSON bytes
     * @param ipfsCid IPFS CID (or empty string if IPFS not configured)
     * @param notes Audit / issuance notes
     */
    function recordCertificate(
        string calldata batchId,
        bytes32 certificateHash,
        string calldata ipfsCid,
        string calldata notes
    ) external onlyAuthorizedCustodian(batchId) {
        require(certificateHash != bytes32(0), "BlockVax: Invalid certificate hash");

        Batch storage batch = batches[batchId];
        batch.latestCertificateHash = certificateHash;
        batch.latestIpfsCid = ipfsCid;

        certificateHistories[batchId].push(
            CertificateRecord({
                certificateHash: certificateHash,
                ipfsCid: ipfsCid,
                issuedAt: block.timestamp,
                issuedBy: msg.sender,
                notes: notes
            })
        );

        emit CertificateIssued(batchId, certificateHash, ipfsCid, msg.sender, block.timestamp);
    }

    // -------------------------------------------------------------
    // View Functions
    // -------------------------------------------------------------
    /**
     * @notice Check whether a given certificate hash matches any anchored certificate for a batch.
     */
    function verifyCertificateHash(
        string calldata batchId,
        bytes32 computedHash
    )
        external
        view
        batchMustExist(batchId)
        returns (
            bool isValid,
            uint256 issuedAt,
            address issuedBy,
            string memory ipfsCid
        )
    {
        CertificateRecord[] memory certs = certificateHistories[batchId];
        for (uint256 i = certs.length; i > 0; i--) {
            if (certs[i - 1].certificateHash == computedHash) {
                return (
                    true,
                    certs[i - 1].issuedAt,
                    certs[i - 1].issuedBy,
                    certs[i - 1].ipfsCid
                );
            }
        }
        return (false, 0, address(0), "");
    }

    /**
     * @notice Retrieve batch details.
     */
    function getBatch(
        string calldata batchId
    ) external view batchMustExist(batchId) returns (Batch memory) {
        return batches[batchId];
    }

    /**
     * @notice Retrieve custody history for a batch.
     */
    function getCustodyHistory(
        string calldata batchId
    ) external view batchMustExist(batchId) returns (CustodyRecord[] memory) {
        return custodyHistories[batchId];
    }

    /**
     * @notice Retrieve checkpoint evidence history for a batch.
     */
    function getCheckpoints(
        string calldata batchId
    ) external view batchMustExist(batchId) returns (CheckpointEvidence[] memory) {
        return checkpointHistories[batchId];
    }

    /**
     * @notice Retrieve certificate history for a batch.
     */
    function getCertificates(
        string calldata batchId
    ) external view batchMustExist(batchId) returns (CertificateRecord[] memory) {
        return certificateHistories[batchId];
    }

    /**
     * @notice Returns total number of registered batches.
     */
    function getBatchesCount() external view returns (uint256) {
        return batchIds.length;
    }

    /**
     * @notice Returns list of all registered batch IDs.
     */
    function getAllBatchIds() external view returns (string[] memory) {
        return batchIds;
    }

    /**
     * @notice Returns whether a specific batch ID exists.
     */
    function batchExists(string calldata batchId) external view returns (bool) {
        return batchExistsMap[batchId];
    }
}
