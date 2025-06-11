// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract VotingSystem {
    address public owner;

    enum ElectionState { NotStarted, Active, Ended }
    ElectionState public electionState;

    struct Candidate {
        uint id;
        string name;
        string party;
        string description;
        uint voteCount;
    }

    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedCandidateId;
        uint timestamp;
    }

    mapping(uint => Candidate) public candidates;
    mapping(address => Voter) public voters;

    uint public candidateCount;
    uint public totalVotes;

    uint[] public candidateIds;
    address[] public voterList;

    event CandidateRegistered(uint indexed candidateId, string name, string party, string description);
    event VoterAuthorized(address indexed voter);
    event VoteCasted(address indexed voter, uint indexed candidateId, uint timestamp);
    event ElectionStarted(uint timestamp);
    event ElectionEnded(uint timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyRegisteredVoter() {
        require(voters[msg.sender].isRegistered, "Voter not authorized");
        _;
    }

    modifier electionActive() {
        require(electionState == ElectionState.Active, "Election not active");
        _;
    }

    modifier electionNotStarted() {
        require(electionState == ElectionState.NotStarted, "Already started");
        _;
    }

    modifier electionEndedOnly() {
        require(electionState == ElectionState.Ended, "Election not ended");
        _;
    }

    constructor() {
        owner = msg.sender;
        electionState = ElectionState.NotStarted;
    }

    function registerCandidate(
        string memory name,
        string memory party,
        string memory description
    ) public onlyOwner electionNotStarted {
        candidateCount++;
        candidates[candidateCount] = Candidate(candidateCount, name, party, description, 0);
        candidateIds.push(candidateCount);
        emit CandidateRegistered(candidateCount, name, party, description);
    }

    function getCandidate(uint id) public view returns (Candidate memory) {
        require(id > 0 && id <= candidateCount, "Invalid candidate");
        return candidates[id];
    }

    function getAllCandidateIds() public view returns (uint[] memory) {
        return candidateIds;
    }

    function authorizeVoter(address voterAddr) public onlyOwner {
        require(!voters[voterAddr].isRegistered, "Already authorized");
        voters[voterAddr].isRegistered = true;
        voterList.push(voterAddr);
        emit VoterAuthorized(voterAddr);
    }

    function getVoterInfo(address voterAddr) public view returns (Voter memory) {
        return voters[voterAddr];
    }

    function getMyVote() public view onlyRegisteredVoter returns (
        bool hasVoted,
        uint candidateId,
        string memory name,
        string memory party,
        uint timestamp
    ) {
        Voter memory voter = voters[msg.sender];
        if (!voter.hasVoted) return (false, 0, "", "", 0);
        Candidate memory c = candidates[voter.votedCandidateId];
        return (true, c.id, c.name, c.party, voter.timestamp);
    }

    function startElection() public onlyOwner electionNotStarted {
        require(candidateCount > 0, "No candidates");
        electionState = ElectionState.Active;
        emit ElectionStarted(block.timestamp);
    }

    function endElection() public onlyOwner {
        require(electionState == ElectionState.Active, "Not active");
        electionState = ElectionState.Ended;
        emit ElectionEnded(block.timestamp);
    }

    function vote(uint candidateId) public onlyRegisteredVoter electionActive {
        Voter storage voter = voters[msg.sender];
        require(!voter.hasVoted, "Already voted");
        require(candidates[candidateId].id != 0, "Invalid candidate");

        voter.hasVoted = true;
        voter.votedCandidateId = candidateId;
        voter.timestamp = block.timestamp;

        candidates[candidateId].voteCount++;
        totalVotes++;

        emit VoteCasted(msg.sender, candidateId, block.timestamp);
    }

    function getResults() public view electionEndedOnly returns (uint[] memory, uint[] memory, uint) {
        uint[] memory votes = new uint[](candidateCount);
        for (uint i = 0; i < candidateCount; i++) {
            votes[i] = candidates[candidateIds[i]].voteCount;
        }
        return (candidateIds, votes, totalVotes);
    }

    function getWinner() public view electionEndedOnly returns (Candidate memory) {
        uint maxVotes = 0;
        uint winnerId = 0;

        for (uint i = 1; i <= candidateCount; i++) {
            if (candidates[i].voteCount > maxVotes) {
                maxVotes = candidates[i].voteCount;
                winnerId = i;
            }
        }
        return candidates[winnerId];
    }

    function getElectionStatus() public view returns (
        ElectionState status,
        uint totalCandidates,
        uint totalVotes_,
        uint totalVoters
    ) {
        return (electionState, candidateCount, totalVotes, voterList.length);
    }

    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
}