const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('VotingSystem', () => {
    let VotingSystem, voting;
    let owner, voter1, voter2, voter3, voter4, nonAuthorizedUser;

    beforeEach(async () => {
        [owner, voter1, voter2, voter3, voter4, nonAuthorizedUser] = await ethers.getSigners();
        VotingSystem = await ethers.getContractFactory("VotingSystem");
        voting = await VotingSystem.deploy();
        await voting.deploymentTransaction().wait();
    });

    describe("Deployment", () => {
        it("should set the deployer as the owner", async () => {
            expect(await voting.owner()).to.equal(owner.address);
        });

        it("should set initial election state to NotStarted", async () => {
            expect(await voting.electionState()).to.equal(0); // NotStarted
        });

        it("should initialize candidate count and total votes to 0", async () => {
            expect(await voting.candidateCount()).to.equal(0);
            expect(await voting.totalVotes()).to.equal(0);
        });
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
                expect(candidate.voteCount).to.equal(0);
                expect(candidate.id).to.equal(i + 1);
            }
        });

        it("should emit CandidateRegistered event when registering candidates", async () => {
            await expect(voting.connect(owner).registerCandidate("Test", "Test Party", "Test Description"))
                .to.emit(voting, 'CandidateRegistered')
                .withArgs(4, "Test", "Test Party", "Test Description");
        });

        it("should not allow non-owner to register candidates", async () => {
            await expect(voting.connect(voter1).registerCandidate("Test", "Test Party", "Test Description"))
                .to.be.revertedWith("Only owner");
        });

        it("should not allow registering candidates after election starts", async () => {
            await voting.connect(owner).startElection();
            await expect(voting.connect(owner).registerCandidate("Late", "Late Party", "Too late"))
                .to.be.revertedWith("Already started");
        });

        it("get All Candidates should return all registered candidates", async () => {
            const ids = await voting.getAllCandidateIds();
            expect(ids).to.deep.equal([1, 2, 3]);

            for (let i = 0; i < ids.length; i++) {
                const candidate = await voting.getCandidate(ids[i]);
                expect(candidate.name).to.equal(candidates[i].name);
            }
        });

        it("should revert when getting invalid candidate", async () => {
            await expect(voting.getCandidate(0)).to.be.revertedWith("Invalid candidate");
            await expect(voting.getCandidate(999)).to.be.revertedWith("Invalid candidate");
        });

        describe("Voter Authorization", () => {
            it("should allow owner to authorize voters", async () => {
                await expect(voting.connect(owner).authorizeVoter(voter1.address))
                    .to.emit(voting, 'VoterAuthorized')
                    .withArgs(voter1.address);

                const voterInfo = await voting.getVoterInfo(voter1.address);
                expect(voterInfo.isRegistered).to.be.true;
                expect(voterInfo.hasVoted).to.be.false;
            });

            it("should not allow non-owner to authorize voters", async () => {
                await expect(voting.connect(voter1).authorizeVoter(voter2.address))
                    .to.be.revertedWith("Only owner");
            });

            it("should not allow authorizing the same voter twice", async () => {
                await voting.connect(owner).authorizeVoter(voter1.address);
                await expect(voting.connect(owner).authorizeVoter(voter1.address))
                    .to.be.revertedWith("Already authorized");
            });

            it("should return correct voter information", async () => {
                const voterInfo = await voting.getVoterInfo(voter1.address);
                expect(voterInfo.isRegistered).to.be.false;
                expect(voterInfo.hasVoted).to.be.false;
                expect(voterInfo.votedCandidateId).to.equal(0);
            });
        });

        describe("Election Management", () => {
            it("should allow owner to start election when candidates exist", async () => {
                await expect(voting.connect(owner).startElection())
                    .to.emit(voting, 'ElectionStarted');

                expect(await voting.electionState()).to.equal(1); // Active
            });

            it("should not allow starting election without candidates", async () => {
                const emptyVoting = await VotingSystem.deploy();
                await expect(emptyVoting.connect(owner).startElection())
                    .to.be.revertedWith("No candidates");
            });

            it("should not allow non-owner to start election", async () => {
                await expect(voting.connect(voter1).startElection())
                    .to.be.revertedWith("Only owner");
            });

            it("should not allow starting election twice", async () => {
                await voting.connect(owner).startElection();
                await expect(voting.connect(owner).startElection())
                    .to.be.revertedWith("Already started");
            });

            it("should allow owner to end active election", async () => {
                await voting.connect(owner).startElection();
                await expect(voting.connect(owner).endElection())
                    .to.emit(voting, 'ElectionEnded');

                expect(await voting.electionState()).to.equal(2); // Ended
            });

            it("should not allow ending election that is not active", async () => {
                await expect(voting.connect(owner).endElection())
                    .to.be.revertedWith("Not active");
            });

            it("should return correct election status", async () => {
                await voting.connect(owner).authorizeVoter(voter1.address);
                await voting.connect(owner).authorizeVoter(voter2.address);

                const status = await voting.getElectionStatus();
                expect(status.status).to.equal(0); // NotStarted
                expect(status.totalCandidates).to.equal(3);
                expect(status.totalVotes_).to.equal(0);
                expect(status.totalVoters).to.equal(2);
            });
        });

        describe("Voting", () => {
            beforeEach(async () => {
                const voters = [voter1, voter2, voter3, voter4];

                for (let i = 0; i < voters.length; i++) {
                    await voting.connect(owner).authorizeVoter(voters[i].address);
                }
                const startElection = await voting.startElection();
                await startElection.wait();
            });

            it("should allow authorized voters to vote for candidates", async () => {
                const voters = [voter1, voter2, voter3];
                const candidateIds = [1, 2, 3];
                
                for (let i = 0; i < voters.length; i++) {
                    await expect(voting.connect(voters[i]).vote(candidateIds[i]))
                        .to.emit(voting, 'VoteCasted');
                        // Note: Not checking timestamp as it's dynamic
                }

                for (let i = 0; i < voters.length; i++) {
                    const myVote = await voting.connect(voters[i]).getMyVote();
                    expect(myVote.hasVoted).to.be.true;
                    expect(myVote.candidateId).to.equal(candidateIds[i]);
                    expect(myVote.name).to.equal(candidates[i].name);
                    expect(myVote.party).to.equal(candidates[i].party);
                    expect(myVote.timestamp).to.be.greaterThan(0);
                }

                expect(await voting.totalVotes()).to.equal(3);
            });

            it("should not allow unauthorized voters to vote", async () => {
                await expect(voting.connect(nonAuthorizedUser).vote(1))
                    .to.be.revertedWith("Voter not authorized");
            });

            it("should not allow voting twice", async () => {
                await voting.connect(voter1).vote(1);
                await expect(voting.connect(voter1).vote(2))
                    .to.be.revertedWith("Already voted");
            });

            it("should not allow voting for invalid candidate", async () => {
                await expect(voting.connect(voter1).vote(999))
                    .to.be.revertedWith("Invalid candidate");
            });

            it("should not allow voting when election is not active", async () => {
                await voting.connect(owner).endElection();
                await expect(voting.connect(voter1).vote(1))
                    .to.be.revertedWith("Election not active");
            });

            it("should return empty vote info for voters who haven't voted", async () => {
                const myVote = await voting.connect(voter1).getMyVote();
                expect(myVote.hasVoted).to.be.false;
                expect(myVote.candidateId).to.equal(0);
                expect(myVote.name).to.equal("");
                expect(myVote.party).to.equal("");
                expect(myVote.timestamp).to.equal(0);
            });

            it("should increment candidate vote count correctly", async () => {
                await voting.connect(voter1).vote(1);
                await voting.connect(voter2).vote(1);
                await voting.connect(voter3).vote(2);

                const candidate1 = await voting.getCandidate(1);
                const candidate2 = await voting.getCandidate(2);
                const candidate3 = await voting.getCandidate(3);

                expect(candidate1.voteCount).to.equal(2);
                expect(candidate2.voteCount).to.equal(1);
                expect(candidate3.voteCount).to.equal(0);
            });

            describe("Results and Winner", () => {
                beforeEach(async () => {
                    // voter1 and voter2 vote for candidate 1
                    await voting.connect(voter1).vote(1);
                    await voting.connect(voter2).vote(1);
                    // voter3 votes for candidate 2
                    await voting.connect(voter3).vote(2);
                    // voter4 votes for candidate 3
                    await voting.connect(voter4).vote(3);
                    
                    // End the election
                    await voting.connect(owner).endElection();
                });

                it("should return correct results after election ends", async () => {
                    const results = await voting.getResults();
                    const [candidateIds, votes, totalVotes] = results;

                    expect(candidateIds).to.deep.equal([1, 2, 3]);
                    expect(votes).to.deep.equal([2, 1, 1]);
                    expect(totalVotes).to.equal(4);
                });

                it("should not allow getting results before election ends", async () => {
                    const newVoting = await VotingSystem.deploy();
                    await expect(newVoting.getResults())
                        .to.be.revertedWith("Election not ended");
                });

                it("should return correct winner", async () => {
                    const winner = await voting.getWinner();
                    expect(winner.id).to.equal(1);
                    expect(winner.name).to.equal("Samadhan");
                    expect(winner.party).to.equal("Party A");
                    expect(winner.voteCount).to.equal(2);
                });

                it("should not allow getting winner before election ends", async () => {
                    const newVoting = await VotingSystem.deploy();
                    await expect(newVoting.getWinner())
                        .to.be.revertedWith("Election not ended");
                });

                it("should handle tie correctly by returning first candidate with max votes", async () => {
                    // Create new election with tie scenario
                    const tieVoting = await VotingSystem.deploy();
                    
                    // Register candidates
                    await tieVoting.connect(owner).registerCandidate("A", "Party A", "Desc A");
                    await tieVoting.connect(owner).registerCandidate("B", "Party B", "Desc B");
                    
                    // Authorize voters
                    await tieVoting.connect(owner).authorizeVoter(voter1.address);
                    await tieVoting.connect(owner).authorizeVoter(voter2.address);
                    
                    // Start election
                    await tieVoting.connect(owner).startElection();
                    
                    // Create tie: each candidate gets 1 vote
                    await tieVoting.connect(voter1).vote(1);
                    await tieVoting.connect(voter2).vote(2);
                    
                    // End election
                    await tieVoting.connect(owner).endElection();
                    
                    const winner = await tieVoting.getWinner();
                    expect(winner.id).to.equal(1); // First candidate with max votes
                    expect(winner.voteCount).to.equal(1);
                });
            });
        });

        describe("Ownership Transfer", () => {
            it("should allow owner to transfer ownership", async () => {
                await voting.connect(owner).transferOwnership(voter1.address);
                expect(await voting.owner()).to.equal(voter1.address);
            });

            it("should not allow non-owner to transfer ownership", async () => {
                await expect(voting.connect(voter1).transferOwnership(voter2.address))
                    .to.be.revertedWith("Only owner");
            });

            it("should not allow transferring to zero address", async () => {
                await expect(voting.connect(owner).transferOwnership(ethers.ZeroAddress))
                    .to.be.revertedWith("Invalid");
            });

            it("should allow new owner to perform owner functions", async () => {
                await voting.connect(owner).transferOwnership(voter1.address);
                
                // New owner should be able to register candidates
                await voting.connect(voter1).registerCandidate("New", "New Party", "New Description");
                
                const candidate = await voting.getCandidate(4);
                expect(candidate.name).to.equal("New");
            });
        });

        describe("Edge Cases and Security", () => {
            it("should handle election with no votes", async () => {
                await voting.connect(owner).startElection();
                await voting.connect(owner).endElection();
                
                const results = await voting.getResults();
                const [candidateIds, votes, totalVotes] = results;
                
                expect(votes).to.deep.equal([0, 0, 0]);
                expect(totalVotes).to.equal(0);
                
                const winner = await voting.getWinner();
                expect(winner.id).to.equal(0); // Returns 0 when no candidate has votes
                expect(winner.voteCount).to.equal(0);
            });

            it("should maintain correct state throughout election lifecycle", async () => {
                // Initial state
                let status = await voting.getElectionStatus();
                expect(status.status).to.equal(0); // NotStarted
                
                // After starting
                await voting.connect(owner).startElection();
                status = await voting.getElectionStatus();
                expect(status.status).to.equal(1); // Active
                
                // After ending
                await voting.connect(owner).endElection();
                status = await voting.getElectionStatus();
                expect(status.status).to.equal(2); // Ended
            });

            it("should not allow getMyVote for unauthorized voters", async () => {
                await voting.connect(owner).startElection();
                await expect(voting.connect(nonAuthorizedUser).getMyVote())
                    .to.be.revertedWith("Voter not authorized");
            });
        });
    });
});