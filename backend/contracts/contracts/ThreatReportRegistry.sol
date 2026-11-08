// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ThreatReportRegistry {
    enum Status { Submitted, Disputed, Validated, Revised }
    struct Report {
        bytes32 reportHash;
        address reporter;
        uint64 timestamp;
        string category;
        Status status;
        uint32 revision;
    }

    address public immutable owner = msg.sender;
    Report[] private reports;
    mapping(bytes32 => bool) private usedHashes;

    event ReportSubmitted(uint256 indexed id, bytes32 indexed reportHash, address indexed reporter,
                          string category, uint64 timestamp);
    event StatusUpdated(uint256 indexed id, Status status, uint64 timestamp);
    event ReportRevised(uint256 indexed id, bytes32 oldHash, bytes32 newHash, uint64 timestamp);

    function reserveHash(bytes32 digest) private {
        require(digest != bytes32(0), "empty hash");
        require(!usedHashes[digest], "duplicate hash");
        usedHashes[digest] = true;
    }

    function submitReport(bytes32 reportHash, string calldata category) external returns (uint256 id) {
        bytes32 c = keccak256(bytes(category));
        require(c == keccak256("low_risk") || c == keccak256("suspicious") ||
                c == keccak256("high_risk") || c == keccak256("inconclusive") ||
                c == keccak256("confirmed_malicious"), "invalid category");
        reserveHash(reportHash);
        id = reports.length;
        uint64 timestamp = uint64(block.timestamp);
        reports.push(Report(reportHash, msg.sender, timestamp, category, Status.Submitted, 0));
        emit ReportSubmitted(id, reportHash, msg.sender, category, timestamp);
    }

    modifier authorized(uint256 id) {
        require(id < reports.length, "invalid id");
        require(msg.sender == owner || msg.sender == reports[id].reporter, "not authorized");
        _;
    }

    function updateStatus(uint256 id, Status s) external authorized(id) {
        reports[id].status = s;
        emit StatusUpdated(id, s, uint64(block.timestamp));
    }

    function reviseReport(uint256 id, bytes32 newHash) external authorized(id) {
        reserveHash(newHash);
        Report storage report = reports[id];
        bytes32 oldHash = report.reportHash;
        report.reportHash = newHash;
        report.revision++;
        report.status = Status.Revised;
        emit ReportRevised(id, oldHash, newHash, uint64(block.timestamp));
    }

    function getReport(uint256 id) external view returns (Report memory) {
        require(id < reports.length, "invalid id");
        return reports[id];
    }

    function getReportCount() external view returns (uint256) { return reports.length; }
}
