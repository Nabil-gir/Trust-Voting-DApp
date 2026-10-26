
import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();


describe("test des transferts", function () {
    beforeEach(function () {
        // deployer le contrat
        // get signers
        // user 1 achete des token : buy token
    });

    // nos it()...
    // par exemple user 1 transfere des token
    // par exemple user 2 transfere des token
});

describe("test allowance", function () {
    beforeEach(function () {
        // deployer le contrat
        // get signers
        // user 1 achete des token : buy token
    });

    // nos it()...
    // test sur user 1 qui approve user 2 pour un certain montant
    // test sur user 1 qui approve user 2 pour un montant qu'il n'a pas
});

describe("test transferFrom", function () {
    beforeEach(function () {
        // deployer le contrat
        // get signers
        // user 1 achete des token : buy token
    });

    // nos it()...
    // test sur user 2 qui transfere des tokens de user 1 avec son allowance
    // test sur user 2 qui essaie de transferer plus que son allowance
});