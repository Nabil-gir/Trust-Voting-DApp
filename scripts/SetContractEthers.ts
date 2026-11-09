import {ethers, HDNodeWallet, Wallet} from 'ethers';
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
		] as const;
        
const SSaddress = "0x1100b96187FB08460F7f1010c38557C4e61Fc426";
const simpleStorage = new ethers.Contract(SSaddress, ABI, client);

const signer = new ethers.Wallet("9851bbca5c614c6057f8474dc4a1cb2ec7da134cb0f176f8d569fd2b5611beec", client);

// const wallet = ethers.Mnemonic.fromPhrase("YOUR MNEMONIC PHRASE")
// const signer = HDNodeWallet.fromMnemonic(wallet, `m/44'/60'/0'/0/${0}`).connect(client);

const value1 = await simpleStorage.retrieve()
console.log(value1);
const tx = await simpleStorage.connect(signer).getFunction("store")(9);
await tx.wait();
const value = await simpleStorage.retrieve()
console.log(value);
