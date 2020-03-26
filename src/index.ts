import 'bootstrap/dist/css/bootstrap.min.css';

import {DummyERC20TokenContract} from '@0x/contracts-erc20';
import { SupportedProvider, Web3Wrapper, TxData } from '@0x/web3-wrapper';
import { getContractAddressesForChainOrThrow, ChainId } from '@0x/contract-addresses'
import { MetamaskSubprovider, Web3ProviderEngine, RPCSubprovider } from '@0x/subproviders'
import {BigNumber } from '@0x/utils';
import axios from 'axios';
import { KOVAN_0x_API, FAKE_DAI, FAKE_USDC, MetamaskWindow, INFURA_RPC_URL, DEFAULT_MINT_AMOUNT, INFINITE_ALLOWANCE } from './misc';

async function mintTokens(fromAddress: string, tokenAddress: string, provider: SupportedProvider, mintAmount: BigNumber = DEFAULT_MINT_AMOUNT): Promise<string> {
    const contractInstance = new DummyERC20TokenContract(tokenAddress, provider);
    const numDecimals = await contractInstance.decimals().callAsync();
    const mintAmountInBaseUnits = Web3Wrapper.toBaseUnitAmount(mintAmount, numDecimals.toNumber());

    const tx = await contractInstance.mint(mintAmountInBaseUnits).awaitTransactionSuccessAsync({
        from: fromAddress,
    });
    return tx.transactionHash;
}

async function getDecimalsForToken(tokenAddress: string, provider: SupportedProvider): Promise<number> {
    const contractInstance = new DummyERC20TokenContract(tokenAddress, provider);
    const decimals = await contractInstance.decimals().callAsync()
    return decimals.toNumber();
}

async function performSwap(buyToken: string, sellToken: string, amountInUnitAmount: number, fromAddress: string, client: Web3Wrapper): Promise<string> {
    // Fetch decimals
    const numDecimals = await getDecimalsForToken(sellToken, client.getProvider());
    const sellAmountInBaseUnits = Web3Wrapper.toBaseUnitAmount(amountInUnitAmount, numDecimals);

    // Make API request
    const response = await axios.get<TxData>(`${KOVAN_0x_API}/swap/v0/quote?buyToken=${buyToken}&sellToken=${sellToken}&sellAmount=${sellAmountInBaseUnits}&takerAddress=${fromAddress}`);

    const tx = await client.sendTransactionAsync({
        ...response.data,
    })
    const receipt = await client.awaitTransactionSuccessAsync(tx)
    return receipt.transactionHash;
}

async function setAllowances(fromAddress: string, tokenAddress: string, provider: SupportedProvider, mintAmount: BigNumber = DEFAULT_MINT_AMOUNT): Promise<string> {
    const contractInstance = new DummyERC20TokenContract(tokenAddress, provider);
    const addresses = getContractAddressesForChainOrThrow(ChainId.Kovan);
    const tx = await contractInstance.approve(
        addresses.erc20Proxy,
        INFINITE_ALLOWANCE,
    ).awaitTransactionSuccessAsync({
        from: fromAddress,
    });
    return tx.transactionHash;
}

/**
 * Links the `onclick` event of a button denoted by ID to a callback
 * @param buttonId the button ID as a string, must be unique
 * @param callback a JS function callback that is triggered with the button is pressed
 */
function linkBtnToCallback(buttonId: string, callback: (...args: any[]) => any): void {
    const button = document.getElementById(buttonId);
    if (button === null) {
        throw new Error(`Button ${buttonId} was not found`);
    }
    button.onclick = callback;
}

document.addEventListener("DOMContentLoaded", async () => {

    // SETUP: We check to ensure that Metamask is available. Based on the documentation
    // we have [here](https://docs.metamask.io/guide/getting-started.html), they recommend
    // to check if `window.ethereum` is available and, if it is, we can use `window.ethereum.enable()` to
    // enable MetaMask. `ethereum.approve()` will open a dialog on the UI that will ask for your permission.

    // NOTE: we have to cast `window` to `MetamaskWindow` in order to TypeScript to work correctly.
    const scopedWindow = window as unknown as MetamaskWindow;
    if (scopedWindow.ethereum === undefined) {
        throw new Error('Web3 not defined, please install and unlock Metamask');
    }
    const [account] = await scopedWindow.ethereum.enable();
    scopedWindow.ethereum.on('accountsChanged', () => location.reload());

    const providerEngine = new Web3ProviderEngine();
    providerEngine.addProvider(new MetamaskSubprovider(scopedWindow.web3.currentProvider));
    providerEngine.addProvider(new RPCSubprovider(INFURA_RPC_URL));
    providerEngine.start();

    // We initialize the Web3Wrapper, which is 0x's alternative to Web3.js library.
    const client = new Web3Wrapper(providerEngine);
    const chainId = await client.getChainIdAsync();
    if (chainId !== 42) {
        throw new Error(`Chain ID should be set to Kovan, it was set to ${chainId}`);
    }

    linkBtnToCallback("mintDAI", () => mintTokens(account, FAKE_DAI, client.getProvider(), DEFAULT_MINT_AMOUNT));
    linkBtnToCallback("mintUSDC", () => mintTokens(account, FAKE_USDC, client.getProvider(), DEFAULT_MINT_AMOUNT));
    linkBtnToCallback("swapDaiForUsdc", () => performSwap(FAKE_USDC, FAKE_DAI, 100, account, client));
    linkBtnToCallback("swapUsdcForDai", () => performSwap(FAKE_DAI, FAKE_USDC, 100, account, client));
    linkBtnToCallback("allowDAI", () => setAllowances(account, FAKE_DAI, client.getProvider()));
    linkBtnToCallback("allowUSDC", () => setAllowances(account, FAKE_USDC, client.getProvider()));
});