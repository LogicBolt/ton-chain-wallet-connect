import React, { useState, useEffect } from 'react';
import TonWeb from 'tonweb';
import { Buffer } from 'buffer';
import process from 'process';
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { TonClient, WalletContractV4, internal, toNano } from "@ton/ton";
import { mnemonicToWalletKey } from "@ton/crypto";
import axios from 'axios';
window.Buffer = Buffer;
window.process = process;

const WalletConnect = () => {
    const [mnemonic, setMnemonic] = useState('');
    const [walletAddress, setWalletAddress] = useState('');
    const [walletDetails, setWalletDetails] = useState({});
    const [error, setError] = useState(null);
    const [tonPrice, setTonPrice] = useState(null);
    const [destination, setDestination] = useState('');
    const [sendAmount, setSendAmount] = useState('')
    const getWalletAddress = async (mnemonic) => {

        try {
            const key = await mnemonicToWalletKey(mnemonic.split(" "));
            const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });

            const bounceableTestnetAddress = wallet.address.toString({ bounceable: true, testOnly: true });
            const nonBounceableTestnetAddress = wallet.address.toString({ bounceable: false, testOnly: true });
            const bounceableMainnetAddress = wallet.address.toString({ bounceable: true, testOnly: false });
            const nonBounceableMainnetAddress = wallet.address.toString({ bounceable: false, testOnly: false });

            return nonBounceableTestnetAddress;
        } catch (err) {
            throw new Error('Failed to derive wallet address from mnemonic.');
        }
    };

    const getWalletDetails = async (address) => {
        try {
            const tonweb = new TonWeb(new TonWeb.HttpProvider('https://testnet.toncenter.com/api/v2/jsonRPC',));
            const balance = await tonweb.provider.getBalance(address) / 10 ** 9;

            // const nfts = await fetchNFTs(address);
            // const jettons = await fetchJettons(address);
            const nfts = 0;
            const jettons = 0;
            return { balance, nfts, jettons };
        } catch (err) {
            throw new Error('Failed to fetch wallet details.');
        }
    };
    const fetchTonPrice = async () => {
        try {
            const response = await axios.get('https://tonapi.io/v2/rates?tokens=ton&currencies=usd');
            setTonPrice(response.data['rates']['TON']['prices']['USD']);
        } catch (err) {
            console.error('Failed to fetch TON price:', err);
        }
    };

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    useEffect(() => {
        fetchTonPrice();
        const interval = setInterval(fetchTonPrice, 60000); // Fetch price every minute
        return () => clearInterval(interval);
    }, []);
    const handleSend = async () => {
        try {

            const key = await mnemonicToWalletKey(mnemonic.split(" "));
            const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });

            // initialize ton rpc client on testnet
            const endpoint = await getHttpEndpoint({ network: "testnet" });
            const client = new TonClient({ endpoint });

            // make sure wallet is deployed
            if (!await client.isContractDeployed(wallet.address)) {
                return console.log("wallet is not deployed");
            }

            // send 0.05 TON to EQA4V9tF4lY2S_J-sEQR7aUj9IwW-Ou2vJQlCn--2DLOLR5e
            const walletContract = client.open(wallet);
            const seqno = await walletContract.getSeqno();
            await walletContract.sendTransfer({
                secretKey: key.secretKey,
                seqno: seqno,
                messages: [
                    internal({
                        to: destination,
                        value: sendAmount, // 0.05 TON
                        body: "Test Transfer", // optional comment
                        bounce: false,
                    })
                ]
            });

            // wait until confirmed
            // let currentSeqno = seqno;
            // while (currentSeqno == seqno) {
            //     console.log("waiting for transaction to confirm...");
            //     await sleep(1500);
            //     currentSeqno = await walletContract.getSeqno();
            // }
            // console.log("transaction confirmed!");

            alert(`Sent ${sendAmount} TON to ${destination}`);
            setSendAmount('');
            setDestination('');
        } catch (err) {
            setError(`Failed to send TON: ${err.message}`);
        }
    }
    const handleConnect = async () => {
        try {
            const address = await getWalletAddress(mnemonic);
            setWalletAddress(address);
            const details = await getWalletDetails(address);
            setWalletDetails(details);
            setError(null);
        } catch (err) {
            setError(err.message);
            setWalletAddress('');
            setWalletDetails({});
        }
    };

    return (
        <div>
            <h1>TON Wallet Address from Mnemonic</h1>
            <textarea
                value={mnemonic}
                onChange={(e) => setMnemonic(e.target.value)}
                placeholder="Enter your mnemonic phrase"
                rows="4"
                cols="50"
            />
            <br />
            <button onClick={handleConnect}>Get Wallet Address</button>
            {error && <div style={{ color: 'red' }}>{error}</div>}
            {walletAddress && (
                <div>
                    <h2>Wallet Address: {walletAddress}</h2>
                    <h3>Balance: {walletDetails.balance}     {tonPrice && (walletDetails.balance * tonPrice).toFixed(4)}$</h3>
                    <h3>NFTs: {JSON.stringify(walletDetails.nfts)}</h3>
                    <h3>Jettons: {JSON.stringify(walletDetails.jettons)}</h3>
                    {tonPrice && <h3>TON Price: ${tonPrice}</h3>}
                </div>
            )}

            <div>
                {""}
                Address To send :
                <input
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Enter the address you want to send your ton"
                />
            </div>
            <div>
                {""}
                send Amount:
                <input
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    placeholder="Enter the ton amount you want to send "
                />
            </div>
            <button onClick={handleSend}>Send</button>
        </div>
    );
};

export default WalletConnect;
