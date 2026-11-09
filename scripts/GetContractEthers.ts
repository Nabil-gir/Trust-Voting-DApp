import {ethers} from 'ethers';
const rpcURL = "https://sepolia.infura.io/v3/801623775b074d30abfb3df0856f4bc1"

const client = new ethers.JsonRpcProvider(rpcURL);

const ABI = [{
				"inputs": [],
				"name": "retrieve",
				"outputs": [
					{
						"internalType": "uint256",
						"name": "",
						"type": "uint256"
					}
				],
				"stateMutability": "view",
				"type": "function"
			},
			{
				"inputs": [
					{
						"internalType": "uint256",
						"name": "num",
						"type": "uint256"
					}
				],
				"name": "store",
				"outputs": [],
				"stateMutability": "nonpayable",
				"type": "function"
			}
		];
        
const SSaddress = "0x1100b96187FB08460F7f1010c38557C4e61Fc426";
const simpleStorage = new ethers.Contract(SSaddress, ABI, client);

const value = await simpleStorage.retrieve()
console.log(value);