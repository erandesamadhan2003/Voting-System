const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('VotingSystem', () => {
    let VotingSystem, voting;
    let owner, voter1, voter2, voter3;

    beforeEach(async () => {
        [owner, voter1, voter2, voter3] = await ethers.getSigners();
        VotingSystem = await ethers.getContractFactory("VotingSystem");
        voting = await VotingSystem.deploy();
        await voting.deploymentTransaction().wait();
    });

    describe("Deployment", () => {
        it("should set the deployer as the owner", async () => {
            expect(await voting.owner()).to.equal(owner.address);
        })
    });

    describe("Add Candidates and getCandidate", () => {
        const candidates = [
            { name: "Samadhan", party: "Party A", description: "For the people" },
            { name: "Harsh", party: "Party B", description: "Youth Power" },
            { name: "Aman", party: "Party C", description: "For Justice" }
        ];

        beforeEach(async () => {
            for (let i = 0; i < candidates.length; i++) {
                await voting.connect(owner).registerCandidate(
                    candidates[i].name,
                    candidates[i].party,
                    candidates[i].description
                );
            }
        });

        it("should allow the owner to add multiple candidates and emit correct events", async () => {
            for (let i = 0; i < candidates.length; i++) {
                const candidate = await voting.getCandidate(i + 1);
                expect(candidate.name).to.equal(candidates[i].name);
                expect(candidate.party).to.equal(candidates[i].party);
                expect(candidate.description).to.equal(candidates[i].description);
            }
        });

        it("get All Candidates should return all registered candidates", async () => {
            const ids = await voting.getAllCandidateIds();
            expect(ids).to.deep.equal([1, 2, 3]);

            for (let i = 0; i < ids.length; i++) {
                const candidate = await voting.getCandidate(ids[i]);
            }
        });
    });

    describe("Voting", () => {
        beforeEach(async () => {
            const voters = [voter1, voter2, voter3];
            
            for (let i = 0; i < voters.length; i++) {
                console.log(`Authorizing voter: ${voters[i].address}`);
                await voting.connect(owner).authorizeVoter(voters[i].address);
            }
        })

        it("Get VoterInfo should return correct voter information", async () => {
            const voters = [voter1, voter2, voter3];
            
            for (let i = 0; i < voters.length; i++) {
                const voterInfo = await voting.getVoterInfo(voters[i].address);
                console.log("VoterInfo",voterInfo);
                expect(voterInfo.isRegistered).to.be.true;
                expect(voterInfo.hasVoted).to.be.false;
                expect(voterInfo.votedCandidateId).to.equal(0);
                expect(voterInfo.timestamp).to.equal(0);
            }
        });
    })
});