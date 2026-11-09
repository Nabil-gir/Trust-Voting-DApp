import { createPublicClient, http, formatEther } from 'viem';
import { sepolia } from 'viem/chains';

const rpcURL = "https://sepolia.infura.io/v3/801623775b074d30abfb3df0856f4bc1";

const client = createPublicClient({
    chain: sepolia,
    transport: http(),
});

const balance = await client.getBalance({
    address: "0xE692D40528A76d19146Cdb8940B59eB7e8A372B3"
});

console.log(formatEther(balance));